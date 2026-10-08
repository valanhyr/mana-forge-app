import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { SupportService, type SupportTicket, type TicketCategory, type TicketPage } from '../../services/SupportService';

export default function Support() {
  const { t, locale } = useTranslation();
  const { ticketId } = useParams<{ ticketId?: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [list, setList] = useState<TicketPage | null>(null);
  const [detail, setDetail] = useState<SupportTicket | null>(null);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const ticket = detail?.id === ticketId ? detail : null;
  const load = useCallback(async () => {
    try { setList(await SupportService.list(page)); }
    catch { setError(t('support.loadError')); }
  }, [page, t]);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const [items, selected] = await Promise.all([SupportService.list(page), ticketId ? SupportService.get(ticketId) : null]);
        if (!cancelled) { setList(items); setDetail(selected); setError(''); }
      } catch { if (!cancelled) { setDetail(null); setList(null); setError(t('support.loadError')); } }
    };
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [page, ticketId, t]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending || !content.trim()) return;
    setSending(true); setError('');
    try {
      const result = ticketId ? await SupportService.reply(ticketId, content.trim())
        : await SupportService.create({ subject: subject.trim(), category, content: content.trim() });
      setDetail(result); setContent(''); setSubject('');
      if (!ticketId) navigate(`/messages/support/${result.id}`);
      await load();
    } catch (cause) {
      const status = (cause as { response?: { status?: number } }).response?.status;
      setError(t(status === 409 ? 'support.conflict' : 'support.sendError'));
    } finally { setSending(false); }
  };
  return <section className="max-w-5xl mx-auto p-4 md:p-8 text-zinc-200 space-y-4">
    <h1 className="text-2xl font-bold">{t('support.title')}</h1>
    <p className="text-sm text-zinc-400">{t('support.hint')}</p>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <aside className="border border-zinc-800 rounded-xl p-4 space-y-3">
        <Link to="/messages/support" onClick={() => setContent('')} className="text-orange-500">{t('support.new')}</Link>
        {!list && !error && <p>{t('common.loading')}</p>}
        {list && !list.items.length && <p className="text-sm text-zinc-500">{t('support.empty')}</p>}
        {list?.items.map(item => <Link key={item.id} to={`/messages/support/${item.id}`} onClick={() => setContent('')}
          className={`block rounded-lg p-2 ${ticketId === item.id ? 'bg-zinc-800' : 'hover:bg-zinc-900'}`}>
          <p className="break-words">{item.subject}</p>
          <p className="text-xs text-zinc-500">{t(`support.status.${item.status}`)} · {new Date(item.updatedAt).toLocaleDateString(locale)}</p>
        </Link>)}
        <div className="flex justify-between text-sm">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="disabled:opacity-30">{t('support.previous')}</button>
          <button disabled={!list || (page + 1) * 25 >= list.total} onClick={() => setPage(page + 1)}
            className="disabled:opacity-30">{t('support.next')}</button>
        </div>
      </aside>
      <div className="border border-zinc-800 rounded-xl p-4 space-y-4">
        {ticketId && !ticket ? <p>{error ? t('support.notFound') : t('common.loading')}</p> : <>
          {ticket && <>
            <h2 className="font-semibold break-words">{ticket.subject}</h2>
            <p className="text-sm text-zinc-400">{t(`support.status.${ticket.status}`)}</p>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {ticket.messages.map(message => <article key={message.id}
                className={`rounded-xl p-3 ${message.sender === 'USER' ? 'bg-orange-950/40' : 'bg-zinc-800'}`}>
                <p className="text-xs text-zinc-400 mb-1">{t(message.sender === 'USER' ? 'support.you' : 'support.team')} · {new Date(message.createdAt).toLocaleString(locale)}</p>
                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
              </article>)}
            </div>
          </>}
          {ticket?.status !== 'CLOSED' && <form onSubmit={submit} className="space-y-3">
            {!ticketId && <>
              <label className="block text-sm">{t('support.subject')}<input required maxLength={200} value={subject}
                onChange={event => setSubject(event.target.value)} className="block w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 mt-1" /></label>
              <label className="block text-sm">{t('support.category')}<select value={category}
                onChange={event => setCategory(event.target.value as TicketCategory)} className="block bg-zinc-900 rounded-lg p-2 mt-1">
                {(['DECK_BUILDER', 'AI_ANALYSIS', 'RULES_FORMAT', 'ACCOUNT', 'OTHER'] as const).map(value => <option key={value} value={value}>{t(`support.categories.${value}`)}</option>)}
              </select></label>
            </>}
            <label className="block text-sm">{t('support.message')}<textarea required maxLength={8000} rows={4} value={content}
              onChange={event => setContent(event.target.value)} className="block w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 mt-1" /></label>
            <button disabled={sending || !content.trim() || (!ticketId && !subject.trim())}
              className="bg-orange-500 text-white rounded-lg px-4 py-2 disabled:opacity-40">{t(sending ? 'common.saving' : ticketId ? 'support.reply' : 'support.create')}</button>
          </form>}
        </>}
      </div>
    </div>
  </section>;
}
