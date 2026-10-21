import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { TicketsView } from './views/TicketsView';
import { UsersView } from './views/UsersView';
import { EmailOutreachView } from './views/EmailOutreachView';
import { AuditView } from './views/AuditView';
import { useTicketSummary } from './hooks/use-tickets';
import { Ticket } from './core/domain/ticket';
import { User360 } from './core/domain/user';
import { SessionGate } from './views/SessionGate';
import { container } from './infrastructure/container';
import { useOperator } from './hooks/use-operator';
import { ErrorNotice } from './components/ui/ErrorNotice';
import { OmniboxView } from './views/OmniboxView';

export const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: false,
    },
    mutations: { retry: false },
  },
});

const FrontdeskApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isOmniboxOpen, setIsOmniboxOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string>();
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [ticketSelection, setTicketSelection] = useState(0);
  const [userSelection, setUserSelection] = useState(0);
  const [logoutError, setLogoutError] = useState<unknown>(null);
  const operator = useOperator();
  const summary = useTicketSummary();
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault(); setIsOmniboxOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSelectTicketFromOmnibox = (ticket: Ticket) => {
    setSelectedTicketId(ticket.id);
    setTicketSelection(value => value + 1);
    setCurrentTab('tickets');
  };

  const handleSelectUserFromOmnibox = (user: User360) => {
    setSelectedUserId(user.id);
    setUserSelection(value => value + 1);
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
        openTicketsCount={summary.data?.open || 0}
        isMockMode={container.useMocks}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenOmnibox={() => setIsOmniboxOpen(true)}
          operatorName={operator?.name}
          isMockMode={container.useMocks}
          onResetFactoryData={container.useMocks ? handleResetFactoryData : undefined}
          onLogout={container.useMocks ? undefined : async () => {
            try { await container.authService.signOut(); }
            catch (error) { setLogoutError(error); }
          }}
        />

        <main className="flex-1 p-6 overflow-hidden">
          <ErrorNotice error={logoutError || summary.error} />
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectTicket={handleSelectTicketFromOmnibox}
            />
          )}
          {currentTab === 'tickets' && (
            <TicketsView key={ticketSelection} initialTicketId={selectedTicketId} onInspectUser={id => {
              setSelectedUserId(id); setUserSelection(value => value + 1); setCurrentTab('users');
            }} />
          )}
          {currentTab === 'users' && <UsersView key={userSelection} initialUserId={selectedUserId} />}
          {currentTab === 'emails' && <EmailOutreachView />}
          {currentTab === 'audit' && <AuditView />}
        </main>
      </div>

      <OmniboxView
        isOpen={isOmniboxOpen}
        onClose={() => setIsOmniboxOpen(false)}
        onSelectTicket={handleSelectTicketFromOmnibox}
        onSelectUser={handleSelectUserFromOmnibox}
      />
    </div>
  );
};

export default function App() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionGate><FrontdeskApp /></SessionGate>
    </QueryClientProvider>
  );
}
