import { AlertCircle, Upload, X } from 'lucide-react';
import Modal from '../ui/Modal';
import TextAreaInput from '../ui/TextAreaInput';
import type { ImportResult } from '../../hooks/useDeckImport';
import { useTranslation } from '../../hooks/useTranslation';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  onText: (text: string) => void;
  onImport: () => void;
}

export const ImportModal = ({ isOpen, onClose, text, onText, onImport }: ImportModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('deckBuilder.importModalTitle')}>
      <TextAreaInput
        value={text}
        onChange={onText}
        placeholder={t('deckBuilder.importModalPlaceholder')}
        minHeight="200px"
        hint={t('deckBuilder.importModalHint')}
      />
      <button
        onClick={onImport}
        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 mt-4"
      >
        {t('deckBuilder.importButton')}
      </button>
    </Modal>
  );
};

interface ImportFeedbackProps {
  onOpen: () => void;
  errors: string[];
  onClearErrors: () => void;
  result: ImportResult | null;
  onClearResult: () => void;
}

export const ImportFeedback = ({
  onOpen,
  errors,
  onClearErrors,
  result,
  onClearResult,
}: ImportFeedbackProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onOpen}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-all shadow-lg font-bold min-h-[46px]"
        >
          <Upload size={20} />
          {t('deckBuilder.importDeckButton')}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4 relative animate-in fade-in slide-in-from-top-2">
          <button
            onClick={onClearErrors}
            className="absolute top-2 right-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-red-500 font-bold text-sm mb-1">
                {t('deckBuilder.importErrorTitle', { count: errors.length })}
              </h4>
              <ul className="text-red-400/80 text-xs list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                {errors.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {result && (
        <Modal title={t('deckBuilder.importResultTitle')} isOpen={!!result} onClose={onClearResult}>
          <div className="p-4">
            <p className="text-sm text-zinc-300 mb-2">
              {t('deckBuilder.importResultSummary', {
                success: result.successCount,
                failures: result.failures.length,
              })}
            </p>
            {result.failures.length > 0 ? (
              <div className="mt-2">
                <h4 className="text-sm text-red-400 font-bold mb-1">
                  {t('deckBuilder.importFailuresTitle')}
                </h4>
                <ul className="text-xs text-red-300 list-disc list-inside max-h-40 overflow-y-auto">
                  {result.failures.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      onClearResult();
                      onOpen();
                    }}
                    className="px-3 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-700"
                  >
                    {t('deckBuilder.retryImport')}
                  </button>
                  <button
                    onClick={onClearResult}
                    className="px-3 py-2 bg-zinc-900 text-zinc-300 rounded-lg border border-zinc-700"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex justify-end">
                <button onClick={onClearResult} className="px-3 py-2 bg-green-600 text-white rounded-lg">
                  {t('common.ok')}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};
