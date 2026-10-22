import { IUserRepository } from '../../core/ports/user-repository.port';
import { User360, UserListFilters, UserSort } from '../../core/domain/user';
import { seedUsers } from './seeds/seed-users';
import { PageRequest, pageOf } from '../../core/domain/page';

export class MockUserRepository implements IUserRepository {
  private readonly storageKey = 'mana_forge_frontdesk_users';

  private getUsers(): User360[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
      if (stored) return JSON.parse(stored);
      const initial = JSON.parse(JSON.stringify(seedUsers));
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(initial));
      return initial;
    } catch {
      return JSON.parse(JSON.stringify(seedUsers));
    }
  }

  private save(users: User360[]): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(users));
    } catch {
      // storage unavailable or mocked
    }
  }

  async search(query: string): Promise<User360[]> {
    const q = query.trim().toLowerCase();
    const users = this.getUsers();
    return users.filter(
      (u) => u.username.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || u.id.toLowerCase() === q
    );
  }

  async searchPage(filters: UserListFilters, pagination: PageRequest) {
    const users = (await this.search(filters.query))
      .filter((user) => (filters.tier ? user.tier === filters.tier : true))
      .filter((user) => (filters.status ? user.status === filters.status : true))
      .filter((user) => (filters.quota === 'exhausted' ? this.quotaExhausted(user) : true));
    users.sort(this.comparator(filters));
    return pageOf(users, pagination);
  }

  async getById(id: string): Promise<User360 | null> {
    const users = this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  async updateStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'): Promise<User360> {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error(`User with ID ${userId} not found`);
    user.status = status;
    this.save(users);
    return user;
  }

  async resetAiQuota(userId: string): Promise<User360> {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error(`User with ID ${userId} not found`);
    user.stats.aiQueriesThisMonth = 0;
    user.stats.aiQueriesToday = 0;
    this.save(users);
    return user;
  }

  /** Mirrors the card: DAILY accounts read today's counter, legacy seeds read the monthly one. */
  private usedAi(user: User360): number {
    const used = user.stats.aiQuotaPeriod === 'DAILY'
      ? user.stats.aiQueriesToday
      : user.stats.aiQueriesThisMonth;
    return used ?? 0;
  }

  private quotaExhausted(user: User360): boolean {
    const limit = user.stats.aiQuotaLimit;
    return limit != null && limit > 0 && this.usedAi(user) >= limit;
  }

  private comparator(filters: UserListFilters): (a: User360, b: User360) => number {
    const sort: UserSort = filters.sort ?? 'username';
    // The endpoint keeps `username asc` when no sort is requested, but defaults
    // an explicit sort to descending. Mirror both defaults.
    const dir = filters.dir ?? (filters.sort ? 'desc' : 'asc');
    const direction = dir === 'asc' ? 1 : -1;
    const byId = (a: User360, b: User360) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

    return (a, b) => {
      const primary = this.compareBy(sort, direction, a, b);
      if (primary !== 0) return primary;
      if (sort === 'openTickets' && dir === 'desc') {
        // Descending last login, nulls last, matches the API tie-break.
        const login = this.compareValues(a.lastLoginAt, b.lastLoginAt, -1);
        if (login !== 0) return login;
      }
      return byId(a, b);
    };
  }

  private compareBy(sort: UserSort, direction: number, a: User360, b: User360): number {
    switch (sort) {
      case 'openTickets':
        return direction * (a.openTicketsCount - b.openTicketsCount);
      case 'aiUsageToday':
        return direction * (this.usedAi(a) - this.usedAi(b));
      case 'totalDecks':
        return direction * (a.stats.totalDecks - b.stats.totalDecks);
      case 'createdAt':
        return this.compareValues(a.createdAt, b.createdAt, direction);
      case 'lastLoginAt':
        return this.compareValues(a.lastLoginAt, b.lastLoginAt, direction);
      default:
        return this.compareValues(a.username, b.username, direction);
    }
  }

  /**
   * Mongo sorts nulls first ascending and last descending; keep both modes
   * aligned with the API so demo mode is not a different product.
   */
  private compareValues(a: string | null, b: string | null, direction: number): number {
    if (a === null && b === null) return 0;
    if (a === null) return direction === 1 ? -1 : 1;
    if (b === null) return direction === 1 ? 1 : -1;
    return direction * (a < b ? -1 : a > b ? 1 : 0);
  }
}
