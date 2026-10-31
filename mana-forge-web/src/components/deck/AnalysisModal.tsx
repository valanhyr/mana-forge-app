import Modal from '../ui/Modal';
import DeckProfileChart from '../ui/DeckProfileChart';
import type { DeckAnalysisResult } from '../../services/DeckService';
import { useTranslation } from '../../hooks/useTranslation';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DeckAnalysisResult | null;
  onPreviewCard: (cardName: string) => void;
}

const AnalysisModal = ({ isOpen, onClose, result, onPreviewCard }: AnalysisModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('deckBuilder.analysisModalTitle')}
      maxWidth="sm:max-w-[80vw]"
      fullScreenMobile
    >
      {result && (
        <div className="space-y-6 text-zinc-300 sm:max-h-[70vh] overflow-y-auto pr-2 pb-6">
          {result.scores && (
            <DeckProfileChart
              scores={result.scores}
              projectedScores={result.projected_scores}
              containerClassName="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700"
            />
          )}

          <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
            <h4 className="text-orange-500 font-bold mb-2">{t('deckBuilder.generalSummary')}</h4>
            <p className="text-sm">{result.general_summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-900/10 p-4 rounded-xl border border-green-900/30">
              <h4 className="text-green-500 font-bold mb-2">{t('deckBuilder.strengths')}</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30">
              <h4 className="text-red-500 font-bold mb-2">{t('deckBuilder.weaknesses')}</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {result.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-3">{t('deckBuilder.matchups')}</h4>
            <div className="space-y-3">
              {result.matchups?.map((match, idx) => (
                <div key={idx} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-indigo-400">{match.archetype}</span>
                    <div className="text-xs font-mono">
                      <span className="text-zinc-500">{t('deckBuilder.winRate')} </span>
                      <span className={match.win_rate_post > 50 ? 'text-green-500' : 'text-red-500'}>
                        {match.win_rate_pre}% ➔ {match.win_rate_post}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 italic mb-2">{match.strategy}</p>
                </div>
              ))}
            </div>
          </div>

          {result.suggested_changes && result.suggested_changes.length > 0 && (
            <div>
              <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-yellow-400">✦</span>
                {t('deckBuilder.suggestedChanges') || 'Cambios Sugeridos'}
              </h4>
              <div className="space-y-2">
                {result.suggested_changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-red-400/80 line-through text-xs truncate flex-shrink-0 max-w-[40%]">
                        {change.card_out}
                      </span>
                      <span className="text-zinc-500">→</span>
                      <button
                        onClick={() => onPreviewCard(change.card_in)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs underline underline-offset-2 truncate text-left transition-colors"
                        title={`Click to preview ${change.card_in}`}
                      >
                        {change.card_in}
                      </button>
                      {change.quantity && (
                        <span className="text-zinc-600 text-[10px] flex-shrink-0">
                          x{change.quantity}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 italic sm:max-w-[50%]">{change.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default AnalysisModal;
