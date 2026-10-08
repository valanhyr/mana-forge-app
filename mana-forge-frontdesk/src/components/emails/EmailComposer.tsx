import React, { useState, useEffect } from 'react';
import { EmailTemplate, interpolateTemplate } from '../../core/domain/email';
import { TemplateSelector } from './TemplateSelector';
import { MacroPreview } from './MacroPreview';
import { Send, Sparkles, User, Tag } from 'lucide-react';

interface EmailComposerProps {
  templates: EmailTemplate[];
  onSend: (data: {
    to: string;
    recipientName: string;
    subject: string;
    body: string;
    templateId?: string;
  }) => void;
  initialRecipient?: { email: string; name: string };
  isLoading?: boolean;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  templates,
  onSend,
  initialRecipient,
  isLoading = false,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(
    templates[0] || null
  );
  const [to, setTo] = useState(initialRecipient?.email || '');
  const [recipientName, setRecipientName] = useState(initialRecipient?.name || '');
  const [variables, setVariables] = useState<Record<string, string>>({
    'user.name': initialRecipient?.name || 'Urza',
    'deck.title': 'Mono Blue Premodern Tide',
    'ticket.id': 'TCK-001',
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (selectedTemplate) {
      setSubject(interpolateTemplate(selectedTemplate.subject, variables));
      setBody(interpolateTemplate(selectedTemplate.bodyTemplate, variables));
    }
  }, [selectedTemplate, variables]);

  const handleVariableChange = (key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim() || isLoading) return;
    onSend({
      to: to.trim(),
      recipientName: recipientName.trim() || to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      templateId: selectedTemplate?.id,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Editor column */}
      <div className="lg:col-span-7 space-y-4 flex flex-col">
        <TemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplate?.id}
          onSelectTemplate={handleSelectTemplate}
        />

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex-1 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="recipient-email" className="text-xs text-slate-400 block mb-1">
                Recipient Email
              </label>
              <input
                id="recipient-email"
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="recipient-name" className="text-xs text-slate-400 block mb-1">
                Recipient Name
              </label>
              <input
                id="recipient-name"
                type="text"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  handleVariableChange('user.name', e.target.value);
                }}
                placeholder="Urza Planeswalker"
                className="w-full px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Macro Quick Variables */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dynamic Macros Interpolation</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">{'{{user.name}}'}</span>
                <input
                  type="text"
                  value={variables['user.name'] || ''}
                  onChange={(e) => handleVariableChange('user.name', e.target.value)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">{'{{deck.title}}'}</span>
                <input
                  type="text"
                  value={variables['deck.title'] || ''}
                  onChange={(e) => handleVariableChange('deck.title', e.target.value)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">{'{{ticket.id}}'}</span>
                <input
                  type="text"
                  value={variables['ticket.id'] || ''}
                  onChange={(e) => handleVariableChange('ticket.id', e.target.value)}
                  className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-xs text-slate-400 block mb-1">Body Content</label>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full flex-1 bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
            />
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={isLoading || !to.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isLoading ? 'Dispatching...' : 'Dispatch Email'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Preview column */}
      <div className="lg:col-span-5 h-full">
        <MacroPreview
          subject={subject}
          body={body}
          recipientEmail={to}
        />
      </div>
    </div>
  );
};
