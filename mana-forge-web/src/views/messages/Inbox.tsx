import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import Messages from './Messages';
import Support from './Support';
import { useUser } from '../../services/UserContext';

export default function Inbox() {
  const { t } = useTranslation();
  const { user } = useUser();
  const support = useLocation().pathname.startsWith('/messages/support');
  return <>
    <nav aria-label={t('messages.title')} className="max-w-5xl mx-auto px-4 pt-4 flex gap-6 text-sm">
      <NavLink to="/messages" className={!support ? 'text-orange-500' : 'text-zinc-400'}>{t('support.friends')}</NavLink>
      <NavLink to="/messages/support" className={support ? 'text-orange-500' : 'text-zinc-400'}>{t('support.title')}</NavLink>
    </nav>
    {support ? <Support key={user?.userId} /> : <Messages key={user?.userId} />}
  </>;
}
