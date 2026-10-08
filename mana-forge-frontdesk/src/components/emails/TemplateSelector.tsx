import React from 'react';
import { EmailTemplate } from '../../core/domain/email';
import { FileText } from 'lucide-react';

interface TemplateSelectorProps {
  templates: EmailTemplate[];
  selectedTemplateId?: string;
  onSelectTemplate: (template: EmailTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
        Standard Templates & Macros
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {templates.map((tpl) => {
          const isSelected = tpl.id === selectedTemplateId;
          return (
            <div
              key={tpl.id}
              onClick={() => onSelectTemplate(tpl)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-800 border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  {tpl.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  {tpl.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{tpl.subject}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
