import React, { useRef, useState } from 'react';
import { Send, Lock } from 'lucide-react';
import { useTranslation } from '../../hooks/use-translation';

interface ReplyBoxProps {
  onSendMessage: (content: string, isInternalNote: boolean) => void | Promise<void>;
  isLoading?: boolean;
  canReplyOnWeb?: boolean;
  onDraftChange?: (dirty: boolean) => void;
}

export const ReplyBox: React.FC<ReplyBoxProps> = ({ onSendMessage, isLoading = false, canReplyOnWeb = false, onDraftChange }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [saved, setSaved] = useState<'note' | 'web' | null>(null);
  const submitting = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isLoading || submitting.current || (!isInternalNote && !canReplyOnWeb)) return;
    submitting.current = true; setSaved(null);
    try { await onSendMessage(content.trim(), isInternalNote); setContent(''); onDraftChange?.(false); setSaved(isInternalNote ? 'note' : 'web'); }
    catch { /* The owning view displays the error. Preserve the draft for manual recovery. */ }
    finally { submitting.current = false; }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`border rounded-xl p-3.5 transition-colors ${
        isInternalNote
          ? 'bg-amber-950/20 border-amber-500/30'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium select-none text-slate-300">
          <input
            type="checkbox"
            checked={isInternalNote}
            disabled={isLoading}
            onChange={(e) => {
              if (content.trim() && !window.confirm(t('discardDraft'))) return;
              setContent(''); onDraftChange?.(false); setSaved(null); setIsInternalNote(e.target.checked);
            }}
            className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            aria-label={t('internalNoteLabel')}
          />
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            {t('internalNoteLabel')}
          </span>
        </label>
        {isInternalNote && (
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            {t('internalNoteHint')}
          </span>
        )}
      </div>

      <textarea
        aria-label={t(isInternalNote ? 'internalNoteLabel' : 'replyContent')}
        value={content}
        maxLength={8000}
        disabled={isLoading || (!isInternalNote && !canReplyOnWeb)}
        onChange={(e) => { setContent(e.target.value); onDraftChange?.(Boolean(e.target.value.trim())); setSaved(null); }}
        placeholder={
          isInternalNote
            ? t('internalNotePlaceholder')
            : t('webReplyPlaceholder')
        }
        rows={3}
        className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
      />

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11px] text-slate-500">
          {t(isInternalNote ? 'internalNoteHint' : 'webReplyHint')}
        </span>
        {(isInternalNote || canReplyOnWeb) && <button
          type="submit"
          disabled={!content.trim() || isLoading}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isInternalNote
              ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{t(isInternalNote ? 'saveNote' : 'respondWeb')}</span>
        </button>}
      </div>
      {saved && <p role="status" className="mt-2 text-xs text-emerald-300">{t(saved === 'note' ? 'internalNoteSaved' : 'webReplySaved')}</p>}
    </form>
  );
};
