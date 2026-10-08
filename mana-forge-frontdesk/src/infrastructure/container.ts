import { ITicketRepository } from '../core/ports/ticket-repository.port';
import { IUserRepository } from '../core/ports/user-repository.port';
import { IEmailService } from '../core/ports/email-service.port';
import { IAuditRepository } from '../core/ports/audit-repository.port';
import { MockTicketRepository } from './mocks/mock-ticket-repository';
import { MockUserRepository } from './mocks/mock-user-repository';
import { MockEmailService } from './mocks/mock-email-service';
import { MockAuditRepository } from './mocks/mock-audit-repository';

export class ServiceContainer {
  public ticketRepo: ITicketRepository = new MockTicketRepository();
  public userRepo: IUserRepository = new MockUserRepository();
  public emailService: IEmailService = new MockEmailService();
  public auditRepo: IAuditRepository = new MockAuditRepository();
}

export const container = new ServiceContainer();
