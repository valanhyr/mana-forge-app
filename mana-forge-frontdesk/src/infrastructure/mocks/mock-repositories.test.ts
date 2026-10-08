import { describe, it, expect, beforeEach } from 'vitest';
import { MockTicketRepository } from './mock-ticket-repository';
import { MockUserRepository } from './mock-user-repository';
import { MockEmailService } from './mock-email-service';
import { MockAuditRepository } from './mock-audit-repository';

describe('Mock Repositories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('MockTicketRepository', () => {
    it('should list initial seed tickets', async () => {
      const repo = new MockTicketRepository();
      const tickets = await repo.list();
      expect(tickets.length).toBeGreaterThan(0);
      expect(tickets[0]).toHaveProperty('id');
      expect(tickets[0]).toHaveProperty('subject');
    });

    it('should filter tickets by status and priority', async () => {
      const repo = new MockTicketRepository();
      const highTickets = await repo.list({ priority: 'HIGH' });
      expect(highTickets.every((t) => t.priority === 'HIGH')).toBe(true);

      const openTickets = await repo.list({ status: 'OPEN' });
      expect(openTickets.every((t) => t.status === 'OPEN')).toBe(true);
    });

    it('should search tickets by text query', async () => {
      const repo = new MockTicketRepository();
      const results = await repo.list({ query: 'Premodern' });
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some(
          (t) =>
            t.subject.includes('Premodern') ||
            t.metadata?.format?.includes('Premodern')
        )
      ).toBe(true);
    });

    it('should get ticket by id and return null if not found', async () => {
      const repo = new MockTicketRepository();
      const tickets = await repo.list();
      const first = tickets[0];

      const found = await repo.getById(first.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(first.id);

      const notFound = await repo.getById('non-existent-id');
      expect(notFound).toBeNull();
    });

    it('should create a new ticket with initial message', async () => {
      const repo = new MockTicketRepository();
      const newTicket = await repo.createTicket(
        {
          userId: 'user-teferi',
          userEmail: 'teferi@manaforge.gg',
          userName: 'Teferi Akosa',
          subject: 'Question about phasing in Commander',
          category: 'RULES_FORMAT',
          priority: 'MEDIUM',
          status: 'OPEN',
          metadata: {
            format: 'Commander',
          },
        },
        'How does Teferis Protection interact with tokens in the current ruleset?'
      );

      expect(newTicket.id).toBeDefined();
      expect(newTicket.messages.length).toBe(1);
      expect(newTicket.messages[0].content).toContain('tokens in the current ruleset');
      expect(newTicket.messages[0].sender).toBe('USER');

      const fetched = await repo.getById(newTicket.id);
      expect(fetched).not.toBeNull();
    });

    it('should add message to ticket and update status', async () => {
      const repo = new MockTicketRepository();
      const tickets = await repo.list();
      const ticketId = tickets[0].id;

      const updated = await repo.addMessage(ticketId, {
        sender: 'OPERATOR',
        senderName: 'Support Agent',
        content: 'We are investigating your Premodern legality question.',
        isInternalNote: false,
      });

      expect(
        updated.messages.some((m) =>
          m.content.includes('Premodern legality')
        )
      ).toBe(true);
    });

    it('should update ticket status', async () => {
      const repo = new MockTicketRepository();
      const tickets = await repo.list();
      const ticketId = tickets[0].id;

      const updated = await repo.updateStatus(ticketId, 'RESOLVED');
      expect(updated.status).toBe('RESOLVED');

      const fetched = await repo.getById(ticketId);
      expect(fetched?.status).toBe('RESOLVED');
    });

    it('should assign operator to ticket', async () => {
      const repo = new MockTicketRepository();
      const tickets = await repo.list();
      const ticketId = tickets[0].id;

      const updated = await repo.assignOperator(
        ticketId,
        'op-karn',
        'Karn Silver Golem'
      );
      expect(updated.assignedOperatorId).toBe('op-karn');
      expect(updated.assignedOperatorName).toBe('Karn Silver Golem');
    });

    it('should persist tickets across repository instances via localStorage', async () => {
      const repo1 = new MockTicketRepository();
      const created = await repo1.createTicket(
        {
          userId: 'user-persisted',
          userEmail: 'karn@manaforge.gg',
          userName: 'Karn',
          subject: 'Persisted ticket test',
          category: 'OTHER',
          priority: 'LOW',
          status: 'OPEN',
        },
        'Persist this ticket!'
      );

      const repo2 = new MockTicketRepository();
      const fetched = await repo2.getById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.subject).toBe('Persisted ticket test');
    });
  });

  describe('MockUserRepository', () => {
    it('should search users by username or email', async () => {
      const userRepo = new MockUserRepository();
      const results = await userRepo.search('mishra');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].username.toLowerCase()).toContain('mishra');

      const emailResults = await userRepo.search('urza@manaforge.gg');
      expect(emailResults.length).toBeGreaterThan(0);
      expect(emailResults[0].email).toBe('urza@manaforge.gg');
    });

    it('should get user by id and return null if not found', async () => {
      const userRepo = new MockUserRepository();
      const results = await userRepo.search('urza');
      const urza = results[0];

      const found = await userRepo.getById(urza.id);
      expect(found).not.toBeNull();
      expect(found?.username).toBe(urza.username);

      const notFound = await userRepo.getById('non-existent-user');
      expect(notFound).toBeNull();
    });

    it('should update user status', async () => {
      const userRepo = new MockUserRepository();
      const results = await userRepo.search('mishra');
      const mishra = results[0];

      const updated = await userRepo.updateStatus(mishra.id, 'SUSPENDED');
      expect(updated.status).toBe('SUSPENDED');

      const fetched = await userRepo.getById(mishra.id);
      expect(fetched?.status).toBe('SUSPENDED');
    });

    it('should reset AI quota for a user', async () => {
      const userRepo = new MockUserRepository();
      const users = await userRepo.search('urza');
      const user = users[0];
      const updated = await userRepo.resetAiQuota(user.id);
      expect(updated.stats.aiQueriesThisMonth).toBe(0);

      const repo2 = new MockUserRepository();
      const userReloaded = await repo2.getById(user.id);
      expect(userReloaded?.stats.aiQueriesThisMonth).toBe(0);
    });
  });

  describe('MockEmailService', () => {
    it('should list available email templates', async () => {
      const emailService = new MockEmailService();
      const templates = await emailService.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some((t) => t.title.includes('Quota Reset'))).toBe(true);
    });

    it('should render template with variables', async () => {
      const emailService = new MockEmailService();
      const templates = await emailService.listTemplates();
      const quotaTemplate = templates.find((t) =>
        t.title.includes('Quota Reset')
      )!;

      const rendered = await emailService.renderTemplate(quotaTemplate.id, {
        'user.name': 'Urza',
      });

      expect(rendered.body).toContain('Hello Urza');
    });

    it('should throw an error when rendering non-existent template', async () => {
      const emailService = new MockEmailService();
      await expect(
        emailService.renderTemplate('invalid-id', {})
      ).rejects.toThrow('Template with ID invalid-id not found');
    });

    it('should send email and return a generated messageId', async () => {
      const emailService = new MockEmailService();
      const result = await emailService.sendEmail({
        to: 'urza@manaforge.gg',
        recipientName: 'Urza',
        subject: 'Quota Reset Notification',
        body: 'Hello Urza, your quota has been reset.',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('MockAuditRepository', () => {
    it('should list initial audit logs', async () => {
      const auditRepo = new MockAuditRepository();
      const logs = await auditRepo.list();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('action');
      expect(logs[0]).toHaveProperty('actor');
    });

    it('should log a new audit event and persist it', async () => {
      const auditRepo = new MockAuditRepository();
      const newEntry = await auditRepo.logEvent({
        actor: {
          id: 'op-1',
          name: 'Jace Beleren',
          role: 'OPERATOR',
        },
        action: 'AI_QUOTA_RESET',
        targetUserId: 'user-urza',
        targetUserName: 'Urza of Dominaria',
        details: 'Operator reset monthly AI quota for testing',
      });

      expect(newEntry.id).toBeDefined();
      expect(newEntry.timestamp).toBeDefined();

      const auditRepo2 = new MockAuditRepository();
      const logs = await auditRepo2.list({ action: 'AI_QUOTA_RESET' });
      expect(logs.some((l) => l.id === newEntry.id)).toBe(true);
    });

    it('should filter audit logs by action, targetUserId, and limit', async () => {
      const auditRepo = new MockAuditRepository();
      const allLogs = await auditRepo.list();
      const targetUser = allLogs.find((l) => l.targetUserId)?.targetUserId;

      if (targetUser) {
        const userLogs = await auditRepo.list({ targetUserId: targetUser });
        expect(userLogs.every((l) => l.targetUserId === targetUser)).toBe(true);
      }

      const limited = await auditRepo.list({ limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });
  });
});
