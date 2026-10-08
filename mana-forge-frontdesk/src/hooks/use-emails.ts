import { useQuery, useMutation } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { SendEmailPayload, SendBroadcastPayload } from '../core/domain/email';

export const EMAIL_QUERY_KEYS = {
  all: ['emails'] as const,
  templates: () => [...EMAIL_QUERY_KEYS.all, 'templates'] as const,
  templateRender: (templateId: string, variables: Record<string, string>) =>
    [...EMAIL_QUERY_KEYS.all, 'render', templateId, variables] as const,
};

export function useEmailTemplates() {
  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.templates(),
    queryFn: () => container.emailService.listTemplates(),
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (payload: SendEmailPayload) => container.emailService.sendEmail(payload),
  });
}

export function useSendBroadcast() {
  return useMutation({
    mutationFn: (payload: SendBroadcastPayload) => container.emailService.sendBroadcast(payload),
  });
}

export function useRenderTemplate(templateId: string, variables: Record<string, string>, enabled = true) {
  return useQuery({
    queryKey: EMAIL_QUERY_KEYS.templateRender(templateId, variables),
    queryFn: () => container.emailService.renderTemplate(templateId, variables),
    enabled: Boolean(templateId) && enabled,
  });
}
