import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { SendEmailPayload, SendBroadcastPayload, NewsletterPayload } from '../core/domain/email';

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
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendEmailPayload) => container.emailService.sendEmail(payload),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['emails', 'deliveries'] });
      client.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useEmailDeliveries(page: number) {
  return useQuery({ queryKey: ['emails', 'deliveries', page],
    queryFn: () => container.emailService.listDeliveries({ page, size: 25 }), refetchInterval: 30000 });
}

export function useNewsletterSubscribers(query: string, tier: string, page: number, enabled: boolean) {
  return useQuery({ queryKey: ['emails', 'subscribers', query, tier, page], enabled,
    queryFn: () => container.emailService.listSubscribers(query, tier, { page, size: 25 }) });
}

export function useStartNewsletter() {
  const client = useQueryClient();
  return useMutation({ retry: false,
    mutationFn: (payload: NewsletterPayload) => container.emailService.sendNewsletter(payload),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['emails', 'deliveries'] });
      client.invalidateQueries({ queryKey: ['emails', 'campaigns'] });
    } });
}

export function useNewsletterCampaigns(page: number, enabled: boolean) {
  return useQuery({ queryKey: ['emails', 'campaigns', page], enabled, refetchInterval: 10000,
    queryFn: () => container.emailService.listCampaigns({ page, size: 25 }) });
}

export function useNewsletterCampaign(id: string | null) {
  return useQuery({ queryKey: ['emails', 'campaign', id], enabled: Boolean(id), retry: false,
    queryFn: () => container.emailService.getCampaign(id!),
    refetchInterval: query => query.state.data?.state === 'COMPLETED' || query.state.data?.state === 'FAILED' ? false : 2000 });
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
