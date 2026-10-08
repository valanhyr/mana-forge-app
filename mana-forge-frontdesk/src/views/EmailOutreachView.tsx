import { useState } from 'react';
import { useEmailTemplates, useSendEmail, useSendBroadcast, useEmailDeliveries, useNewsletterSubscribers, useStartNewsletter, useNewsletterCampaign, useNewsletterCampaigns } from '../hooks/use-emails';
import { EmailComposer } from '../components/emails/EmailComposer';
import { ErrorNotice } from '../components/ui/ErrorNotice';
import { Pagination } from '../components/ui/Pagination';
import { container } from '../infrastructure/container';
import { useTranslation } from '../hooks/use-translation';
import { NewsletterComposer } from '../components/emails/NewsletterComposer';

export function EmailOutreachView() {
  const { t } = useTranslation();
  const templates = useEmailTemplates();
  const send = useSendEmail();
  const broadcast = useSendBroadcast();
  const [page, setPage] = useState(0);
  const history = useEmailDeliveries(page);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState<'direct' | 'newsletter'>('direct');
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('');
  const [subscriberPage, setSubscriberPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);
  const [campaignPage, setCampaignPage] = useState(0);
  const subscribers = useNewsletterSubscribers(query, tier, subscriberPage, tab === 'newsletter' && !container.useMocks);
  const newsletter = useStartNewsletter();
  const campaign = useNewsletterCampaign(campaignId);
  const campaigns = useNewsletterCampaigns(campaignPage, tab === 'newsletter' && !container.useMocks);
  const locked = Boolean(campaignId) || newsletter.isPending;
  const selectAll = async () => {
    setSelectingAll(true); setSelectionError(false);
    try {
      const result = await container.emailService.listSubscribers(query, tier, { page: 0, size: 100 });
      if (result.total > 100) { setSelectionError(true); return; }
      setSelected(result.items.map(item => item.id));
    } catch { setSelectionError(true); }
    finally { setSelectingAll(false); }
  };
  return <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col overflow-y-auto">
    {!container.useMocks && <nav className="flex gap-4 text-sm">
      <button className={tab === 'direct' ? 'text-indigo-400' : 'text-slate-400'} onClick={() => setTab('direct')}>{t('operationalEmails')}</button>
      <button className={tab === 'newsletter' ? 'text-purple-400' : 'text-slate-400'} onClick={() => setTab('newsletter')}>{t('newsletterTitle')}</button>
    </nav>}
    <ErrorNotice error={templates.error} onRetry={() => void templates.refetch()} />
    <ErrorNotice error={send.error || broadcast.error} />
    {success && <p role="status" className="text-emerald-400 text-sm">{t('smtpAccepted')}</p>}
    <p className="text-xs text-amber-300">{t('emailWarning')}</p>
    {tab === 'direct' && (templates.isLoading ? <p role="status">{t('loadingDetail')}</p> : !templates.error && <>
      {!templates.data?.length && <p>{t('noTemplates')}</p>}
      <EmailComposer templates={(templates.data || []).filter(template => container.useMocks || template.category !== 'BROADCAST')}
        isLoading={send.isPending || broadcast.isPending}
        onSend={async payload => { setSuccess(false); await send.mutateAsync(payload); setSuccess(true); setPage(0); }}
        onSendBroadcast={container.useMocks ? async payload => { await broadcast.mutateAsync(payload); } : undefined} />
    </>)}
    {tab === 'newsletter' && <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
      <h2 className="font-semibold">{t('newsletterTitle')}</h2>
      <p className="text-xs text-slate-400">{t('newsletterConsent')}</p>
      <ErrorNotice error={subscribers.error || newsletter.error || campaign.error} />
      {selectionError && <p role="alert">{t('newsletterSelectionError')}</p>}
      <fieldset disabled={locked || selectingAll} className="space-y-3">
        <label className="block text-sm">{t('newsletterSearch')}<input value={query} onChange={event => {
          setQuery(event.target.value); setSubscriberPage(0); setSelected([]);
        }} maxLength={200} className="block bg-slate-950 border border-slate-700 rounded p-2 w-full" /></label>
        <label className="block text-sm">{t('newsletterTier')}<select value={tier} onChange={event => {
          setTier(event.target.value); setSubscriberPage(0); setSelected([]);
        }} className="block bg-slate-950 rounded p-2">
          <option value="">{t('newsletterAllTiers')}</option>
          {['FREE', 'PRO', 'PATREON'].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <div className="flex gap-4 text-sm">
          <button type="button" disabled={!subscribers.data || subscribers.data.total > 100} onClick={() => void selectAll()}>{t('newsletterSelectAll')} ({subscribers.data?.total || 0})</button>
          <button type="button" onClick={() => setSelected([])}>{t('newsletterClear')}</button>
        </div>
        {subscribers.isFetching && <p role="status">{t('loadingDetail')}</p>}
        {subscribers.data?.items.map(subscriber => <label key={subscriber.id} className="flex gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(subscriber.id)} disabled={!selected.includes(subscriber.id) && selected.length >= 100}
            onChange={event => setSelected(ids => event.target.checked ? [...ids, subscriber.id] : ids.filter(id => id !== subscriber.id))} />
          {subscriber.username} · {subscriber.email} · {subscriber.tier}
        </label>)}
        {subscribers.data && !subscribers.data.items.length && <p>{t('newsletterEmpty')}</p>}
        <Pagination page={subscriberPage} size={25} total={subscribers.data?.total || 0} onChange={setSubscriberPage} isLoading={subscribers.isFetching} />
      </fieldset>
      <NewsletterComposer key={draftVersion} templates={(templates.data || []).filter(template => template.category === 'BROADCAST')}
        recipientCount={selected.length} locked={locked || selectingAll} onSend={async draft => {
          const id = crypto.randomUUID();
          setCampaignId(id);
          try { await newsletter.mutateAsync({ ...draft, campaignId: id, recipientIds: selected }); }
          catch (error) {
            // A known rejection cannot have started a campaign; unknown outcomes stay locked for reconciliation.
            const status = (error as { status?: number }).status;
            if (status && status >= 400 && status < 500) setCampaignId(null);
            throw error;
          }
        }} />
      {campaignId && <div role="status" className="text-sm space-y-1">
        <p>{t('newsletterCampaign')} <code>{campaignId}</code></p>
        {campaign.data && <p>{campaign.data.state} · {t('newsletterSent')}: {campaign.data.sent} · {t('newsletterFailed')}: {campaign.data.failed} · {t('newsletterSkipped')}: {campaign.data.skipped}</p>}
        <p className="text-xs text-amber-300">{t('newsletterNoRetry')}</p>
        {campaign.data?.state === 'COMPLETED' && <button onClick={() => {
          setCampaignId(null); setSelected([]); setDraftVersion(version => version + 1); newsletter.reset();
        }} className="text-purple-400">{t('newsletterNewDraft')}</button>}
      </div>}
      <section className="border-t border-slate-800 pt-3 space-y-2">
        <h3 className="text-sm font-semibold">{t('newsletterHistory')}</h3>
        <ErrorNotice error={campaigns.error} />
        {campaigns.data?.items.map(item => <button key={item.id} type="button" onClick={() => setCampaignId(item.id)}
          className="block text-left text-xs text-slate-400 hover:text-purple-400">
          {item.id} · {item.state} · {t('newsletterSent')}: {item.sent}/{item.total} · {t('newsletterFailed')}: {item.failed} · {t('newsletterSkipped')}: {item.skipped}
        </button>)}
        <Pagination page={campaignPage} size={25} total={campaigns.data?.total || 0} onChange={setCampaignPage} isLoading={campaigns.isFetching} />
      </section>
    </section>}
    <section className="bg-slate-900 rounded-lg border border-slate-800 p-3">
      <h2 className="text-sm font-semibold">{t('emailHistory')}</h2>
      <ErrorNotice error={history.error} onRetry={() => void history.refetch()} />
      {!history.isLoading && !history.error && !history.data?.items.length && <p className="text-xs text-slate-400">{t('noDeliveries')}</p>}
      {history.data?.items.map(delivery => <div key={delivery.id} className="text-xs py-2 border-b border-slate-800">
        {delivery.recipientName} · {delivery.subject} · {delivery.status} · {new Date(delivery.createdAt).toLocaleString()}
      </div>)}
      <Pagination page={page} size={25} total={history.data?.total || 0} onChange={setPage} isLoading={history.isFetching} />
    </section>
  </div>;
}
