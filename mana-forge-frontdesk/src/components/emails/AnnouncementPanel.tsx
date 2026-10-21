import { useState } from 'react';
import { EmailTemplate } from '../../core/domain/email';
import { useAnnouncement, useAnnouncementRecipients, useAnnouncements, useStartAnnouncement } from '../../hooks/use-emails';
import { useTranslation } from '../../hooks/use-translation';
import { container } from '../../infrastructure/container';
import { ErrorNotice } from '../ui/ErrorNotice';
import { Pagination } from '../ui/Pagination';
import { AnnouncementComposer } from './AnnouncementComposer';

export function AnnouncementPanel({ templates }: { templates: EmailTemplate[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState('');
  const [recipientPage, setRecipientPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const recipients = useAnnouncementRecipients(query, tier, recipientPage, !container.useMocks);
  const start = useStartAnnouncement();
  const campaign = useAnnouncement(campaignId);
  const history = useAnnouncements(historyPage, !container.useMocks);
  const locked = Boolean(campaignId) || start.isPending;
  const selectAll = async () => {
    setSelectingAll(true); setSelectionError(false);
    try {
      const result = await container.emailService.listAnnouncementRecipients(query, tier, { page: 0, size: 100 });
      if (result.total > 100) { setSelectionError(true); return; }
      setSelected(result.items.map(item => item.id));
    } catch { setSelectionError(true); }
    finally { setSelectingAll(false); }
  };
  return <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
    <h2 className="font-semibold">{t('announcementTitle')}</h2>
    <p className="text-xs text-amber-300">{t('announcementNotice')}</p>
    <ErrorNotice error={recipients.error || start.error || campaign.error} />
    {selectionError && <p role="alert">{t('announcementSelectionError')}</p>}
    <fieldset disabled={locked || selectingAll} className="space-y-3">
      <label className="block text-sm">{t('newsletterSearch')}<input value={query} onChange={event => {
        setQuery(event.target.value); setRecipientPage(0); setSelected([]);
      }} maxLength={200} className="block bg-slate-950 border border-slate-700 rounded p-2 w-full" /></label>
      <label className="block text-sm">{t('newsletterTier')}<select value={tier} onChange={event => {
        setTier(event.target.value); setRecipientPage(0); setSelected([]);
      }} className="block bg-slate-950 rounded p-2">
        <option value="">{t('newsletterAllTiers')}</option>
        {['FREE', 'PRO', 'PATREON'].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <div className="flex gap-4 text-sm">
        <button type="button" disabled={!recipients.data || recipients.data.total > 100} onClick={() => void selectAll()}>{t('announcementSelectAll')} ({recipients.data?.total || 0})</button>
        <button type="button" onClick={() => setSelected([])}>{t('newsletterClear')}</button>
      </div>
      {recipients.isFetching && <p role="status">{t('loadingDetail')}</p>}
      {recipients.data?.items.map(recipient => <label key={recipient.id} className="flex gap-2 text-sm">
        <input type="checkbox" checked={selected.includes(recipient.id)} disabled={!selected.includes(recipient.id) && selected.length >= 100}
          onChange={event => setSelected(ids => event.target.checked ? [...ids, recipient.id] : ids.filter(id => id !== recipient.id))} />
        {recipient.username} · {recipient.email} · {recipient.tier}
      </label>)}
      {recipients.data && !recipients.data.items.length && <p>{t('announcementEmpty')}</p>}
      <Pagination page={recipientPage} size={25} total={recipients.data?.total || 0} onChange={setRecipientPage} isLoading={recipients.isFetching} />
    </fieldset>
    <AnnouncementComposer key={draftVersion} templates={templates} recipientCount={selected.length} locked={locked || selectingAll}
      onSend={async draft => {
        const id = crypto.randomUUID();
        setCampaignId(id);
        try { await start.mutateAsync({ ...draft, campaignId: id, recipientIds: selected }); }
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
        setCampaignId(null); setSelected([]); setDraftVersion(version => version + 1); start.reset();
      }} className="text-amber-400">{t('newsletterNewDraft')}</button>}
    </div>}
    <section className="border-t border-slate-800 pt-3 space-y-2">
      <h3 className="text-sm font-semibold">{t('announcementHistory')}</h3>
      <ErrorNotice error={history.error} />
      {history.data?.items.map(item => <button key={item.id} type="button" onClick={() => setCampaignId(item.id)}
        className="block text-left text-xs text-slate-400 hover:text-amber-400">
        {item.id} · {item.state} · {t('newsletterSent')}: {item.sent}/{item.total} · {t('newsletterFailed')}: {item.failed} · {t('newsletterSkipped')}: {item.skipped}
      </button>)}
      <Pagination page={historyPage} size={25} total={history.data?.total || 0} onChange={setHistoryPage} isLoading={history.isFetching} />
    </section>
  </section>;
}
