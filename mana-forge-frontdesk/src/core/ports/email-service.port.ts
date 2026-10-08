import { EmailTemplate, SendEmailPayload, SendBroadcastPayload } from '../domain/email';

export interface IEmailService {
  listTemplates(): Promise<EmailTemplate[]>;
  sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string }>;
  sendBroadcast(payload: SendBroadcastPayload): Promise<{ success: boolean; recipientCount: number }>;
  renderTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; body: string }>;
}
