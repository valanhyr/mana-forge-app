import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, ArrowUpDown, Loader2, Sparkles } from 'lucide-react';
import { DeckService, type DeckSearchResult } from '../../services/DeckService';
import { FormatService } from '../../services/FormatService';
import { ScryfallService } from '../../services/ScryfallService';
import { type Format } from '../../core/models/Format';
import DeckCard from '../../components/ui/DeckCard';
import { useTranslation } from '../../hooks/useTranslation';
import SEO from '../../components/ui/SEO';

type SortOption = 'recent' | 'popular' | 'nameAZ';

const DeckExplorer = () => {
  const { t, locale } = useTranslation();
  const [decks, setDecks] = useState<DeckSearchResult[]>([]);
  const [formats, setFormats] = useState<Format[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  useEffect(() => {
    FormatService.getActiveFormats().then(setFormats);
  }, []);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    try {
      const results = await DeckService.searchDecks({
        name: searchName || undefined,
        formatId: selectedFormat || undefined,
      });

      // Populate card art for each result
      const decksWithArt = await Promise.all(
        results.map(async (deck) => {
          if (deck.featuredScryfallId) {
            try {
              const card = await ScryfallService.getCardById(deck.featuredScryfallId);
              return { ...deck, cardArtUrl: card?.image_uris?.art_crop };
            } catch {
              return deck;
            }
          }
          return deck;
        })
      );

      setDecks(decksWithArt);
    } catch (error) {
      console.error('Error searching decks:', error);
    } finally {
      setLoading(false);
    }
  }, [searchName, selectedFormat]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDecks();
    }, 300); // Debounce
    return () => clearTimeout(timer);
  }, [fetchDecks]);

  const sortedDecks = useMemo(() => {
    const sorted = [...decks];
    if (sortBy === 'popular')
      return sorted.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0));
    if (sortBy === 'nameAZ') return sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted; // "recent" keeps API order
  }, [decks, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title={t('seo.explorerTitle')} description={t('seo.explorerDescription')} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <Sparkles className="text-orange-500" size={32} />
            {t('nav.explorer') || 'Explorar Mazos'}
          </h1>
          <p className="text-zinc-400 mt-2">
            {t('friends.explorerSubtitle') || 'Descubre las mejores estrategias de la comunidad'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative group flex-1 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              placeholder={t('common.search' as any) || 'Buscar por nombre...'}
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500/50 transition-all"
            />
          </div>

          {/* Format Selector */}
          <div className="relative group sm:w-48">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
              size={16}
            />
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white appearance-none focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
            >
              <option value="">{t('deckBuilder.allFormats')}</option>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {typeof f.name === 'string' ? f.name : f.name[locale] || f.name['en'] || f.id}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="relative group sm:w-48">
            <ArrowUpDown
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors"
              size={16}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-white appearance-none focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer"
            >
              <option value="recent">{t('explorer.sortRecent')}</option>
              <option value="popular">{t('explorer.sortPopular')}</option>
              <option value="nameAZ">{t('explorer.sortNameAZ')}</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
          <p className="text-zinc-500 animate-pulse">Buscando mazos...</p>
        </div>
      ) : decks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
          <Search size={48} className="text-zinc-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{t('explorer.noDecks')}</h3>
          <p className="text-zinc-500">Prueba con otros términos de búsqueda o filtros</p>
          {(searchName || selectedFormat) && (
            <button
              onClick={() => {
                setSearchName('');
                setSelectedFormat('');
              }}
              className="mt-6 text-orange-500 hover:text-orange-400 font-medium transition-colors"
            >
              {t('explorer.clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DeckExplorer;
