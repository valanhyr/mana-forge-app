import { EmailTemplate, EmailDelivery, SendEmailPayload, SendBroadcastPayload } from '../domain/email';
import { PageRequest, PageResult } from '../domain/page';
import { NewsletterSubscriber, NewsletterPayload, NewsletterCampaign, AnnouncementRecipient, AnnouncementPayload, AnnouncementCampaign } from '../domain/email';

export interface IEmailService {
  listTemplates(): Promise<EmailTemplate[]>;
  listAnnouncementRecipients(query: string, tier: string, pagination: PageRequest): Promise<PageResult<AnnouncementRecipient>>;
  sendAnnouncement(payload: AnnouncementPayload): Promise<AnnouncementCampaign>;
  getAnnouncement(id: string): Promise<AnnouncementCampaign>;
  listAnnouncements(pagination: PageRequest): Promise<PageResult<AnnouncementCampaign>>;
  listSubscribers(query: string, tier: string, pagination: PageRequest): Promise<PageResult<NewsletterSubscriber>>;
  sendNewsletter(payload: NewsletterPayload): Promise<NewsletterCampaign>;
  getCampaign(id: string): Promise<NewsletterCampaign>;
  listCampaigns(pagination: PageRequest): Promise<PageResult<NewsletterCampaign>>;
  listDeliveries(pagination: PageRequest): Promise<PageResult<EmailDelivery>>;
  sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string }>;
  sendBroadcast(payload: SendBroadcastPayload): Promise<{ success: boolean; recipientCount: number }>;
  renderTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; body: string }>;
}
