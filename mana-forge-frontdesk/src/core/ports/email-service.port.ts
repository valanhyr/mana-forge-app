import { EmailTemplate, SendEmailPayload } from '../domain/email';

export interface IEmailService {
  listTemplates(): Promise<EmailTemplate[]>;
  sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId: string }>;
  renderTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; body: string }>;
}
