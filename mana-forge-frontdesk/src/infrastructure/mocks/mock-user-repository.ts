import { IUserRepository } from '../../core/ports/user-repository.port';
import { User360 } from '../../core/domain/user';
import { seedUsers } from './seeds/seed-users';

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
    const q = query.toLowerCase();
    const users = this.getUsers();
    return users.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
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
    this.save(users);
    return user;
  }
}
