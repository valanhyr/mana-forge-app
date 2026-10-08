import React from 'react';
import { Eye } from 'lucide-react';

interface MacroPreviewProps {
  subject: string;
  body: string;
  recipientEmail: string;
}

export const MacroPreview: React.FC<MacroPreviewProps> = ({
  subject,
  body,
  recipientEmail,
}) => {
  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800 text-xs font-semibold text-slate-300">
        <Eye className="w-4 h-4 text-indigo-400" />
        <span>Live Dispatch Preview</span>
      </div>

      <div className="space-y-3 flex-1 flex flex-col">
        <div className="text-xs text-slate-400">
          <span className="font-medium text-slate-500">To: </span>
          <span className="text-slate-200 font-mono">
            {recipientEmail || '(recipient not specified)'}
          </span>
        </div>

        <div className="text-xs text-slate-400 pb-2 border-b border-slate-800/60">
          <span className="font-medium text-slate-500">Subject: </span>
          <span className="text-slate-100 font-semibold">{subject || '(no subject)'}</span>
        </div>

        <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans overflow-y-auto">
          {body || 'Preview will render here once a template or text is entered.'}
        </div>
      </div>
    </div>
  );
};
