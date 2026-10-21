export interface EmailTemplate {
  id: string;
  title: string;
  category: string;
  subject: string;
  bodyTemplate: string;
  availableMacros: string[];
}

export interface SendEmailPayload {
  to: string;
  recipientName: string;
  subject: string;
  body: string;
  templateId?: string;
  ticketId?: string;
}

export type BroadcastAudience = 'ALL' | 'FREE' | 'PRO_PATREON';

export interface EmailDelivery {
  id: string;
  recipientName: string;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  createdAt: string;
  sentAt: string | null;
  messageId: string | null;
}

export interface SendBroadcastPayload {
  audience: BroadcastAudience;
  subject: string;
  body: string;
  templateId?: string;
}

export interface NewsletterSubscriber { id: string; username: string; email: string; tier: 'FREE' | 'PRO' | 'PATREON' }
export interface NewsletterPayload { campaignId: string; recipientIds: string[]; subject: string; body: string; templateId?: string }
export interface NewsletterCampaign { id: string; state: 'RUNNING' | 'COMPLETED' | 'FAILED'; total: number; sent: number; failed: number; skipped: number }

export function interpolateTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
  });
}
