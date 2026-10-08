import React, { useState } from 'react';
import { Send, Lock } from 'lucide-react';

interface ReplyBoxProps {
  onSendMessage: (content: string, isInternalNote: boolean) => void;
  isLoading?: boolean;
}

export const ReplyBox: React.FC<ReplyBoxProps> = ({ onSendMessage, isLoading = false }) => {
  const [content, setContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isLoading) return;
    onSendMessage(content.trim(), isInternalNote);
    setContent('');
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
            onChange={(e) => setIsInternalNote(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            aria-label="Internal note"
          />
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Internal note (only visible to operators)
          </span>
        </label>
        {isInternalNote && (
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
            Private Log
          </span>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          isInternalNote
            ? 'Write an internal investigation note, Scryfall query details, or reminder...'
            : 'Type your reply to the user...'
        }
        rows={3}
        className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
      />

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11px] text-slate-500">
          Tip: Press Submit to send response
        </span>
        <button
          type="submit"
          disabled={!content.trim() || isLoading}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isInternalNote
              ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isInternalNote ? 'Save Note' : 'Send Reply'}</span>
        </button>
      </div>
    </form>
  );
};
