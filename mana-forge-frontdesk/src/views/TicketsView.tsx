import React, { useState } from 'react';
import { useTickets, useAddTicketMessage, useUpdateTicketStatus } from '../hooks/use-tickets';
import { Ticket, TicketStatus } from '../core/domain/ticket';
import { TicketList } from '../components/tickets/TicketList';
import { TicketFilter } from '../components/tickets/TicketFilter';
import { TicketDetail } from '../components/tickets/TicketDetail';

interface TicketsViewProps {
  onInspectUser?: (userId: string) => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ onInspectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading } = useTickets();
  const addMessageMutation = useAddTicketMessage();
  const updateStatusMutation = useUpdateTicketStatus();

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = t.subject.toLowerCase().includes(q);
      const matchUser = t.userName.toLowerCase().includes(q) || t.userEmail.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      if (!matchSubject && !matchUser && !matchId) return false;
    }
    return true;
  });

  const activeTicket = selectedTicket
    ? tickets.find((t) => t.id === selectedTicket.id) || selectedTicket
    : filteredTickets[0] || null;

  const handleSendMessage = async (content: string, isInternalNote: boolean) => {
    if (!activeTicket) return;
    const updated = await addMessageMutation.mutateAsync({
      ticketId: activeTicket.id,
      message: {
        sender: 'OPERATOR',
        senderName: 'Jace Beleren (Staff)',
        content,
        isInternalNote,
      },
    });
    setSelectedTicket(updated);
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!activeTicket) return;
    const updated = await updateStatusMutation.mutateAsync({
      ticketId: activeTicket.id,
      status,
    });
    setSelectedTicket(updated);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      <TicketFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-5 xl:col-span-4 h-full overflow-y-auto pr-1">
          <TicketList
            tickets={filteredTickets}
            selectedTicketId={activeTicket?.id}
            onSelectTicket={setSelectedTicket}
            isLoading={isLoading}
          />
        </div>

        <div className="lg:col-span-7 xl:col-span-8 h-full min-h-0">
          {activeTicket ? (
            <TicketDetail
              ticket={activeTicket}
              onAddMessage={handleSendMessage}
              onUpdateStatus={handleUpdateStatus}
              onInspectUser={onInspectUser}
            />
          ) : (
            <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
              Select a ticket to view the conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
