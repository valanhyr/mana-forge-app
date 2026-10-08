import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useTickets, useTicket, useAddTicketMessage, useUpdateTicketStatus } from './use-tickets';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTickets hooks', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should fetch tickets successfully', async () => {
    const { result } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBeGreaterThan(0);
  });

  it('should fetch single ticket by ID', async () => {
    const { result: listResult } = renderHook(() => useTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    const firstTicket = listResult.current.data![0];

    const { result: detailResult } = renderHook(() => useTicket(firstTicket.id), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(detailResult.current.isSuccess).toBe(true));
    expect(detailResult.current.data?.id).toBe(firstTicket.id);
  });

  it('should add message to ticket and update status via mutations', async () => {
    const wrapper = createWrapper();
    const { result: listResult } = renderHook(() => useTickets(), { wrapper });

    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));
    const ticketId = listResult.current.data![0].id;

    const { result: addMsgResult } = renderHook(() => useAddTicketMessage(), { wrapper });

    await act(async () => {
      await addMsgResult.current.mutateAsync({
        ticketId,
        message: {
          sender: 'OPERATOR',
          senderName: 'Support Agent',
          content: 'Test reply from hook',
        },
      });
    });

    const { result: statusResult } = renderHook(() => useUpdateTicketStatus(), { wrapper });

    await act(async () => {
      await statusResult.current.mutateAsync({
        ticketId,
        status: 'IN_PROGRESS',
      });
    });

    const { result: finalTicket } = renderHook(() => useTicket(ticketId), { wrapper });
    await waitFor(() => expect(finalTicket.current.isSuccess).toBe(true));
    expect(finalTicket.current.data?.status).toBe('IN_PROGRESS');
    expect(finalTicket.current.data?.messages.some((m) => m.content === 'Test reply from hook')).toBe(true);
  });
});
