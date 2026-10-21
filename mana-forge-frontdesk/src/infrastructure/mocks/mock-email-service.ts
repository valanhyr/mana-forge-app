import { IEmailService } from '../../core/ports/email-service.port';
import { EmailDelivery, EmailTemplate, SendEmailPayload, SendBroadcastPayload, interpolateTemplate } from '../../core/domain/email';
import { PageRequest, pageOf } from '../../core/domain/page';
import { NewsletterSubscriber, NewsletterPayload, NewsletterCampaign } from '../../core/domain/email';
import { seedTemplates } from './seeds/seed-templates';

export class MockEmailService implements IEmailService {
  private readonly storageKey = 'mana_forge_frontdesk_templates';
  private deliveries: EmailDelivery[] = [];

  async listDeliveries(pagination: PageRequest) { return pageOf(this.deliveries, pagination); }
  async listSubscribers(_query: string, _tier: string, pagination: PageRequest) { return pageOf<NewsletterSubscriber>([], pagination); }
  async sendNewsletter(_payload: NewsletterPayload): Promise<NewsletterCampaign> { throw new Error('Live newsletters are unavailable in demo mode'); }
  async getCampaign(_id: string): Promise<NewsletterCampaign> { throw new Error('Live newsletters are unavailable in demo mode'); }
  async listCampaigns(pagination: PageRequest) { return pageOf<NewsletterCampaign>([], pagination); }

  private getTemplates(): EmailTemplate[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
      if (stored) return JSON.parse(stored);
      const initial = JSON.parse(JSON.stringify(seedTemplates));
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(initial));
      return initial;
    } catch {
      return JSON.parse(JSON.stringify(seedTemplates));
    }
  }

  async listTemplates(): Promise<EmailTemplate[]> {
    return this.getTemplates();
  }

  async renderTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; body: string }> {
    const templates = this.getTemplates();
    const template = templates.find((t) => t.id === templateId);
    if (!template) throw new Error(`Template with ID ${templateId} not found`);

    return {
      subject: interpolateTemplate(template.subject, variables),
      body: interpolateTemplate(template.bodyTemplate, variables),
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string }> {
    // Basic validation
    if (!payload.to || !payload.subject) {
      throw new Error('Recipient and subject are required');
    }
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    this.deliveries.unshift({ id: messageId, messageId, recipientName: payload.recipientName,
      subject: payload.subject, status: 'SENT', createdAt: new Date().toISOString(), sentAt: new Date().toISOString() });
    return { success: true, messageId };
  }

  async sendBroadcast(payload: SendBroadcastPayload): Promise<{ success: boolean; recipientCount: number }> {
    if (!payload.subject || !payload.body) {
      throw new Error('Subject and body are required for broadcast');
    }
    let recipientCount = 30;
    if (payload.audience === 'FREE') recipientCount = 18;
    if (payload.audience === 'PRO_PATREON') recipientCount = 12;

    return { success: true, recipientCount };
  }
}
