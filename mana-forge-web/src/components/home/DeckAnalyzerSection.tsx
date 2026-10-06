import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, Lock, Sparkles, Wand2 } from 'lucide-react';

import TextAreaInput from '../ui/TextAreaInput';
import Modal from '../ui/Modal';
import DeckProfileChart from '../ui/DeckProfileChart';
import TurnstileWidget from '../ui/TurnstileWidget';
import { isTurnstileConfigured } from '../../config/turnstile';
import ForgeSpinner from '../ui/ForgeSpinner';

import { CardService } from '../../services/CardService';
import { DeckService, type AnalysisQuota, type DeckAnalysisResult } from '../../services/DeckService';
import { useUser } from '../../services/UserContext';
import { useToast } from '../../services/ToastContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  buildAnalysisPayload,
  countCards,
  parseDecklist,
  sanitizeDecklistText,
} from '../../utils/decklistParser';
import type { BatchLookup } from '../../utils/scryfallHelpers';

const SAMPLE_DECK = `4 Lightning Bolt
4 Mutagenic Growth
4 Gitaxian Probe
4 Ninja of the Deep Hours
4 Spellstutter Sprite
4 Force of Will
2 Underground Sea
2 Island
2 Sulfur Falls
10 Sideboard
2 Duress
2 Cryptic Command
2 Pyrokinesis`;

interface DeckAnalyzerSectionProps {
  /** Formats fetched by the Dashboard, reused to avoid a second request. */
  formats: Array<{ mongoId: string; title: string }>;
}

const MIN_MAIN_DECK = 40;

const DeckAnalyzerSection: React.FC<DeckAnalyzerSectionProps> = ({ formats }) => {
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useUser();
  const { showToast } = useToast();

  const [deckText, setDeckText] = useState('');
  const [formatId, setFormatId] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState('');
  /** Set when the challenge script/iframe fails to load, e.g. a site key that
   *  is not allowed on this hostname. The button stays disabled but the user is
   *  told why, instead of staring at a dead form. */
  const [challengeFailed, setChallengeFailed] = useState(false);
  const [quota, setQuota] = useState<AnalysisQuota | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [result, setResult] = useState<DeckAnalysisResult | null>(null);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [unresolved, setUnresolved] = useState<string[]>([]);

  // Default to the first available format once the list arrives.
  useEffect(() => {
    if (!formatId && formats.length > 0) setFormatId(formats[0].mongoId);
  }, [formats, formatId]);

  useEffect(() => {
    let cancelled = false;
    DeckService.getAnalysisQuota()
      .then((q) => { if (!cancelled) setQuota(q); })
      .catch(() => { /* counter is optional; ignore */ });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const lines = useMemo(() => parseDecklist(sanitizeDecklistText(deckText)), [deckText]);
  const counts = useMemo(() => countCards(lines), [lines]);
  const selectedFormat = formats.find((f) => f.mongoId === formatId);

  const quotaExhausted = quota?.remaining === 0;
  const needsChallenge = !isAuthenticated && isTurnstileConfigured() && !challengeFailed;
  const canAnalyze =
    counts.main >= MIN_MAIN_DECK &&
    Boolean(selectedFormat) &&
    !isAnalyzing &&
    !quotaExhausted &&
    (!needsChallenge || Boolean(turnstileToken));

  const handleAnalyze = useCallback(async () => {
    if (!selectedFormat || isAnalyzing) return;

    setIsAnalyzing(true);
    setUnresolved([]);
    try {
      // Resolve names through Scryfall so the model receives canonical card
      // names. Unresolved lines are still forwarded (see buildAnalysisPayload).
      setIsResolving(true);
      let batch: BatchLookup = {};
      try {
        batch = await CardService.batchSearch(lines.map((l) => l.name));
      } catch {
        // Non-fatal: fall back to the user's own text.
      } finally {
        setIsResolving(false);
      }

      const { payload, unresolved: missing } = buildAnalysisPayload(lines, batch, {
        formatName: selectedFormat.title,
        locale,
      });

      const analysis = await DeckService.analyzeDeck(payload, turnstileToken || undefined);

      if (analysis.quota) setQuota(analysis.quota);
      setUnresolved(missing);

      if (analysis.error) {
        showToast(analysis.error, 'error');
        return;
      }

      setResult(analysis);
      setIsResultOpen(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        showToast(t('home.analyzeQuotaReached'), 'error');
        DeckService.getAnalysisQuota().then(setQuota).catch(() => {});
      } else if (status === 403) {
        showToast(t('home.analyzeChallengeFailed'), 'error');
      } else {
        showToast(t('home.analyzeError'), 'error');
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [lines, selectedFormat, locale, turnstileToken, isAnalyzing, showToast, t]);

  const handleLoadSample = () => {
    setDeckText(SAMPLE_DECK);
    setResult(null);
    setUnresolved([]);
  };

  return (
    <section id="try-analysis" data-testid="deck-analyzer">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white">{t('home.tryAnalysisTitle')}</h2>
        <p className="text-zinc-400 mt-2 max-w-2xl mx-auto">{t('home.tryAnalysisSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Input ── */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <TextAreaInput
            label={t('home.decklistLabel')}
            placeholder={t('home.decklistPlaceholder')}
            hint={t('home.decklistHint')}
            value={deckText}
            onChange={(value) => { setDeckText(value); setResult(null); }}
            rows={12}
            minHeight="220px"
          />

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                {t('home.formatLabel')}
              </label>
              <select
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800"
              >
                {formats.map((format) => (
                  <option key={format.mongoId} value={format.mongoId}>
                    {format.title}
                  </option>
                ))}
              </select>
            </div>

            {deckText.trim() === '' && (
              <button
                type="button"
                onClick={handleLoadSample}
                className="mt-7 text-sm text-orange-500 hover:underline whitespace-nowrap"
              >
                {t('home.loadSample')}
              </button>
            )}
          </div>

          {/* Live deck counters give instant feedback before spending a token. */}
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500 mb-4">
            <span>
              {t('home.mainDeckCount')}: <span className="text-zinc-300 font-bold">{counts.main}</span>
            </span>
            <span>
              {t('home.sideboardCount')}: <span className="text-zinc-300 font-bold">{counts.side}</span>
            </span>
            {counts.main > 0 && counts.main < MIN_MAIN_DECK && (
              <span className="flex items-center gap-1 text-orange-500">
                <AlertTriangle size={12} /> {t('home.deckTooSmall')}
              </span>
            )}
          </div>

          {challengeFailed && (
            <div className="mb-4 bg-red-900/10 border border-red-900/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">{t('home.challengeFailedTitle')}</p>
                <p className="text-xs text-zinc-500 mt-1">{t('home.challengeFailedHint')}</p>
              </div>
            </div>
          )}

          {!challengeFailed && needsChallenge && (
            <div className="mb-4">
              <TurnstileWidget
                onToken={(token) => { setTurnstileToken(token); setChallengeFailed(false); }}
                onError={() => {
                  setTurnstileToken('');
                  setChallengeFailed(true);
                }}
              />
              <p className="text-xs text-zinc-500 mt-2">{t('home.challengeNotice')}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isResolving ? t('home.resolvingCards') : t('home.analyzing')}
              </>
            ) : (
              <>
                <Wand2 size={18} /> {t('home.analyzeButton')}
              </>
            )}
          </button>

          {/* Quota state: shown as a limit, an exhaustion warning, or hidden. */}
          {quota && quota.remaining !== null && (
            <p
              className={`text-xs mt-3 flex items-center gap-1 ${
                quotaExhausted ? 'text-red-400' : 'text-zinc-500'
              }`}
            >
              <Lock size={12} />
              {quotaExhausted
                ? t('home.quotaExhausted')
                : t('home.quotaRemaining', { remaining: quota.remaining })}
              {!quotaExhausted && (
                <Link to="/login" className="text-orange-500 hover:underline ml-1">
                  {t('home.signInForMore')}
                </Link>
              )}
            </p>
          )}
        </div>

        {/* ── Pitch / how it works ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400" /> {t('home.whatYouGetTitle')}
            </h3>
            <ul className="space-y-2 text-sm text-zinc-400 list-disc list-inside">
              <li>{t('home.benefitProfile')}</li>
              <li>{t('home.benefitMatchups')}</li>
              <li>{t('home.benefitChanges')}</li>
            </ul>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-3">{t('home.stepsTitle')}</h3>
            <ol className="space-y-3 text-sm text-zinc-400 list-decimal list-inside">
              <li>{t('home.stepPaste')}</li>
              <li>{t('home.stepFormat')}</li>
              <li>{t('home.stepRead')}</li>
            </ol>
          </div>

          {!isAuthenticated && (
            <div className="bg-zinc-900 border border-orange-500/30 rounded-2xl p-6">
              <p className="text-sm text-zinc-300 mb-3">{t('home.saveDeckPitch')}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-orange-500 font-semibold text-sm hover:underline"
              >
                {t('home.signInForMore')} <Sparkles size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <Modal
        isOpen={isResultOpen}
        onClose={() => setIsResultOpen(false)}
        title={t('home.analysisResultTitle')}
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

            {result.general_summary && (
              <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                <h4 className="text-orange-500 font-bold mb-2">{t('deckBuilder.generalSummary')}</h4>
                <p className="text-sm">{result.general_summary}</p>
              </div>
            )}

            {(result.strengths?.length || result.weaknesses?.length) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.strengths && result.strengths.length > 0 && (
                  <div className="bg-green-900/10 p-4 rounded-xl border border-green-900/30">
                    <h4 className="text-green-500 font-bold mb-2">{t('deckBuilder.strengths')}</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {result.weaknesses && result.weaknesses.length > 0 && (
                  <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30">
                    <h4 className="text-red-500 font-bold mb-2">{t('deckBuilder.weaknesses')}</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {result.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {result.matchups && result.matchups.length > 0 && (
              <div>
                <h4 className="text-white font-bold mb-3">{t('deckBuilder.matchups')}</h4>
                <div className="space-y-3">
                  {result.matchups.map((match, idx) => (
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
            )}

            {result.suggested_changes && result.suggested_changes.length > 0 && (
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <span className="text-yellow-400">✦</span> {t('deckBuilder.suggestedChanges')}
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
                        <span className="text-indigo-400 font-semibold text-xs truncate">
                          {change.card_in}
                        </span>
                        {change.quantity && (
                          <span className="text-zinc-600 text-[10px] flex-shrink-0">x{change.quantity}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 italic sm:max-w-[50%]">{change.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {unresolved.length > 0 && (
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400">{t('home.unresolvedCards')}</p>
                <p className="text-xs text-zinc-600 mt-1 truncate">{unresolved.join(', ')}</p>
              </div>
            )}

            {!isAuthenticated && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <p className="text-sm text-zinc-300">{t('home.saveDeckPitch')}</p>
                <Link
                  to="/login"
                  className="shrink-0 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {t('home.signInForMore')}
                </Link>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Shown while the very first analysis runs, above the fold. */}
      {isAnalyzing && !isResultOpen && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-3">
          <ForgeSpinner size={32} />
          <div>
            <p className="text-sm text-white font-medium">{t('home.analyzing')}</p>
            <p className="text-xs text-zinc-500">{t('home.analyzingCanTakeWhile')}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default DeckAnalyzerSection;