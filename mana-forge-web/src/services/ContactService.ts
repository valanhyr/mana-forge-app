import { api } from './api';

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Anti-spam payload sent alongside the visible fields. */
export interface ContactAntiSpamData {
  /** Cloudflare Turnstile proof, verified server-side. */
  turnstileToken?: string;
  /** Honeypot: hidden from humans, must stay empty. */
  website?: string;
  /** Epoch millis when the form was rendered, for the too-fast submission check. */
  formRenderedAt?: number;
}

export const ContactService = {
  send: async (data: ContactFormData, antiSpam: ContactAntiSpamData = {}): Promise<void> => {
    await api.post('/contact', { ...data, ...antiSpam });
  },
};