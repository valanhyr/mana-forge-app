import { Layers, Euro, Loader2, Save, Shield } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface FloatingTotalsBarProps {
  isFloating: boolean;
  isCommanderFormat: boolean;
  totalCount: number;
  mainCount: number;
  sideCount: number;
  totalPrice: number;
  isDeckValid: boolean;
  isSaving: boolean;
  isEditing: boolean;
  onSave: (stayOpen: boolean) => void;
}

const FloatingTotalsBar = ({
  isFloating,
  isCommanderFormat,
  totalCount,
  mainCount,
  sideCount,
  totalPrice,
  isDeckValid,
  isSaving,
  isEditing,
  onSave,
}: FloatingTotalsBarProps) => {
  const { t } = useTranslation();
  const canSave = isDeckValid && !isSaving;

  return (
    <>
      {isFloating && <div className="h-16" />}
      <div
        className={
          isFloating
            ? 'fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800/80'
            : 'mt-4 rounded-2xl border border-zinc-800 bg-zinc-900'
        }
      >
        <div className="flex flex-wrap items-center gap-3 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {isCommanderFormat ? (
              <div className="flex items-center gap-1.5 text-sm">
                <Layers size={14} className="text-orange-500 flex-shrink-0" />
                <span className="text-white font-bold">{totalCount}</span>
                <span className="text-zinc-500 hidden sm:inline">{t('deckViewer.total')}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-sm">
                  <Layers size={14} className="text-orange-500 flex-shrink-0" />
                  <span className="text-white font-bold">{mainCount}</span>
                  <span className="text-zinc-500 hidden sm:inline">{t('common.mainDeck')}</span>
                </div>
                {sideCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Shield size={14} className="text-zinc-500 flex-shrink-0" />
                    <span className="text-white font-bold">{sideCount}</span>
                    <span className="text-zinc-500 hidden sm:inline">{t('common.sideboard')}</span>
                  </div>
                )}
              </>
            )}
            {totalPrice > 0 && (
              <div className="flex items-center gap-1.5 text-sm ml-auto">
                <Euro size={14} className="text-green-400 flex-shrink-0" />
                <span className="text-green-400 font-bold">{totalPrice.toFixed(2)} €</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => onSave(true)}
              disabled={!canSave}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full sm:w-auto ${canSave ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 active:scale-95' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? t('common.saving') : t('deckBuilder.saveAndContinue')}
            </button>

            <button
              onClick={() => onSave(false)}
              disabled={!canSave}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all w-full sm:w-auto ${canSave ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving
                ? t('common.saving')
                : isEditing
                  ? t('deckBuilder.updateDeck')
                  : t('deckBuilder.saveDeck')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingTotalsBar;
