import { ArrowDown, ArrowUp, Euro } from 'lucide-react';
import type { SortDir, SortMode } from '../../utils/deck/cardTypes';
import type { GroupMode } from '../../utils/deck/deckView';
import { useTranslation } from '../../hooks/useTranslation';

export type ViewMode = 'list' | 'spoiler';

interface ViewToolbarProps {
  groupMode: GroupMode;
  onGroupMode: (mode: GroupMode) => void;
  sortMode: SortMode;
  onSortMode: (mode: SortMode) => void;
  sortDir: SortDir;
  onToggleSortDir: () => void;
  viewMode: ViewMode;
  onViewMode: (mode: ViewMode) => void;
  showPrices: boolean;
  onTogglePrices: () => void;
}

const segment = (active: boolean) =>
  `px-3 py-1 rounded-md text-xs font-medium transition-colors ${
    active ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
  }`;

const ViewToolbar = ({
  groupMode,
  onGroupMode,
  sortMode,
  onSortMode,
  sortDir,
  onToggleSortDir,
  viewMode,
  onViewMode,
  showPrices,
  onTogglePrices,
}: ViewToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 flex-wrap mt-6 mb-4">
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
        <span className="text-zinc-600 text-xs px-2">{t('deckViewer.group')}</span>
        {(['type', 'none'] as GroupMode[]).map((mode) => (
          <button key={mode} onClick={() => onGroupMode(mode)} className={segment(groupMode === mode)}>
            {mode === 'type' ? t('deckViewer.groupType') : t('deckViewer.groupNone')}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
        <span className="text-zinc-600 text-xs px-2">{t('deckViewer.sort')}</span>
        {(['cmc', 'alpha'] as SortMode[]).map((mode) => (
          <button key={mode} onClick={() => onSortMode(mode)} className={segment(sortMode === mode)}>
            {mode === 'cmc' ? t('deckViewer.sortCmc') : t('deckViewer.sortAlpha')}
          </button>
        ))}
        <div className="w-px h-4 bg-zinc-700 mx-1" />
        <button
          onClick={onToggleSortDir}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title={sortDir === 'asc' ? t('deckViewer.sortAsc') : t('deckViewer.sortDesc')}
        >
          {sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        </button>
      </div>

      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg ml-auto sm:ml-0">
        <button onClick={() => onViewMode('list')} className={segment(viewMode === 'list')}>
          {t('deckViewer.viewList')}
        </button>
        <button onClick={() => onViewMode('spoiler')} className={segment(viewMode === 'spoiler')}>
          {t('deckViewer.viewSpoiler')}
        </button>
      </div>

      <button
        onClick={onTogglePrices}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          showPrices
            ? 'bg-green-500/20 text-green-400 border-green-500/40'
            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600'
        }`}
      >
        <Euro size={13} />
        {showPrices ? t('deckViewer.hidePrices') : t('deckViewer.showPrices')}
      </button>
    </div>
  );
};

export default ViewToolbar;
