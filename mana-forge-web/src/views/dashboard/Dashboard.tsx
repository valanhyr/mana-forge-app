import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  ServerCrash,
  X,
  Layers,
  BookOpen,
  ThumbsUp,
  Camera,
  Star,
} from "lucide-react";
import { DeckService, type DailyDeck, type FeaturedDeck } from "../../services/DeckService";
import { ScryfallService } from "../../services/ScryfallService";
import ForgeSpinner from "../../components/ui/ForgeSpinner";
import { FormatService } from "../../services/FormatService";
import { useTranslation } from "../../hooks/useTranslation";
import { ArticleService } from "../../services/ArticleService";
import { type Article } from "../../core/models/Article";
import ManaCost from "../../components/ui/ManaCost";
import Meta from "../../components/ui/Meta";
import { useUser } from "../../services/UserContext";
import { useToast } from "../../services/ToastContext";

// --- Mock Data ---

interface FormatSummary {
  mongoId: string;
  slug: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

const Dashboard = () => {
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useUser();
  const { showToast } = useToast();
  const [dailyDeck, setDailyDeck] = useState<DailyDeck | null>(null);
  const [featuredDeck, setFeaturedDeck] = useState<FeaturedDeck | null>(null);
  const [popularFormats, setPopularFormats] = useState<FormatSummary[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    const fetchDailyDeck = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Obtener los datos del mazo de la API
        const deckData = await DeckService.getDailyDeck(locale);

        // 2. Encontrar una carta representativa para la imagen (la primera que no sea tierra básica)
        const basicLandNames = [
          "plains",
          "island",
          "swamp",
          "mountain",
          "forest",
          "wastes",
        ];
        const featureCard = deckData.main_deck.find(
          (card: { name: string }) =>
            !basicLandNames.includes(card.name.toLowerCase())
        );

        // Imagen por defecto si algo falla
        let cardArtUrl =
          "https://cards.scryfall.io/art_crop/front/a/9/a9446d18-904f-4d4c-a1b6-5d7c2a3a55a8.jpg?1562925291";

        if (featureCard) {
          // 3. Obtener la imagen de la carta desde nuestro proxy de Scryfall
          const cardDetails = await ScryfallService.getCardByName(
            featureCard.name
          );
          if (cardDetails && cardDetails.image_uris) {
            cardArtUrl = cardDetails.image_uris.art_crop;
          }
        }

        // 4. Guardar el mazo y la URL de la imagen en el estado
        setDailyDeck({ ...deckData, cardArtUrl });
      } catch (err) {
        console.error("Error fetching daily AI deck:", err);
        setError(
          "No se pudo cargar el mazo del día. Inténtalo de nuevo más tarde."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyDeck();

    const fetchFeaturedDeck = async () => {
      const deck = await DeckService.getFeaturedDeck();
      if (deck && deck.featuredScryfallId) {
        const cardDetails = await ScryfallService.getCardById(deck.featuredScryfallId);
        const cardArtUrl = cardDetails?.image_uris?.art_crop ?? null;
        setFeaturedDeck({ ...deck, cardArtUrl });
      } else {
        setFeaturedDeck(deck);
      }
    };
    fetchFeaturedDeck();

    const fetchArticles= async () => {
      const fetchedArticles = await ArticleService.getLastArticles();
      setArticles(fetchedArticles);
    };
    fetchArticles();

    const fetchFormats = async () => {
      try {
        const result = await FormatService.getCMSAllFormats();
        if (Array.isArray(result)) {
          setPopularFormats(result as any);
        }
      } catch (error) {
        console.error("Error fetching formats:", error);
      }
    };
    fetchFormats();
  }, [locale]); // Recargar si cambia el idioma

  const handleMouseEnterCard = async (cardName: string) => {
    if (cachedImages[cardName]) {
      setPreviewImage(cachedImages[cardName]);
      return;
    }

    try {
      const cardDetails = await ScryfallService.getCardByName(cardName);
      if (cardDetails && cardDetails.image_uris) {
        const imageUrl = cardDetails.image_uris.normal;
        setCachedImages(prev => ({ ...prev, [cardName]: imageUrl }));
        setPreviewImage(imageUrl);
      }
    } catch (error) {
      console.error("Error fetching card image:", error);
    }
  };

  const handleOpenPreview = async (cardName: string) => {
    await handleMouseEnterCard(cardName);
    setIsPreviewModalOpen(true);
  };

  const handleRateDeck = async (e: React.MouseEvent, stars: number) => {
    e.preventDefault();
    e.stopPropagation(); // Avoid opening the modal if clicked from the card
    if (!dailyDeck || ratingLoading) return;

    if (!isAuthenticated) {
      showToast(t("common.loginToRate"), "info");
      return;
    }
    
    // Validate we are logged in (checking the existence of a likedby feature like in featuredDeck, although if API fails it handles it)
    try {
      setRatingLoading(true);
      // Optimistic visual update
      const previousRating = dailyDeck.userRating;
      const isRemoving = previousRating === stars;
      
      setDailyDeck(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          userRating: isRemoving ? undefined : stars,
        };
      });

      const updatedDeck = await DeckService.rateDailyDeck(dailyDeck.date, stars);
      setDailyDeck(prev => ({
        ...prev,
        ...updatedDeck,
        cardArtUrl: prev?.cardArtUrl // Keep the cached image UI url
      }));
    } catch (err) {
      console.error("Error rating deck:", err);
      // Revert in case of error (reload data or just show toast, here we just let it be)
    } finally {
      setRatingLoading(false);
    }
  };

  const renderAiDeckCard = () => {
    if (isLoading) {
      return (
        <div className="group relative flex items-center justify-center h-80 p-6 text-white bg-zinc-900 rounded-2xl border border-zinc-800">
          <div className="text-center">
            <ForgeSpinner className="mx-auto text-indigo-400" size={128} />
            <p className="mt-4 text-zinc-400">
              {t("dashboard.generatingDeck")}
            </p>
          </div>
        </div>
      );
    }

    if (error || !dailyDeck) {
      return (
        <div className="group relative flex items-center justify-center h-80 p-6 text-white bg-zinc-900 rounded-2xl border border-red-500/30">
          <div className="text-center">
            <ServerCrash className="mx-auto h-12 w-12 text-red-400" />
            <p className="mt-4 text-red-400">
              {error || t("common.unknownError")}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => setIsModalOpen(true)}
        className="group relative block overflow-hidden rounded-2xl shadow-lg cursor-pointer"
      >
        <div className="absolute inset-0 z-0">
          <img
            src={dailyDeck.cardArtUrl}
            alt={dailyDeck.deck_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        </div>
        <div className="relative z-10 flex flex-col justify-between h-80 p-6 text-white">
          <div className="flex justify-between items-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20 backdrop-blur-sm">
              <Sparkles size={14} /> {t("dashboard.aiDeckOfTheDay")}
            </span>
            
            {/* Star Rating System On Card */}
            <div 
              className="flex gap-1 bg-black/60 px-2 py-1 rounded-full border border-zinc-500/20 backdrop-blur-sm"
              onMouseLeave={() => setHoveredStar(0)}
              onClick={e => e.stopPropagation()}
            >
              {[1, 2, 3, 4, 5].map(star => {
                const currentRating = dailyDeck.userRating || 0;
                const averageRating = dailyDeck.averageRating || 0;
                // If we are hovering, show hovered state. Else show actual rating state.
                const isFilled = hoveredStar ? star <= hoveredStar : star <= currentRating;
                const isOrangeBorder = isFilled || (!hoveredStar && star <= Math.round(averageRating));
                
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={ratingLoading}
                    onMouseEnter={() => setHoveredStar(star)}
                    onClick={(e) => handleRateDeck(e, star)}
                    className="p-0.5 focus:outline-none transition-transform hover:scale-125 disabled:opacity-50"
                  >
                    <Star 
                      size={18} 
                      className={isFilled 
                        ? "text-orange-500 fill-orange-500 transition-colors duration-200"
                        : isOrangeBorder
                          ? "text-orange-500 fill-transparent transition-colors duration-200"
                          : "text-zinc-500 fill-transparent hover:text-orange-400 transition-colors duration-200"
                      } 
                    />
                  </button>
                );
              })}
              {dailyDeck.averageRating && dailyDeck.totalRatings && dailyDeck.totalRatings > 0 ? (
                <span className="ml-1 text-xs text-zinc-300 font-medium self-center px-1">
                  {dailyDeck.averageRating} ({dailyDeck.totalRatings})
                </span>
              ) : null}
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold">{dailyDeck.deck_name}</h3>
            <p className="text-sm text-zinc-300 mt-1">
              {dailyDeck.format_name} &middot; {dailyDeck.archetype}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 space-y-12 mb-12">
      <Meta 
        title={t("seo.dashboardTitle")} 
        description={t("seo.dashboardDescription")} 
      />
      {/* --- Sección de Noticias --- */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-6">
          {t("dashboard.newsTitle")}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {articles.map((item) => (
            <Link
              to={`/articles/${item.documentId}`}
              key={`${item.documentId}`}
              className="group relative block overflow-hidden rounded-2xl shadow-lg"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={`${item.imageUrl}`}
                  alt={`${item.title}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
              </div>
              <div className="relative z-10 flex flex-col justify-end h-64 p-6 text-white">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-zinc-300 mt-1">{item.subtitle}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-orange-500 font-semibold text-sm group-hover:underline">
                  {t("common.readMore")}
                  <ArrowRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* --- Sección Mazo del Día --- */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-6">
          {t("dashboard.featuredDecks")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mazo de la Comunidad */}
          {featuredDeck ? (
            <Link
              to={`/deck-viewer/${featuredDeck.id}`}
              className="group relative block overflow-hidden rounded-2xl shadow-lg"
            >
              <div className="absolute inset-0 z-0">
                {featuredDeck.cardArtUrl ? (
                  <img
                    src={featuredDeck.cardArtUrl}
                    alt={featuredDeck.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </div>
              <div className="relative z-10 flex flex-col justify-between h-80 p-6 text-white">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/20 backdrop-blur-sm">
                    <Zap size={14} /> {t("dashboard.deckOfTheDay")}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{featuredDeck.name}</h3>
                  <p className="text-sm text-zinc-300 mt-1">
                    {featuredDeck.formatName}
                    {featuredDeck.ownerUsername && (
                      <> &middot; <Users size={12} className="inline mb-0.5" /> {featuredDeck.ownerUsername}</>
                    )}
                    {featuredDeck.likesCount > 0 && (
                      <> &middot; <ThumbsUp size={12} className="inline mb-0.5" /> {featuredDeck.likesCount}</>
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center justify-center h-80 rounded-2xl bg-zinc-900 border border-zinc-800">
              <p className="text-zinc-500 text-sm">{t("dashboard.noFeaturedDeck")}</p>
            </div>
          )}

          {/* Mazo de IA */}
          {renderAiDeckCard()}
        </div>
      </section>

      {/* --- Sección Formatos Populares (Sugerencia) --- */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">
            {t("dashboard.exploreFormats")}
          </h2>
          <Link
            to="/formats/all-formats"
            className="text-sm font-medium text-orange-500 hover:underline flex items-center gap-1"
          >
            {t("common.viewAll")} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {popularFormats.map((format) => (
            <Link
              to={`/formats/${format.slug}`}
              key={format.mongoId}
              className="group bg-zinc-900 p-6 rounded-2xl border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-700">
                  <Users size={20} className="text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-white">{format.title}</h3>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-3">
                {format.subtitle}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* --- Modal del Mazo del Día --- */}
      {isModalOpen && dailyDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          {/* 
              Ajuste de anchura:
              - w-full: Ocupa todo el ancho disponible (respetando max-w)
              - md:max-w-4xl: En tablet es bastante ancho
              - lg:max-w-6xl: En desktop es muy ancho (aprox 70-80% dependiendo de la resolución)
          */}
          <div className="relative w-full md:max-w-4xl lg:max-w-6xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
              <div>
                <div className="flex items-center gap-4 mb-1">
                  <h3 className="text-2xl font-bold text-white">
                    {dailyDeck.deck_name}
                  </h3>
                  
                  {/* Star Rating System Modal Header */}
                  <div 
                    className="flex gap-1 bg-zinc-950/50 px-3 py-1.5 rounded-full border border-zinc-800"
                    onMouseLeave={() => setHoveredStar(0)}
                  >
                    {[1, 2, 3, 4, 5].map(star => {
                      const currentRating = dailyDeck.userRating || 0;
                      const averageRating = dailyDeck.averageRating || 0;
                      const isFilled = hoveredStar ? star <= hoveredStar : star <= currentRating;
                      const isOrangeBorder = isFilled || (!hoveredStar && star <= Math.round(averageRating));
                      
                      return (
                        <button
                          key={star}
                          type="button"
                          disabled={ratingLoading}
                          onMouseEnter={() => setHoveredStar(star)}
                          onClick={(e) => handleRateDeck(e, star)}
                          className="p-1 focus:outline-none transition-transform hover:scale-125 disabled:opacity-50"
                        >
                          <Star 
                            size={20} 
                            className={isFilled 
                              ? "text-orange-500 fill-orange-500" 
                              : isOrangeBorder
                                ? "text-orange-500 fill-transparent"
                                : "text-zinc-600 fill-transparent"
                            } 
                          />
                        </button>
                      );
                    })}
                    {dailyDeck.averageRating && dailyDeck.totalRatings && dailyDeck.totalRatings > 0 ? (
                      <div className="ml-2 pl-2 border-l border-zinc-700 flex flex-col justify-center">
                        <span className="text-xs text-zinc-300 font-bold leading-none">
                          {dailyDeck.averageRating}
                        </span>
                        <span className="text-[10px] text-zinc-500 leading-none mt-0.5">
                          {dailyDeck.totalRatings} {dailyDeck.totalRatings === 1 ? 'voto' : 'votos'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <p className="text-zinc-400">
                  {dailyDeck.format_name} &middot; {dailyDeck.archetype}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body (Scrollable) */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna 1: Listado de Cartas */}
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      <Layers size={18} className="text-indigo-500" />{" "}
                      {t("common.mainDeck")}
                    </h4>
                    <ul className="space-y-3">
                      {dailyDeck.main_deck.map((c, i) => (
                        <li
                          key={i}
                          onMouseEnter={() => handleMouseEnterCard(c.name)}
                          className="flex justify-between items-center border-b border-zinc-800/50 pb-2 last:border-0 gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button 
                              onClick={() => handleOpenPreview(c.name)}
                              className="lg:hidden p-1 text-zinc-500 hover:text-orange-500 transition-colors shrink-0"
                            >
                              <Camera size={24} />
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span className="text-white font-medium text-sm leading-tight truncate flex items-center gap-1">
                                {c.name}
                                {c.isGameChanger && (
                                  <span title={t("common.gameChangerTooltip")} className="cursor-help inline-flex items-center justify-center bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/30">
                                    GC
                                  </span>
                                )}
                              </span>
                              {c.mana_cost && <div className="mt-0.5"><ManaCost cost={c.mana_cost} size={14} /></div>}
                            </div>
                          </div>
                          <span className="text-zinc-500 font-bold text-xs bg-zinc-800/50 px-2 py-1 rounded-lg border border-zinc-700/50 shrink-0">
                            x{c.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {dailyDeck.sideboard && dailyDeck.sideboard.length > 0 && (
                    <div>
                      <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Layers size={18} className="text-zinc-500" />{" "}
                        {t("common.sideboard")}
                      </h4>
                      <ul className="space-y-3">
                        {dailyDeck.sideboard.map((c, i) => (
                          <li
                            key={i}
                            onMouseEnter={() => handleMouseEnterCard(c.name)}
                            className="flex justify-between items-center border-b border-zinc-800/50 pb-2 last:border-0 gap-3 group"
                          >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button 
                              onClick={() => handleOpenPreview(c.name)}
                              className="lg:hidden p-1 text-zinc-500 hover:text-orange-500 transition-colors shrink-0"
                            >
                              <Camera size={18} />
                            </button>
                            <div className="flex flex-col min-w-0">
                              <span className="text-zinc-400 font-medium text-sm leading-tight truncate flex items-center gap-1">
                                {c.name}
                                {c.isGameChanger && (
                                  <span title={t("common.gameChangerTooltip")} className="cursor-help inline-flex items-center justify-center bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/30">
                                    GC
                                  </span>
                                )}
                              </span>
                              {c.mana_cost && <div className="mt-0.5"><ManaCost cost={c.mana_cost} size={14} /></div>}
                            </div>
                          </div>
                            <span className="text-zinc-600 font-bold text-xs bg-zinc-800/30 px-2 py-1 rounded-lg border border-zinc-800/50 shrink-0">
                              x{c.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Columna 2: Vista Previa de Carta (Desktop) */}
                <div className="hidden lg:flex flex-col items-center justify-start py-4">
                  <div className="sticky top-0 w-full max-w-[280px]">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Card preview"
                        className="w-full rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300"
                      />
                    ) : (
                      <div className="w-full aspect-[2.5/3.5] rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700">
                        <Sparkles size={48} className="opacity-20" />
                      </div>
                    )}
                    <p className="text-center text-xs text-zinc-500 mt-4 italic">
                      {t("dashboard.previewHint") || "Pasa el ratón para ver la carta"}
                    </p>
                  </div>
                </div>

                {/* Columna 3: Análisis y Estrategia */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-zinc-950/50 p-5 rounded-xl border border-zinc-800">
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      <Zap size={18} className="text-orange-500" />{" "}
                      {t("dashboard.mainStrategy")}
                    </h4>
                    <p className="text-zinc-300 leading-relaxed">
                      {dailyDeck.strategy_summary}
                    </p>
                  </div>

                  <div className="bg-zinc-950/50 p-5 rounded-xl border border-zinc-800">
                    <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                      <BookOpen size={18} className="text-blue-500" />{" "}
                      {t("dashboard.metaAnalysis")}
                    </h4>
                    <p className="text-zinc-300 leading-relaxed">
                      {dailyDeck.brief_analysis}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox para Móvil */}
      {isPreviewModalOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div className="relative max-w-sm w-full animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
            >
              <X size={24} />
            </button>
            {previewImage ? (
              <img
                src={previewImage}
                alt="Card preview"
                className="w-full rounded-3xl shadow-2xl"
              />
            ) : (
              <div className="w-full aspect-[2.5/3.5] rounded-3xl bg-zinc-900 flex items-center justify-center">
                <ForgeSpinner size={64} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
