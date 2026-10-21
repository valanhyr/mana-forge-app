import { ComponentProps, useEffect, useState } from 'react';
import { Omnibox } from '../components/layout/Omnibox';
import { useTicketsPage } from '../hooks/use-tickets';
import { useUsersPage } from '../hooks/use-users';

export function OmniboxView(props: Pick<ComponentProps<typeof Omnibox>, 'isOpen' | 'onClose' | 'onSelectTicket' | 'onSelectUser'>) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (!props.isOpen) { setQuery(''); setSearch(''); return; }
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query, props.isOpen]);
  const enabled = props.isOpen && Boolean(search);
  const tickets = useTicketsPage({ query: search }, 0, 10, enabled);
  const users = useUsersPage(search, 0, 10, enabled);
  return <Omnibox {...props} query={query} onQueryChange={setQuery}
    tickets={enabled ? tickets.data?.items : []} users={enabled ? users.data?.items : []}
    isLoading={enabled && (tickets.isFetching || users.isFetching)} error={tickets.error || users.error} />;
}
