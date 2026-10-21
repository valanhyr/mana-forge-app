import { ITicketRepository } from '../core/ports/ticket-repository.port';
import { IUserRepository } from '../core/ports/user-repository.port';
import { IEmailService } from '../core/ports/email-service.port';
import { IAuditRepository } from '../core/ports/audit-repository.port';
import { MockTicketRepository } from './mocks/mock-ticket-repository';
import { MockUserRepository } from './mocks/mock-user-repository';
import { MockEmailService } from './mocks/mock-email-service';
import { MockAuditRepository } from './mocks/mock-audit-repository';
import { MockAuthService } from './mocks/mock-auth-service';
import { IAuthService } from '../core/ports/auth-service.port';
import { ApiClient } from './api/api-client';
import { HttpAuditRepository, HttpAuthService, HttpEmailService, HttpTicketRepository, HttpUserRepository } from './api/http-repositories';
import { config } from './config';

export class ServiceContainer {
  public readonly useMocks: boolean;
  public ticketRepo: ITicketRepository;
  public userRepo: IUserRepository;
  public emailService: IEmailService;
  public auditRepo: IAuditRepository;
  public authService: IAuthService;

  constructor({ useMocks = config.useMocks, client = new ApiClient(config.apiUrl) } = {}) {
    this.useMocks = useMocks;
    this.ticketRepo = useMocks ? new MockTicketRepository() : new HttpTicketRepository(client);
    this.userRepo = useMocks ? new MockUserRepository() : new HttpUserRepository(client);
    this.emailService = useMocks ? new MockEmailService() : new HttpEmailService(client);
    this.auditRepo = useMocks ? new MockAuditRepository() : new HttpAuditRepository(client);
    this.authService = useMocks ? new MockAuthService() : new HttpAuthService(client);
  }
}

export const container = new ServiceContainer();
