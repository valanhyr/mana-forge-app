import React, { useState } from 'react';
import { useEmailTemplates, useSendEmail } from '../hooks/use-emails';
import { EmailComposer } from '../components/emails/EmailComposer';
import { CheckCircle2, History } from 'lucide-react';

export const EmailOutreachView: React.FC = () => {
  const { data: templates = [], isLoading: isTemplatesLoading } = useEmailTemplates();
  const sendEmailMutation = useSendEmail();
  const [dispatchedHistory, setDispatchedHistory] = useState<
    Array<{ to: string; subject: string; timestamp: string }>
  >([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSend = async (payload: {
    to: string;
    recipientName: string;
    subject: string;
    body: string;
    templateId?: string;
  }) => {
    const res = await sendEmailMutation.mutateAsync(payload);
    if (res.success) {
      setDispatchedHistory((prev) => [
        {
          to: payload.to,
          subject: payload.subject,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      setSuccessToast(`Email successfully dispatched to ${payload.to}`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  if (isTemplatesLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Loading email templates...
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      {successToast && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <EmailComposer
          templates={templates}
          onSend={handleSend}
          isLoading={sendEmailMutation.isPending}
        />
      </div>

      {dispatchedHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Recent Session Dispatches</span>
          </div>
          <div className="flex gap-4 overflow-x-auto text-xs text-slate-300 pb-1">
            {dispatchedHistory.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0"
              >
                <div className="font-medium text-slate-200">{item.to}</div>
                <div className="text-[10px] text-slate-500">
                  {item.subject} • {item.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
