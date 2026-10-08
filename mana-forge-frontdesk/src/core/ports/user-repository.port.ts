import { User360 } from '../domain/user';
import { PageRequest, PageResult } from '../domain/page';

export interface IUserRepository {
  search(query: string): Promise<User360[]>;
  searchPage(query: string, pagination: PageRequest): Promise<PageResult<User360>>;
  getById(id: string): Promise<User360 | null>;
  updateStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'): Promise<User360>;
  resetAiQuota(userId: string): Promise<User360>;
}
