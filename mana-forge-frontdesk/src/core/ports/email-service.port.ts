import { EmailTemplate, EmailDelivery, SendEmailPayload, SendBroadcastPayload } from '../domain/email';
import { PageRequest, PageResult } from '../domain/page';
import { NewsletterSubscriber, NewsletterPayload, NewsletterCampaign } from '../domain/email';

export interface IEmailService {
  listTemplates(): Promise<EmailTemplate[]>;
  listSubscribers(query: string, tier: string, pagination: PageRequest): Promise<PageResult<NewsletterSubscriber>>;
  sendNewsletter(payload: NewsletterPayload): Promise<NewsletterCampaign>;
  getCampaign(id: string): Promise<NewsletterCampaign>;
  listCampaigns(pagination: PageRequest): Promise<PageResult<NewsletterCampaign>>;
  listDeliveries(pagination: PageRequest): Promise<PageResult<EmailDelivery>>;
  sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string }>;
  sendBroadcast(payload: SendBroadcastPayload): Promise<{ success: boolean; recipientCount: number }>;
  renderTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; body: string }>;
}
