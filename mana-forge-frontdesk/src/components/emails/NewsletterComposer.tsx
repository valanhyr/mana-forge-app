import { useState } from 'react';
import { EmailTemplate } from '../../core/domain/email';
import { useTranslation } from '../../hooks/use-translation';

interface Props {
  templates: EmailTemplate[];
  recipientCount: number;
  locked: boolean;
  onSend: (draft: { subject: string; body: string; templateId?: string }) => Promise<void>;
}

export function NewsletterComposer({ templates, recipientCount, locked, onSend }: Props) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const invalid = locked || recipientCount === 0 || recipientCount > 100 || !subject.trim() || !body.trim()
    || /\{\{[a-zA-Z0-9_.-]+}}/.test(subject + body);
  return <form className="space-y-3" onSubmit={event => { event.preventDefault(); setConfirm(true); }}>
    <fieldset disabled={locked} className="space-y-3 disabled:opacity-60">
      <label className="block text-sm">{t('newsletterTemplate')}
        <select value={templateId} className="block bg-slate-950 border border-slate-700 rounded p-2 w-full" onChange={event => {
          const template = templates.find(item => item.id === event.target.value);
          setTemplateId(event.target.value); setSubject(template?.subject || ''); setBody(template?.bodyTemplate || ''); setConfirm(false);
        }}>
          <option value="">{t('newsletterPlainText')}</option>
          {templates.map(template => <option key={template.id} value={template.id}>{template.title}</option>)}
        </select>
      </label>
      <label className="block text-sm">{t('newsletterSubject')}<input value={subject} required maxLength={200}
        onChange={event => { setSubject(event.target.value); setConfirm(false); }} className="block w-full bg-slate-950 border border-slate-700 rounded p-2" /></label>
      <label className="block text-sm">{t('newsletterBody')}<textarea value={body} required maxLength={50000} rows={7}
        onChange={event => { setBody(event.target.value); setConfirm(false); }} className="block w-full bg-slate-950 border border-slate-700 rounded p-2" /></label>
      <p className="text-xs text-slate-400">{t('newsletterFooter')}</p>
      {!confirm ? <button disabled={invalid} className="bg-purple-600 rounded px-4 py-2 disabled:opacity-40">{t('newsletterReview')} ({recipientCount})</button>
        : <div role="group" aria-label={t('newsletterConfirm')} className="border border-purple-500 rounded p-3 space-y-2">
          <p>{t('newsletterConfirm')} ({recipientCount})</p>
          <button type="button" disabled={invalid} onClick={() => void onSend({ subject: subject.trim(), body: body.trim(), templateId: templateId || undefined }).catch(() => {})}
            className="bg-purple-600 rounded px-4 py-2 disabled:opacity-40">{t('newsletterSend')}</button>
        </div>}
    </fieldset>
  </form>;
}
