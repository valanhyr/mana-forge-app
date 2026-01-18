import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { DeckService, type DailyDeck } from "../../services/DeckService";
import { ScryfallService } from "../../services/ScryfallService";
import ForgeSpinner from "../../components/ui/ForgeSpinner";
import { useTranslation } from "../../hooks/useTranslation";

// --- Mock Data ---

// 1. Noticias
const newsItems = [
  {
    title: "Nueva Expansión: Horizontes de Modern 3",
    subtitle: "Descubre las cartas que cambiarán el formato para siempre.",
    link: "/articles/mh3-review",
    linkLabel: "Leer análisis",
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop", // Ugin's Labyrinth
  },
  {
    title: "Guía de Commander: Empezando con Urza",
    subtitle:
      "Aprende a construir un mazo poderoso alrededor de Urza, Lord Protector.",
    link: "/articles/urza-commander",
    linkLabel: "Ver guía",
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop", // Urza, Lord Protector
  },
  {
    title: "El Estado del Metajuego de Premodern",
    subtitle:
      "Analizamos los mazos dominantes y las joyas ocultas del formato.",
    link: "/articles/premodern-state",
    linkLabel: "Explorar meta",
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Psychatog&format=image&version=art_crop", // Psychatog
  },
];

// 2. Mazos del Día
const deckOfTheDay = {
  name: "Izzet Delver",
  format: "Legacy",
  archetype: "Tempo",
  cardArtUrl:
    "https://api.scryfall.com/cards/named?exact=Delver%20of%20Secrets&format=image&version=art_crop", // Delver of Secrets
  deckId: "some-public-deck-id",
};

const Dashboard = () => {
  const { t, locale } = useTranslation();
  const [dailyDeck, setDailyDeck] = useState<DailyDeck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 3. Formatos Populares (Movido dentro para usar t())
  const popularFormats = [
    {
      name: "Commander",
      description: t("dashboard.formatDescriptions.commander"),
      link: "/formats/commander",
    },
    {
      name: "Modern",
      description: t("dashboard.formatDescriptions.modern"),
      link: "/formats/modern",
    },
    {
      name: "Pauper",
      description: t("dashboard.formatDescriptions.pauper"),
      link: "/formats/pauper",
    },
    {
      name: "Legacy",
      description: t("dashboard.formatDescriptions.legacy"),
      link: "/formats/legacy",
    },
  ];

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
  }, [locale]); // Recargar si cambia el idioma

  const AiDeckCard = () => {
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
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20 backdrop-blur-sm">
              <Sparkles size={14} /> {t("dashboard.aiDeckOfTheDay")}
            </span>
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
      {/* --- Sección de Noticias --- */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-6">
          {t("dashboard.newsTitle")}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {newsItems.map((item, index) => (
            <Link
              to={item.link}
              key={index}
              className="group relative block overflow-hidden rounded-2xl shadow-lg"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
              </div>
              <div className="relative z-10 flex flex-col justify-end h-64 p-6 text-white">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-zinc-300 mt-1">{item.subtitle}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-orange-500 font-semibold text-sm group-hover:underline">
                  {item.linkLabel}
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
          <Link
            to={`/deck-viewer/${deckOfTheDay.deckId}`}
            className="group relative block overflow-hidden rounded-2xl shadow-lg"
          >
            <div className="absolute inset-0 z-0">
              <img
                src={deckOfTheDay.cardArtUrl}
                alt={deckOfTheDay.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
            <div className="relative z-10 flex flex-col justify-between h-80 p-6 text-white">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
                  <Zap size={14} /> {t("dashboard.deckOfTheDay")}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">{deckOfTheDay.name}</h3>
                <p className="text-sm text-zinc-300 mt-1">
                  {deckOfTheDay.format} &middot; {deckOfTheDay.archetype}
                </p>
              </div>
            </div>
          </Link>

          {/* Mazo de IA */}
          <AiDeckCard />
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
              to={format.link}
              key={format.name}
              className="group bg-zinc-900 p-6 rounded-2xl border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800/50 transition-all"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-700">
                  <Users size={20} className="text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-white">{format.name}</h3>
              </div>
              <p className="text-sm text-zinc-400">{format.description}</p>
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
                <h3 className="text-2xl font-bold text-white">
                  {dailyDeck.deck_name}
                </h3>
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
                    <ul className="text-sm text-zinc-300 space-y-1 font-mono">
                      {dailyDeck.main_deck.map((c, i) => (
                        <li
                          key={i}
                          className="flex justify-between border-b border-zinc-800/50 pb-1 last:border-0"
                        >
                          <span>{c.name}</span>
                          <span className="text-zinc-500">{c.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Columna 2 y 3: Análisis y Estrategia */}
                <div className="lg:col-span-2 space-y-6">
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
    </div>
  );
};

export default Dashboard;
