import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { Ticket, TicketMessage, TicketPriority, TicketStatus } from '../core/domain/ticket';

export const TICKET_QUERY_KEYS = {
  all: ['tickets'] as const,
  lists: () => [...TICKET_QUERY_KEYS.all, 'list'] as const,
  list: (filters?: { status?: TicketStatus; priority?: TicketPriority; query?: string }) =>
    [...TICKET_QUERY_KEYS.lists(), filters] as const,
  details: () => [...TICKET_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TICKET_QUERY_KEYS.details(), id] as const,
};

export function useTickets(filters?: { status?: TicketStatus; priority?: TicketPriority; query?: string }) {
  return useQuery({
    queryKey: TICKET_QUERY_KEYS.list(filters),
    queryFn: () => container.ticketRepo.list(filters),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: TICKET_QUERY_KEYS.detail(id),
    queryFn: () => container.ticketRepo.getById(id),
    enabled: Boolean(id),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticket,
      initialMessage,
    }: {
      ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>;
      initialMessage: string;
    }) => container.ticketRepo.createTicket(ticket, initialMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.all });
    },
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      message,
    }: {
      ticketId: string;
      message: Omit<TicketMessage, 'id' | 'createdAt'>;
    }) => container.ticketRepo.addMessage(ticketId, message),
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(updatedTicket.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: TicketStatus }) =>
      container.ticketRepo.updateStatus(ticketId, status),
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(updatedTicket.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
    },
  });
}

export function useAssignOperator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ticketId,
      operatorId,
      operatorName,
    }: {
      ticketId: string;
      operatorId: string;
      operatorName: string;
    }) => container.ticketRepo.assignOperator(ticketId, operatorId, operatorName),
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(updatedTicket.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
    },
  });
}
