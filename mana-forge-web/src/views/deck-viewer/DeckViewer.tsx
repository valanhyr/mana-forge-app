import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUp, ArrowDown, Layers, User, Loader2, Shield, ThumbsUp, Copy, Check, Files } from "lucide-react";
import { DeckService, type DeckView, type DeckCardEntry } from "../../services/DeckService";
import { useUser } from "../../services/UserContext";
import ManaCost from "../../components/ui/ManaCost";
import ManaCurve from "../../components/ui/ManaCurve";
import { useLanguage } from "../../services/LanguageContext";
import { useTranslation } from "../../hooks/useTranslation";

type GroupMode = "type" | "none";
type SortMode = "cmc" | "alpha";
type SortDir = "asc" | "desc";

const sortCards = (cards: DeckCardEntry[], mode: SortMode, dir: SortDir) => {
  const mul = dir === "asc" ? 1 : -1;
  const sorted = [...cards];
  if (mode === "alpha") return sorted.sort((a, b) => mul * (a.name ?? "").localeCompare(b.name ?? ""));
  return sorted.sort((a, b) => mul * ((a.cmc ?? 0) - (b.cmc ?? 0)));
};

const groupByType = (cards: DeckCardEntry[]) => {
  const groups: Record<string, DeckCardEntry[]> = {};
  for (const card of cards) {
    // Check for commander
    if ((card as any).category === "commander") {
      if (!groups["Commander"]) groups["Commander"] = [];
      groups["Commander"].push(card);
      continue;
    }

    const typeLine = card.typeLine || "";
    const mainType = typeLine.split("—")[0];
    
    let type = "Other";
    if (mainType.includes("Creature")) type = "Creature";
    else if (mainType.includes("Planeswalker")) type = "Planeswalker";
    else if (mainType.includes("Battle")) type = "Battle";
    else if (mainType.includes("Instant")) type = "Instant";
    else if (mainType.includes("Sorcery")) type = "Sorcery";
    else if (mainType.includes("Enchantment")) type = "Enchantment";
    else if (mainType.includes("Artifact")) type = "Artifact";
    else if (mainType.includes("Land")) type = "Land";

    if (!groups[type]) groups[type] = [];
    groups[type].push(card);
  }
  return groups;
};

const TYPE_ORDER = ["Commander", "Planeswalker", "Creature", "Battle", "Instant", "Sorcery", "Enchantment", "Artifact", "Land", "Other"];

const DeckViewer = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const [deck, setDeck] = useState<DeckView | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<DeckCardEntry | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("cmc");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupMode, setGroupMode] = useState<GroupMode>("type");
  const [viewMode, setViewMode] = useState<"list" | "spoiler">("list");
  const { locale } = useLanguage();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useUser();
  const [liking, setLiking] = useState(false);
  const navigate = useNavigate();
  const [cloning, setCloning] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!deckId) { setLoading(false); return; }
    DeckService.getDeckView(deckId).then((data) => {
      setDeck(data);
      if (data?.mainDeck?.length) setHoveredCard(data.mainDeck[0]);
      setLoading(false);
    });
  }, [deckId, locale]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-4">{t("deckViewer.notFound")}</h2>
        <Link to="/" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors">
          <ArrowLeft size={20} /> {t("common.back")}
        </Link>
      </div>
    );
  }

  const typeGroups = groupByType(deck.mainDeck);
  const mainGroups: Record<string, DeckCardEntry[]> =
    groupMode === "type"
      ? Object.fromEntries(
          Object.entries(typeGroups).map(([type, cards]) => [type, sortCards(cards, sortMode, sortDir)])
        )
      : { All: sortCards(deck.mainDeck, sortMode, sortDir) };
  const mainTotal = deck.mainDeck.reduce((s, c) => s + c.quantity, 0);
  const sideTotal = deck.sideboard.reduce((s, c) => s + c.quantity, 0);

  const GROUP_OPTIONS: { value: GroupMode; label: string }[] = [
    { value: "type", label: t("deckViewer.groupType") },
    { value: "none", label: t("deckViewer.groupNone") },
  ];
  const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: "cmc",   label: t("deckViewer.sortCmc") },
    { value: "alpha", label: t("deckViewer.sortAlpha") },
  ];

  const handleLikeToggle = async () => {
    if (!deck || !isAuthenticated || liking) return;
    setLiking(true);
    try {
      const data = deck.likedByMe 
      ? await DeckService.unlikeDeck(deck.id)
      : await DeckService.likeDeck(deck.id);
      
      setDeck({
        ...deck,
        likesCount: data.likesCount,
        likedByMe: data.likedByMe
      });
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLiking(false);
    }
  };

  const handleCopyList = () => {
    if (!deck) return;
    const list = [
      ...deck.mainDeck.map(c => `${c.quantity} ${c.name}`),
      ...(deck.sideboard.length > 0 ? ["", "Sideboard", ...deck.sideboard.map(c => `${c.quantity} ${c.name}`)] : [])
    ].join("\n");
    
    navigator.clipboard.writeText(list).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloneDeck = async () => {
    if (!deck || !isAuthenticated || cloning) return;
    setCloning(true);
    try {
      const cloned = await DeckService.cloneDeck(deck.id);
      navigate(`/deck-builder/${cloned.id}`);
    } catch (error) {
      console.error("Error cloning deck:", error);
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors text-sm w-fit">
            <ArrowLeft size={16} /> {t("common.back")}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{deck.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-zinc-400">
                <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md">
                  {deck.formatName}
                </span>
                {deck.ownerUsername && (
                  <span className="flex items-center gap-1">
                    <User size={13} /> {deck.ownerUsername}
                  </span>
                )}
                <div className="w-px h-3 bg-zinc-700 mx-1 hidden sm:block" />
                <button
                  onClick={handleLikeToggle}
                  disabled={!isAuthenticated || liking}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                    deck.likedByMe
                      ? "bg-orange-500/20 text-orange-500 border border-orange-500/30"
                      : isAuthenticated
                      ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-300"
                      : "bg-zinc-800/50 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                  }`}
                  title={!isAuthenticated ? t("common.loginToLike" as any) || "Inicia sesión para dar like" : ""}
                >
                  <ThumbsUp size={14} className={deck.likedByMe ? "fill-orange-500" : ""} />
                  {deck.likesCount || 0}
                </button>

                {user?.username === deck.ownerUsername && (
                  <>
                    <div className="w-px h-3 bg-zinc-700 mx-1 hidden sm:block" />
                    <Link
                      to={`/deck-builder/${deck.id}`}
                      className="flex items-center gap-1.5 px-3 py-1 bg-orange-600 border border-orange-500 rounded-full text-xs font-bold text-white hover:bg-orange-500 transition-all shrink-0"
                    >
                      <Layers size={14} />
                      {t("common.edit")}
                    </Link>
                  </>
                )}

                <div className="w-px h-3 bg-zinc-700 mx-1 hidden sm:block" />
                
                <button
                  onClick={handleCopyList}
                  className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-bold text-zinc-400 hover:border-zinc-500 hover:text-white transition-all shrink-0"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? t("common.copied") : t("common.copy")}
                </button>

                {isAuthenticated && (
                  <button
                    onClick={handleCloneDeck}
                    disabled={cloning}
                    className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs font-bold text-zinc-400 hover:border-zinc-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {cloning ? <Loader2 size={14} className="animate-spin" /> : <Files size={14} />}
                    {cloning ? t("common.cloning") : t("common.clone")}
                  </button>
                )}
              </div>
            </div>

            {/* Color pips */}
            {deck.colors && deck.colors.length > 0 && (
              <div className="flex gap-0.5 items-center">
                <ManaCost cost={deck.colors.map(c => `{${c}}`).join("")} size={22} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Card preview (sticky) - Only in list mode */}
          {viewMode === "list" && (
            <div className="hidden lg:flex flex-col items-center gap-4 sticky top-8 self-start">
              {hoveredCard?.imageUris?.normal ? (
                <img
                  src={hoveredCard.imageUris.normal}
                  alt={hoveredCard.name}
                  className="rounded-xl shadow-2xl w-64 transition-all duration-200"
                />
              ) : (
                <div className="w-64 h-[357px] rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-600">
                  <Layers size={48} />
                </div>
              )}
              {hoveredCard && (
                <div className="text-center">
                  <p className="text-white font-semibold">{hoveredCard.name}</p>
                  <p className="text-zinc-400 text-sm">{hoveredCard.typeLine}</p>
                  <p className="text-zinc-500 text-sm"><ManaCost cost={hoveredCard.manaCost} size={16} /></p>
                </div>
              )}
            </div>
          )}

          {/* Card content */}
          <div className={viewMode === "list" ? "lg:col-span-2 space-y-8" : "lg:col-span-3 space-y-8"}>
            {/* Sort/Group bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                <span className="text-zinc-600 text-xs px-2">{t("deckViewer.group")}</span>
                {GROUP_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGroupMode(opt.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      groupMode === opt.value
                        ? "bg-orange-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                <span className="text-zinc-600 text-xs px-2">{t("deckViewer.sort")}</span>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortMode(opt.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      sortMode === opt.value
                        ? "bg-orange-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="w-px h-4 bg-zinc-700 mx-1" />
                <button
                  onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title={sortDir === "asc" ? t("deckViewer.sortAsc") : t("deckViewer.sortDesc")}
                >
                  {sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                </button>
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg ml-auto sm:ml-0">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-orange-500 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {t("deckViewer.viewList")}
                </button>
                <button
                  onClick={() => setViewMode("spoiler")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "spoiler"
                      ? "bg-orange-500 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {t("deckViewer.viewSpoiler")}
                </button>
              </div>
            </div>

            {viewMode === "list" ? (
              <>
                {/* Main deck */}
                <div>
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Layers size={18} className="text-orange-500" />
                    {t("common.mainDeck")}
                    <span className="text-zinc-500 font-normal text-sm">({mainTotal})</span>
                  </h2>

                  <div className="columns-1 sm:columns-2 gap-6">
                    {TYPE_ORDER.filter(t => mainGroups[t]).concat(mainGroups["All"] ? ["All"] : []).map(type => (
                      <div key={type} className="break-inside-avoid mb-6">
                        {type !== "All" && (
                          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-2 pb-1 border-b border-zinc-800">
                            <span className="text-orange-500">{t(`deckViewer.cardTypes.${type}` as any) || type}</span>
                            <span className="text-zinc-600 font-normal ml-2 text-xs">({mainGroups[type].reduce((s, c) => s + c.quantity, 0)})</span>
                          </h3>
                        )}
                        <ul className="space-y-1">
                          {mainGroups[type].map((card, i) => (
                            <li
                              key={i}
                              onMouseEnter={() => setHoveredCard(card)}
                              className="flex justify-between items-center px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default group"
                            >
                              <span className="text-zinc-300 group-hover:text-white text-sm transition-colors flex items-center gap-1">
                                {card.name ?? card.scryfallId}
                                {card.isGameChanger && (
                                  <span title={t("common.gameChangerTooltip")} className="cursor-help inline-flex items-center justify-center bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/30">
                                    GC
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1 ml-2 shrink-0">
                                <ManaCost cost={card.manaCost} size={13} />
                                <span className="text-zinc-500 text-sm font-mono">×{card.quantity}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sideboard */}
                {deck.sideboard.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Shield size={18} className="text-zinc-500" />
                      {t("common.sideboard")}
                      <span className="text-zinc-500 font-normal text-sm">({sideTotal})</span>
                    </h2>
                    <ul className="space-y-1">
                      {deck.sideboard.map((card, i) => (
                        <li
                          key={i}
                          onMouseEnter={() => setHoveredCard(card)}
                          className="flex justify-between items-center px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-default group"
                        >
                          <span className="text-zinc-300 group-hover:text-white text-sm transition-colors flex items-center gap-1">
                            {card.name ?? card.scryfallId}
                            {card.isGameChanger && (
                              <span title={t("common.gameChangerTooltip")} className="cursor-help inline-flex items-center justify-center bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/30">
                                GC
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1 ml-2 shrink-0">
                            <ManaCost cost={card.manaCost} size={13} />
                            <span className="text-zinc-500 text-sm font-mono">×{card.quantity}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-12">
                {/* Spoiler Mode: Main Deck */}
                <div>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
                    <Layers size={22} className="text-orange-500" />
                    {t("common.mainDeck")}
                    <span className="text-zinc-500 font-normal text-sm">({mainTotal})</span>
                  </h2>
                  
                  {TYPE_ORDER.filter(t => mainGroups[t]).concat(mainGroups["All"] ? ["All"] : []).map(type => (
                    <div key={type} className={type !== "All" ? "mb-8" : ""}>
                      {type !== "All" && (
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 pb-1 border-b border-zinc-800">
                          <span className="text-orange-500">{t(`deckViewer.cardTypes.${type}` as any) || type}</span>
                          <span className="text-zinc-600 font-normal ml-2 text-xs">({mainGroups[type].reduce((s, c) => s + c.quantity, 0)})</span>
                        </h3>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {mainGroups[type].map((card, i) => (
                          <div key={i} className="group relative">
                            {card.imageUris?.normal ? (
                              <img
                                src={card.imageUris.normal}
                                alt={card.name}
                                className={`rounded-lg shadow-lg w-full transition-transform group-hover:scale-105 group-hover:z-10 ${card.isGameChanger ? 'ring-2 ring-orange-500 shadow-orange-500/30' : ''}`}
                              />
                            ) : (
                              <div className="aspect-[2.5/3.5] rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center p-4 text-center">
                                <Layers size={32} className="text-zinc-700 mb-2" />
                                <span className="text-xs text-zinc-500 font-medium">{card.name}</span>
                              </div>
                            )}
                            <div className="absolute top-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              ×{card.quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Spoiler Mode: Sideboard */}
                {deck.sideboard.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
                      <Shield size={22} className="text-zinc-500" />
                      {t("common.sideboard")}
                      <span className="text-zinc-500 font-normal text-sm">({sideTotal})</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 font-mono">
                      {sortCards(deck.sideboard, sortMode, sortDir).map((card, i) => (
                        <div key={i} className="group relative">
                          {card.imageUris?.normal ? (
                            <img
                              src={card.imageUris.normal}
                              alt={card.name}
                              className={`rounded-lg shadow-lg w-full transition-transform group-hover:scale-105 group-hover:z-10 ${card.isGameChanger ? 'ring-2 ring-orange-500 shadow-orange-500/30' : ''}`}
                            />
                          ) : (
                            <div className="aspect-[2.5/3.5] rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center p-4 text-center">
                              <Shield size={32} className="text-zinc-700 mb-2" />
                              <span className="text-xs text-zinc-500 font-medium">{card.name}</span>
                            </div>
                          )}
                          <div className="absolute top-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            ×{card.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mana curve + summary */}
            <div className="flex flex-col sm:flex-row gap-4 items-stretch">
              <div className="flex-1">
                <ManaCurve cards={deck.mainDeck} className="h-full" />
              </div>
              <div className="sm:w-48 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                  {t("deckViewer.summary")}
                </p>
                <ul className="space-y-1.5">
                  {TYPE_ORDER
                    .filter(type => typeGroups[type]?.length)
                    .map(type => {
                      const count = typeGroups[type].reduce((s, c) => s + c.quantity, 0);
                      return (
                        <li key={type} className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">{t(`deckViewer.cardTypes.${type}` as any) || type}</span>
                          <span className="text-white font-mono font-semibold">{count}</span>
                        </li>
                      );
                    })}
                  <li className="flex justify-between items-center text-sm pt-2 mt-1 border-t border-zinc-800">
                    <span className="text-zinc-500 font-semibold">Total</span>
                    <span className="text-orange-500 font-mono font-bold">{mainTotal}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckViewer;
