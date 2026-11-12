import { AlertCircle, Brain, Loader2, Save, Shield, ShieldAlert } from 'lucide-react';
import DropdownInput from '../ui/DropdownInput';
import type { Format } from '../../core/models/Format';
import { useTranslation } from '../../hooks/useTranslation';

interface ConfigPanelProps {
  deckName: string;
  onDeckName: (name: string) => void;
  nameTouched: boolean;
  onNameTouched: () => void;
  formats: Format[];
  selectedFormat: Format | null;
  onFormat: (formatId: string) => void;
  isPrivate: boolean;
  onTogglePrivate: () => void;
  isDeckValid: boolean;
  validationErrors: string[];
  isAnalyzing: boolean;
  onAnalyze: () => void;
  isSaving: boolean;
  isEditing: boolean;
  onSave: (stayOpen: boolean) => void;
}

const ConfigPanel = ({
  deckName,
  onDeckName,
  nameTouched,
  onNameTouched,
  formats,
  selectedFormat,
  onFormat,
  isPrivate,
  onTogglePrivate,
  isDeckValid,
  validationErrors,
  isAnalyzing,
  onAnalyze,
  isSaving,
  isEditing,
  onSave,
}: ConfigPanelProps) => {
  const { t } = useTranslation();
  const formatOptions = formats.map((f) => ({
    value: f.id,
    label: f.name.es || f.name.en || f.scryfallKey,
  }));
  const nameInvalid = nameTouched && !deckName.trim();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">
            {t('deckBuilder.deckNameLabel')}
          </label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => onDeckName(e.target.value)}
            onBlur={onNameTouched}
            placeholder={t('deckBuilder.deckNamePlaceholder')}
            className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all placeholder-zinc-600 ${
              nameInvalid
                ? 'border-red-500 focus:ring-red-500/50'
                : 'border-zinc-800 focus:ring-orange-500/50'
            }`}
          />
          {nameInvalid && (
            <p className="mt-1 text-xs text-red-400">{t('deckBuilder.deckNameRequired')}</p>
          )}
        </div>

        <div>
          <DropdownInput
            label={t('deckBuilder.formatLabel')}
            options={formatOptions}
            value={selectedFormat?.id ?? ''}
            onChange={onFormat}
            placeholder={t('deckBuilder.formatPlaceholder')}
          />
          {selectedFormat && (
            <div className="mt-2 text-xs text-zinc-500 flex gap-4 px-1">
              <span>
                {t('deckBuilder.minCardsLabel')}{' '}
                <span className="text-zinc-300">{selectedFormat.config.minMainDeck}</span>
              </span>
              {selectedFormat.config.maxMainDeck && (
                <span>
                  {t('deckBuilder.maxCardsLabel')}{' '}
                  <span className="text-zinc-300">{selectedFormat.config.maxMainDeck}</span>
                </span>
              )}
              <span>
                {t('deckBuilder.maxCopiesLabel')}{' '}
                <span className="text-zinc-300">{selectedFormat.config.maxCopies}</span>
              </span>
              {selectedFormat.config.maxSideboard > 0 && (
                <span>
                  {t('deckBuilder.sideboardLabel')}{' '}
                  <span className="text-zinc-300">{selectedFormat.config.maxSideboard}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:mr-auto">
          <button
            onClick={onTogglePrivate}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all sm:w-auto ${
              isPrivate
                ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {isPrivate ? <Shield size={18} /> : <ShieldAlert size={18} />}
            <span className="font-bold">
              {isPrivate ? t('deckBuilder.private') : t('deckBuilder.public')}
            </span>
          </button>
          <span className="text-xs text-zinc-600">
            {isPrivate ? t('deckBuilder.privateDescription') : t('deckBuilder.publicDescription')}
          </span>
        </div>

        <button
          onClick={onAnalyze}
          disabled={!isDeckValid || isAnalyzing}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border w-full md:w-auto ${
            isDeckValid && !isAnalyzing
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 hover:bg-indigo-600/30'
              : 'bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <Brain size={20} className={isAnalyzing ? 'animate-pulse' : ''} />
          {isAnalyzing ? t('deckBuilder.analyzing') : t('deckBuilder.analyzeAI')}
        </button>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => onSave(false)}
            disabled={!isDeckValid || isSaving}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all w-full md:w-auto ${
              isDeckValid && !isSaving
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving
              ? t('common.saving')
              : isEditing
                ? t('deckBuilder.updateDeck')
                : t('deckBuilder.saveDeck')}
          </button>

          <button
            onClick={() => onSave(true)}
            disabled={!isDeckValid || isSaving}
            className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold transition-all w-full md:w-auto ${
              isDeckValid && !isSaving
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 active:scale-95'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? t('common.saving') : t('deckBuilder.saveAndContinue')}
          </button>
        </div>
      </div>
      {!isDeckValid && validationErrors.length > 0 && (
        <ul className="mt-2 flex flex-col items-end gap-1">
          {validationErrors.map((err, i) => (
            <li key={i} className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle size={12} />
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConfigPanel;
