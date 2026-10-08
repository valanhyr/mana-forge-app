import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Omnibox } from './components/layout/Omnibox';
import { DashboardView } from './views/DashboardView';
import { TicketsView } from './views/TicketsView';
import { UsersView } from './views/UsersView';
import { EmailOutreachView } from './views/EmailOutreachView';
import { AuditView } from './views/AuditView';
import { useTickets } from './hooks/use-tickets';
import { Ticket } from './core/domain/ticket';
import { User360 } from './core/domain/user';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

const FrontdeskApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const { data: tickets = [] } = useTickets();

  const openTicketsCount = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
  ).length;

  const handleSelectTicketFromOmnibox = (_ticket: Ticket) => {
    setCurrentTab('tickets');
  };

  const handleSelectUserFromOmnibox = (_user: User360) => {
    setCurrentTab('users');
  };

  const handleResetFactoryData = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mana_forge_frontdesk_tickets');
      localStorage.removeItem('mana_forge_frontdesk_users');
      localStorage.removeItem('mana_forge_frontdesk_templates');
      localStorage.removeItem('mana_forge_frontdesk_audit');
      window.location.reload();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        openTicketsCount={openTicketsCount}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenOmnibox={() => setIsOmniboxOpen(true)}
          onResetFactoryData={handleResetFactoryData}
        />

        <main className="flex-1 p-6 overflow-hidden">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectTicket={() => setCurrentTab('tickets')}
            />
          )}
          {currentTab === 'tickets' && (
            <TicketsView onInspectUser={() => setCurrentTab('users')} />
          )}
          {currentTab === 'users' && <UsersView />}
          {currentTab === 'emails' && <EmailOutreachView />}
          {currentTab === 'audit' && <AuditView />}
        </main>
      </div>

      <Omnibox
        isOpen={isOmniboxOpen}
        onClose={() => setIsOmniboxOpen(false)}
        onSelectTicket={handleSelectTicketFromOmnibox}
        onSelectUser={handleSelectUserFromOmnibox}
      />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FrontdeskApp />
    </QueryClientProvider>
  );
}
