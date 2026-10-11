import { useEffect, useRef, useState } from 'react';
import { Ticket } from '../core/domain/ticket';
import { EmailComposer } from '../components/emails/EmailComposer';
import { ErrorNotice } from '../components/ui/ErrorNotice';
import { useEmailTemplates, useSendEmail } from '../hooks/use-emails';
import { useTranslation } from '../hooks/use-translation';

/** Local ticket context only. No history or notes are transferred into the email body. */
export function TicketEmailPanel({ ticket, onClose, onDraftChange }: {
  ticket: Ticket; onClose: () => void; onDraftChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const templates = useEmailTemplates();
  const send = useSendEmail();
  const [accepted, setAccepted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal?.(); }, []);
  return <dialog ref={dialog} open={typeof HTMLDialogElement.prototype.showModal !== 'function'}
    aria-labelledby="ticket-email-title" onCancel={event => { event.preventDefault(); if (!send.isPending) onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100 backdrop:bg-black/70">
    <div className="flex flex-wrap justify-between gap-2">
      <h2 id="ticket-email-title" className="font-semibold">{t('ticketEmailTitle')} · {ticket.id}</h2>
      <button type="button" disabled={send.isPending} onClick={onClose} className="rounded border border-slate-600 px-3 py-2">{t('closeComposer')}</button>
    </div>
    <p className="my-3 text-xs">{t('ticketEmailHint')}</p>
    <p className="text-xs text-amber-300">{t('emailWarning')}</p>
    <ErrorNotice error={templates.error} onRetry={() => void templates.refetch()} />
    <ErrorNotice error={send.error} />
    {accepted && <p role="status" className="my-2 text-emerald-300">{t('smtpAccepted')}</p>}
    {templates.isLoading ? <p role="status">{t('loadingDetail')}</p> : !templates.error && <fieldset disabled={send.isPending}><EmailComposer
      templates={(templates.data || []).filter(template => template.category !== 'BROADCAST')}
      initialRecipient={{ email: ticket.userEmail, name: ticket.userName }} ticketId={ticket.id}
      onDraftChange={onDraftChange} isLoading={send.isPending}
      onSend={async payload => { setAccepted(false); await send.mutateAsync(payload); setAccepted(true); }} /></fieldset>}
  </dialog>;
}
