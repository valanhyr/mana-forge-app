import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Library, Settings } from 'lucide-react';
import DeckList from '../../components/ui/DeckList';
import DeckStats from '../../components/ui/DeckStats';
import DeckProfileChart from '../../components/ui/DeckProfileChart';
import ImagePickerModal from '../../components/ui/ImagePickerModal';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import SEO from '../../components/ui/SEO';
import AnalysisModal from '../../components/deck/AnalysisModal';
import CardPreviewModal from '../../components/deck/CardPreviewModal';
import CardSearch from '../../components/deck/CardSearch';
import ConfigPanel from '../../components/deck/ConfigPanel';
import FloatingTotalsBar from '../../components/deck/FloatingTotalsBar';
import { ImportFeedback, ImportModal } from '../../components/deck/ImportModal';
import MaybeboardList from '../../components/deck/MaybeboardList';
import SpoilerView from '../../components/deck/SpoilerView';
import ViewToolbar, { type ViewMode } from '../../components/deck/ViewToolbar';
import { type Format } from '../../core/models/Format';
import { useCardPreview } from '../../hooks/useCardPreview';
import { useCardSearch } from '../../hooks/useCardSearch';
import { useDeckAnalysis } from '../../hooks/useDeckAnalysis';
import { useDeckCards } from '../../hooks/useDeckCards';
import { useDeckImport } from '../../hooks/useDeckImport';
import { useDeckLoader } from '../../hooks/useDeckLoader';
import { useDeckSave } from '../../hooks/useDeckSave';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useTranslation } from '../../hooks/useTranslation';
import { FormatService } from '../../services/FormatService';
import { useToast } from '../../services/ToastContext';
import { useUser } from '../../services/UserContext';
import { sortCards, type SortDir, type SortMode } from '../../utils/deck/cardTypes';
import { buildDeckView, type GroupMode } from '../../utils/deck/deckView';
import { isCommanderFormat as isCommanderFormatKey, validateDeck } from '../../utils/deck/validateDeck';
import { validationMessage } from '../../utils/deck/validationMessage';

const DeckBuilder = () => {
  const { user } = useUser();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const { deckId } = useParams();

  const [deckName, setDeckName] = useState('');
  const [deckNameTouched, setDeckNameTouched] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [formats, setFormats] = useState<Format[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortMode, setSortMode] = useState<SortMode>('cmc');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [groupMode, setGroupMode] = useState<GroupMode>('type');
  const [showPrices, setShowPrices] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(true);

  const formatKey = selectedFormat?.scryfallKey;
  const isCommanderFormat = isCommanderFormatKey(selectedFormat);
  const notify = (message: string, kind: 'success' | 'error') => showToast(message, kind);

  const deck = useDeckCards();
  const view = buildDeckView(deck.cards, groupMode, sortMode, sortDir);
  const validation = validateDeck({ name: deckName, format: selectedFormat, cards: deck.cards });
  const isDeckValid = validation.isValid;
  const validationErrors = validation.errors.map((err) => validationMessage(err, t));

  const search = useCardSearch(formatKey, deck.add);
  const preview = useCardPreview({ cards: deck.cards, formatKey, onAdd: deck.add, notify });
  const importer = useDeckImport(formatKey, deck.add);
  const picker = useImagePicker(deck.chooseImage);
  const analysis = useDeckAnalysis({
    cards: deck.cards,
    format: selectedFormat,
    locale,
    isDeckValid,
  });
  const saver = useDeckSave({
    deckId,
    userId: user?.userId,
    name: deckName,
    format: selectedFormat,
    isPrivate,
    cards: deck.cards,
    locale,
    isDeckValid,
    analysisResult: analysis.result,
    onNameMissing: () => setDeckNameTouched(true),
    notify,
    t,
  });
  const loader = useDeckLoader(deckId, formats, (loaded) => {
    setDeckName(loaded.name);
    setSelectedFormat(loaded.format);
    setIsPrivate(loaded.isPrivate);
    deck.setCards(loaded.cards);
    if (loaded.scores) saver.setDeckScores(loaded.scores);
  });

  useEffect(() => {
    FormatService.getActiveFormats().then(setFormats);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsFloating(!entry.isIntersecting), {
      threshold: 0,
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  const handleFormatChange = (formatId: string) => {
    const format = formats.find((f) => f.id === formatId) || null;
    setSelectedFormat(format);
    deck.revalidate(format?.scryfallKey);
  };

  return (
    <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto mt-8">
      <LoadingOverlay open={importer.isImporting} message={t('deckBuilder.importing') || 'Importando...'} />
      <LoadingOverlay open={loader.isLoading} message={t('deckBuilder.loadingCards') || 'Cargando cartas...'} />
      <LoadingOverlay open={analysis.isAnalyzing} message={t('deckBuilder.analyzing') || 'Analizando...'} />
      <SEO title={t('seo.deckBuilderTitle')} description={t('seo.deckBuilderDescription')} />
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Settings className="text-orange-500" size={28} />
          <h2 className="text-2xl font-bold text-white">{t('deckBuilder.title')}</h2>
        </div>
        <Link
          to="/my-decks"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-400 border border-orange-500/40 rounded-xl hover:border-orange-400 hover:bg-orange-500/10 transition-all"
        >
          <Library size={16} />
          {t('deckBuilder.viewMyDecks')}
        </Link>
      </div>

      <ConfigPanel
        deckName={deckName}
        onDeckName={setDeckName}
        nameTouched={deckNameTouched}
        onNameTouched={() => setDeckNameTouched(true)}
        formats={formats}
        selectedFormat={selectedFormat}
        onFormat={handleFormatChange}
        isPrivate={isPrivate}
        onTogglePrivate={() => setIsPrivate(!isPrivate)}
        isDeckValid={isDeckValid}
        validationErrors={validationErrors}
        isAnalyzing={analysis.isAnalyzing}
        onAnalyze={analysis.analyze}
        isSaving={saver.isSaving}
        isEditing={!!deckId}
        onSave={saver.save}
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl min-h-[500px] relative">
        {!selectedFormat ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
            <Settings size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">{t('deckBuilder.configureFormatTitle')}</p>
            <p className="text-sm opacity-60">{t('deckBuilder.configureFormatDescription')}</p>
          </div>
        ) : (
          <>
            <div className="relative mb-8 max-w-2xl mx-auto flex flex-col gap-4">
              <CardSearch
                query={search.query}
                onChange={search.onChange}
                suggestions={search.suggestions}
                onPick={search.addByName}
              />
              <ImportFeedback
                onOpen={importer.open}
                errors={importer.errors}
                onClearErrors={importer.clearErrors}
                result={importer.result}
                onClearResult={importer.clearResult}
              />
            </div>

            <ViewToolbar
              groupMode={groupMode}
              onGroupMode={setGroupMode}
              sortMode={sortMode}
              onSortMode={setSortMode}
              sortDir={sortDir}
              onToggleSortDir={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              viewMode={viewMode}
              onViewMode={setViewMode}
              showPrices={showPrices}
              onTogglePrices={() => setShowPrices((p) => !p)}
            />

            {viewMode === 'list' ? (
              <DeckList
                cards={view.mainDeckCards.concat(view.sideCards)}
                onUpdateQuantity={deck.changeQuantity}
                onRemove={deck.remove}
                onMoveToBoard={deck.move}
                maxSideboardSize={selectedFormat.config.maxSideboard}
                minMainDeckSize={isCommanderFormat ? undefined : selectedFormat.config.minMainDeck}
                isCommanderFormat={isCommanderFormat}
                onCardPreview={preview.previewDeckCard}
                onChooseImage={picker.open}
                hideToolbar={true}
                externalSortMode={sortMode}
                externalSortDir={sortDir}
                externalGroupMode={groupMode}
                externalShowPrices={showPrices}
              />
            ) : (
              <SpoilerView
                mainGroups={view.mainGroups}
                sideCards={sortCards(view.sideCards, sortMode, sortDir)}
                mainCount={view.mainCount}
                sideCount={view.sideCount}
                onQuantity={deck.changeQuantity}
                onRemove={deck.remove}
                onMove={deck.move}
              />
            )}

            {picker.isOpen && picker.target && (
              <ImagePickerModal
                isOpen={picker.isOpen}
                onClose={picker.close}
                cardId={picker.target.id}
                onSelect={picker.select}
              />
            )}

            <MaybeboardList
              cards={view.maybeCards}
              onQuantity={deck.changeQuantity}
              onMove={deck.move}
              onRemove={deck.remove}
            />

            <DeckStats cards={deck.cards} />

            {saver.deckScores && (
              <DeckProfileChart
                scores={saver.deckScores}
                containerClassName="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4"
              />
            )}
          </>
        )}
      </div>

      {/* Sentinel – floats bar until this element scrolls into view */}
      <div ref={sentinelRef} />
      <FloatingTotalsBar
        isFloating={isFloating}
        isCommanderFormat={isCommanderFormat}
        totalCount={view.totalCount}
        mainCount={view.mainCount}
        sideCount={view.sideCount}
        totalPrice={view.totalPrice}
        isDeckValid={isDeckValid}
        isSaving={saver.isSaving}
        isEditing={!!deckId}
        onSave={saver.save}
      />

      <ImportModal
        isOpen={importer.isOpen}
        onClose={importer.close}
        text={importer.text}
        onText={importer.setText}
        onImport={importer.runImport}
      />

      <AnalysisModal
        isOpen={analysis.isModalOpen}
        onClose={analysis.closeModal}
        result={analysis.result}
        onPreviewCard={preview.previewSuggestion}
      />

      <CardPreviewModal
        isOpen={preview.isOpen}
        onClose={preview.close}
        image={preview.image}
        cardName={preview.cardName}
        isFetching={preview.isFetching}
        onAdd={preview.addSuggestion}
      />
    </div>
  );
};

export default DeckBuilder;
