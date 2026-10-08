import React, { useState, useEffect } from 'react';
import { EmailTemplate, BroadcastAudience, interpolateTemplate } from '../../core/domain/email';
import { TemplateSelector } from './TemplateSelector';
import { MacroPreview } from './MacroPreview';
import { Send, Sparkles, Mail, Radio } from 'lucide-react';

interface EmailComposerProps {
  templates: EmailTemplate[];
  onSend: (data: {
    to: string;
    recipientName: string;
    subject: string;
    body: string;
    templateId?: string;
  }) => void;
  onSendBroadcast?: (data: {
    audience: BroadcastAudience;
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
  onSendBroadcast,
  initialRecipient,
  isLoading = false,
}) => {
  const [dispatchMode, setDispatchMode] = useState<'DIRECT' | 'BROADCAST'>('DIRECT');
  const [audience, setAudience] = useState<BroadcastAudience>('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(
    templates[0] || null
  );
  const [to, setTo] = useState(initialRecipient?.email || '');
  const [recipientName, setRecipientName] = useState(initialRecipient?.name || '');
  const [variables, setVariables] = useState<Record<string, string>>({
    'user.name': initialRecipient?.name || 'Urza',
    'deck.title': 'Mono Blue Premodern Tide',
    'ticket.id': 'TCK-001',
    'month': 'October 2026',
    'unsubscribe_url': 'https://manaforge.gg/unsubscribe?token=usr_token_xyz',
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (selectedTemplate) {
      setSubject(interpolateTemplate(selectedTemplate.subject, variables));
      setBody(interpolateTemplate(selectedTemplate.bodyTemplate, variables));
      if (selectedTemplate.category === 'BROADCAST') {
        setDispatchMode('BROADCAST');
      }
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
    if (!subject.trim() || !body.trim() || isLoading) return;

    if (dispatchMode === 'BROADCAST') {
      if (onSendBroadcast) {
        onSendBroadcast({
          audience,
          subject: subject.trim(),
          body: body.trim(),
          templateId: selectedTemplate?.id,
        });
      }
    } else {
      if (!to.trim()) return;
      onSend({
        to: to.trim(),
        recipientName: recipientName.trim() || to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        templateId: selectedTemplate?.id,
      });
    }
  };

  const getAudienceCount = (aud: BroadcastAudience) => {
    switch (aud) {
      case 'ALL':
        return 30;
      case 'FREE':
        return 18;
      case 'PRO_PATREON':
        return 12;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Editor column */}
      <div className="lg:col-span-7 space-y-4 flex flex-col">
        {/* Mode Switcher */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setDispatchMode('DIRECT')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dispatchMode === 'DIRECT'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Direct Message (1:1 Support)</span>
          </button>
          <button
            type="button"
            onClick={() => setDispatchMode('BROADCAST')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              dispatchMode === 'BROADCAST'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Audience Broadcast (Newsletter)</span>
          </button>
        </div>

        <TemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplate?.id}
          onSelectTemplate={handleSelectTemplate}
        />

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5 flex-1 flex flex-col"
        >
          {dispatchMode === 'DIRECT' ? (
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
          ) : (
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-purple-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-purple-400" />
                  Target Broadcast Audience
                </span>
                <span className="font-mono text-purple-400 font-bold">
                  ~{getAudienceCount(audience)} Recipients
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ALL' as BroadcastAudience, label: 'All Players', count: 30 },
                  { id: 'PRO_PATREON' as BroadcastAudience, label: 'Pro & Patreon', count: 12 },
                  { id: 'FREE' as BroadcastAudience, label: 'Free Tier', count: 18 },
                ].map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setAudience(aud.id)}
                    className={`p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      audience === aud.id
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>{aud.label}</div>
                    <div className="text-[10px] opacity-75">{aud.count} users</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Macro Quick Variables */}
          <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dynamic Macros & Interpolation</span>
              </div>
              {dispatchMode === 'BROADCAST' && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  List-Unsubscribe Enabled
                </span>
              )}
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
                <span className="text-[10px] text-slate-500 font-mono block">{'{{unsubscribe_url}}'}</span>
                <input
                  type="text"
                  value={variables['unsubscribe_url'] || ''}
                  onChange={(e) => handleVariableChange('unsubscribe_url', e.target.value)}
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
              disabled={isLoading || (dispatchMode === 'DIRECT' && !to.trim())}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                dispatchMode === 'BROADCAST'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isLoading
                  ? 'Dispatching...'
                  : dispatchMode === 'BROADCAST'
                  ? `Dispatch Broadcast (${getAudienceCount(audience)} Players)`
                  : 'Dispatch Email'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Preview column */}
      <div className="lg:col-span-5 h-full">
        <MacroPreview
          subject={subject}
          body={body}
          recipientEmail={
            dispatchMode === 'BROADCAST'
              ? `Broadcast [${audience}] (~${getAudienceCount(audience)} recipients)`
              : to
          }
        />
      </div>
    </div>
  );
};
