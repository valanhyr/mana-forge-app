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

export interface SendBroadcastPayload {
  audience: BroadcastAudience;
  subject: string;
  body: string;
  templateId?: string;
}

export function interpolateTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, key) => {
    return key in variables ? variables[key] : match;
  });
}
