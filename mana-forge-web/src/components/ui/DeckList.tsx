import { useMemo, useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Trash2,
  Plus,
  Minus,
  MoreVertical,
  ArrowRightLeft,
  Crown,
  Layers,
  ArrowUp,
  ArrowDown,
  Lightbulb,
  Euro,
  Camera,
} from "lucide-react";
import { ManaSymbolService } from "../../services/ManaSymbolService";
import { useTranslation } from "../../hooks/useTranslation";

type SortMode = "cmc" | "alpha";
type SortDir = "asc" | "desc";
type GroupMode = "type" | "none";

export interface DeckCard {
  id: string;
  name: string;
  quantity: number;
  manaCost?: string;
  cmc?: number;
  type: string;
  price?: number;
  inCollection?: boolean;
  isValid?: boolean;
  board?: "main" | "side" | "commander" | "maybe";
  isGameChanger?: boolean;
  image?: string;
}

interface DeckListProps {
  cards: DeckCard[];
  onCardClick?: (id: string) => void;
  onUpdateQuantity?: (card: DeckCard, delta: number) => void;
  onRemove?: (card: DeckCard) => void;
  onMoveToBoard?: (
    card: DeckCard,
    board: "main" | "side" | "commander" | "maybe"
  ) => void;
  maxSideboardSize?: number;
  minMainDeckSize?: number;
  isCommanderFormat?: boolean;
  onCardPreview?: (cardName: string) => void;
  hideToolbar?: boolean;
  externalSortMode?: SortMode;
  externalSortDir?: SortDir;
  externalGroupMode?: GroupMode;
  externalShowPrices?: boolean;
}

const ManaCost = ({
  cost,
  symbols,
}: {
  cost?: string;
  symbols: Record<string, string>;
}) => {
  if (!cost) return null;
  const symbolsList = cost.match(/\{([^}]+)\}/g) || [];
  return (
    <div className="flex gap-0.5 items-center">
      {symbolsList.map((sym, idx) => {
        const svgUri = symbols[sym];
        return svgUri ? (
          <img key={idx} src={svgUri} alt={sym} className="w-3.5 h-3.5 rounded-full" loading="lazy" />
        ) : (
          <span key={idx} className="text-xs text-zinc-500 font-mono">{sym}</span>
        );
      })}
    </div>
  );
};

const TYPE_ORDER = ["Planeswalker", "Creature", "Battle", "Instant", "Sorcery", "Enchantment", "Artifact", "Land", "Unknown", "Other"];

const DeckList: React.FC<DeckListProps> = ({
  cards,
  onCardClick,
  onUpdateQuantity,
  onRemove,
  onMoveToBoard,
  maxSideboardSize,
  minMainDeckSize,
  isCommanderFormat = false,
  onCardPreview,
  hideToolbar = false,
  externalSortMode,
  externalSortDir,
  externalGroupMode,
  externalShowPrices,
}) => {
  const { t } = useTranslation();
  const [hoveredCard, setHoveredCard] = useState<DeckCard | null>(null);
  const [activeCard, setActiveCard] = useState<DeckCard | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [manaSymbols, setManaSymbols] = useState<Record<string, string>>({});
  const [sortMode, setSortMode] = useState<SortMode>("cmc");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupMode, setGroupMode] = useState<GroupMode>("type");
  const [showPrices, setShowPrices] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeSortMode = externalSortMode !== undefined ? externalSortMode : sortMode;
  const activeSortDir = externalSortDir !== undefined ? externalSortDir : sortDir;
  const activeGroupMode = externalGroupMode !== undefined ? externalGroupMode : groupMode;
  const activeShowPrices = externalShowPrices !== undefined ? externalShowPrices : showPrices;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setActiveCard(null);
    };
    const handleScroll = () => setActiveCard(null);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  useEffect(() => {
    ManaSymbolService.getAll().then(setManaSymbols);
  }, []);

  // Set initial hovered card when cards load
  useEffect(() => {
    if (cards.length > 0 && !hoveredCard) setHoveredCard(cards[0]);
  }, [cards]);

  const groupedAndSortedCards = useMemo(() => {
    const boardOrder: Array<"commander" | "main" | "side"> = ["commander", "main", "side"];

    const sortFn = (a: DeckCard, b: DeckCard) => {
      const mul = activeSortDir === "asc" ? 1 : -1;
      if (activeSortMode === "alpha") return mul * a.name.localeCompare(b.name);
      return mul * ((a.cmc ?? 0) - (b.cmc ?? 0));
    };

    const grouped: Record<string, Record<string, DeckCard[]>> = {};
    cards.forEach((card) => {
      const board = card.board || "main";
      const rawType = card.type || "Unknown";
      const type = activeGroupMode === "type"
        ? (TYPE_ORDER.find((t) => rawType.includes(t)) ?? "Other")
        : "All";
      if (!grouped[board]) grouped[board] = {};
      if (!grouped[board][type]) grouped[board][type] = [];
      grouped[board][type].push(card);
    });

    return boardOrder
      .filter((b) => grouped[b])
      .map((board) => ({
        boardName: board,
        types: (activeGroupMode === "type" ? TYPE_ORDER : ["All"])
          .filter((t) => grouped[board]?.[t])
          .map((type) => ({
            typeName: type,
            cards: [...grouped[board][type]].sort(sortFn),
          })),
      }));
  }, [cards, activeSortMode, activeSortDir, activeGroupMode]);

  const renderCardRow = (card: DeckCard) => (
    <li
      key={`${card.id}-${card.board}`}
      onMouseEnter={() => setHoveredCard(card)}
      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors group cursor-default"
    >
      {/* Left: quantity + name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onUpdateQuantity && (
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onUpdateQuantity(card, 1)} className="text-zinc-500 hover:text-orange-500 p-0.5 leading-none">
              <Plus size={9} />
            </button>
            <button onClick={() => onUpdateQuantity(card, -1)} className="text-zinc-500 hover:text-orange-500 p-0.5 leading-none">
            </button>
          </div>
        )}
        <span className="text-zinc-400 font-mono text-xs font-bold w-5 text-center shrink-0">
          {card.quantity}
        </span>
        {onCardPreview && (
          <button 
            onClick={(e) => { e.stopPropagation(); onCardPreview(card.name); }}
            className="lg:hidden p-1 text-zinc-500 hover:text-orange-500 transition-colors shrink-0"
            title={t("deckViewer.previewCard" as any) || "Preview Card"}
          >
            <Camera size={16} />
          </button>
        )}
        <button
          onClick={() => onCardClick && onCardClick(card.id)}
          className={`text-sm truncate text-left transition-colors flex items-center gap-1 ${
            card.isValid === false
              ? "text-red-400 hover:text-red-300"
              : "text-zinc-300 group-hover:text-white hover:underline"
          }`}
        >
          {card.name}
          {card.isGameChanger && (
            <span title={t("common.gameChangerTooltip")} className="cursor-help inline-flex items-center justify-center bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/30 no-underline">
              GC
            </span>
          )}
        </button>
        {card.isValid === false && (
          <AlertTriangle size={11} className="text-red-500 shrink-0" />
        )}
      </div>

      {/* Right: mana cost + context menu */}
      <div className="flex items-center gap-3">
        {activeShowPrices && (
          <span className="text-zinc-500 text-xs font-mono w-12 text-right">
            {((card.price ?? 0) * card.quantity).toFixed(2)} €
          </span>
        )}
        <div className="w-24 shrink-0 flex justify-end">
          <ManaCost cost={card.manaCost} symbols={manaSymbols} />
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 5, left: rect.right - 192 });
              setActiveCard(
                activeCard?.id === card.id && activeCard?.board === card.board ? null : card
              );
            }}
            className={`text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-700 transition-colors cursor-pointer ${
              activeCard?.id === card.id && activeCard?.board === card.board
                ? "opacity-100 text-white bg-zinc-700"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>
    </li>
  );

  return (
    <div className="space-y-4" ref={menuRef}>
      {/* Sort / Group bar */}
      {!hideToolbar && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          <span className="text-zinc-600 text-xs px-2">{t("deckViewer.group")}</span>
          {(["type", "none"] as GroupMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setGroupMode(mode)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                groupMode === mode
                  ? "bg-orange-500 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {mode === "type" ? t("deckViewer.groupType") : t("deckViewer.groupNone")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          <span className="text-zinc-600 text-xs px-2">{t("deckViewer.sort")}</span>
          {(["cmc", "alpha"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                sortMode === mode
                  ? "bg-orange-500 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {mode === "cmc" ? t("deckViewer.sortCmc") : t("deckViewer.sortAlpha")}
            </button>
          ))}
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={sortDir === "asc" ? t("deckViewer.sortAsc") : t("deckViewer.sortDesc")}
          >
            {sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          </button>
        </div>

        {/* Price toggle */}
        <button
          onClick={() => setShowPrices(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showPrices
              ? "bg-green-500/20 text-green-400 border-green-500/40"
              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600"
          }`}
        >
          <Euro size={13} />
          {showPrices ? t("deckViewer.hidePrices") : t("deckViewer.showPrices")}
        </button>
      </div>
      )}

      {/* List */}
      <div className="flex gap-6">
      {/* Sticky card preview */}
      <div className="hidden lg:flex flex-col items-center gap-3 sticky top-8 self-start w-52 shrink-0">
        {hoveredCard?.image ? (
          <img
            src={hoveredCard.image}
            alt={hoveredCard.name}
            className="rounded-xl shadow-2xl w-full transition-all duration-200"
          />
        ) : (
          <div className="w-full h-72 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-600">
            <Layers size={40} />
          </div>
        )}
        {hoveredCard && (
          <div className="text-center px-2">
            <p className="text-white text-sm font-semibold leading-tight">{hoveredCard.name}</p>
            <p className="text-zinc-400 text-xs mt-0.5">{hoveredCard.type}</p>
            {hoveredCard.manaCost && (
              <div className="flex justify-center mt-1">
                <ManaCost cost={hoveredCard.manaCost} symbols={manaSymbols} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card lists */}
      <div className="flex-1 min-w-0 space-y-8">
        {groupedAndSortedCards.map(({ boardName, types }) => {
          const totalBoardCards = types.reduce(
            (acc, t) => acc + t.cards.reduce((a, c) => a + c.quantity, 0),
            0
          );
          const isMainDeck = boardName === "main";
          const isSideboard = boardName === "side";
          const isCommander = boardName === "commander";

          const showMainDeckWarning =
            isMainDeck &&
            minMainDeckSize !== undefined &&
            totalBoardCards > 0 &&
            totalBoardCards < minMainDeckSize;

          const showSideboardWarning =
            isSideboard &&
            maxSideboardSize !== undefined &&
            totalBoardCards > maxSideboardSize;

          if (isCommanderFormat && isSideboard && totalBoardCards === 0)
            return null;

          return (
            <div key={boardName}>
              {/* Board header */}
              <div
                className={`flex items-center gap-2 mb-4 ${
                  isSideboard || isCommander
                    ? "mt-2 pt-4 border-t border-dashed border-zinc-700"
                    : ""
                }`}
              >
                <h3 className="text-lg font-bold text-orange-500">
                  {isCommander && t("deckList.commander")}
                  {isMainDeck && t("common.mainDeck")}
                  {isSideboard && t("common.sideboard")}
                </h3>
                <span className="text-zinc-400 font-mono">({totalBoardCards})</span>
                {showPrices && (() => {
                  const boardPrice = types.reduce((sum, { cards: gc }) =>
                    sum + gc.reduce((s, c) => s + (c.price ?? 0) * c.quantity, 0), 0);
                  return boardPrice > 0 ? (
                    <span className="ml-auto flex items-center gap-1 text-xs text-green-400 font-mono">
                      <Euro size={12} /> {boardPrice.toFixed(2)} €
                    </span>
                  ) : null;
                })()}
                {showMainDeckWarning && (
                  <div title={t("deckList.minCardsWarning", { count: minMainDeckSize || 0 })} className="text-red-500 animate-pulse">
                    <AlertTriangle size={18} />
                  </div>
                )}
                {showSideboardWarning && (
                  <div title={t("deckList.maxCardsWarning", { count: maxSideboardSize || 0 })} className="text-red-500 animate-pulse">
                    <AlertTriangle size={18} />
                  </div>
                )}
              </div>

              {/* 2-column type groups */}
              <div className="columns-1 sm:columns-2 gap-6">
                {types.map(({ typeName, cards: groupCards }) => {
                  const typeTotal = groupCards.reduce((a, c) => a + c.quantity, 0);
                  return (
                    <div key={typeName} className="break-inside-avoid mb-5">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 pb-1 border-b border-zinc-800 flex justify-between">
                        <span className="text-orange-500">{t(`deckViewer.cardTypes.${typeName}` as any) || typeName}</span>
                        <span className="text-zinc-600 font-normal">{typeTotal}</span>
                      </h4>
                      <ul className="space-y-0.5">
                        {groupCards.map((card) => renderCardRow(card))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating context menu */}
      {activeCard && (
        <div
          className="fixed w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {onUpdateQuantity && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(activeCard, 1); }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
              >
                <Plus size={14} /> {t("deckList.addOne")}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdateQuantity(activeCard, -1); }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
              >
                <Minus size={14} /> {t("deckList.removeOne")}
              </button>
            </>
          )}
          {onMoveToBoard && (
            <>
              {isCommanderFormat && activeCard.board !== "commander" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveToBoard(activeCard, "commander"); setActiveCard(null); }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
                >
                  <Crown size={14} /> {t("deckList.makeCommander")}
                </button>
              )}
              {activeCard.board !== "main" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveToBoard(activeCard, "main"); setActiveCard(null); }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
                >
                  <ArrowRightLeft size={14} /> {t("deckList.moveToMain")}
                </button>
              )}
              {activeCard.board !== "side" && !isCommanderFormat && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveToBoard(activeCard, "side"); setActiveCard(null); }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
                >
                  <ArrowRightLeft size={14} /> {t("deckList.moveToSideboard")}
                </button>
              )}
              {activeCard.board !== "maybe" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMoveToBoard(activeCard, "maybe"); setActiveCard(null); }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
                >
                  <Lightbulb size={14} /> {t("deckList.moveToMaybeboard")}
                </button>
              )}
            </>
          )}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(activeCard); setActiveCard(null); }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 border-t border-zinc-800"
            >
              <Trash2 size={14} /> {t("common.delete")}
            </button>
          )}
        </div>
      )}
    </div>
    </div>
  );
};

export default DeckList;
