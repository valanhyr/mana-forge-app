import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Ban,
  Layers,
  Users,
  ArrowRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import ForgeSpinner from "../../components/ui/ForgeSpinner";
import Modal from "../../components/ui/Modal";

// --- Mock CMS Data Structure ---
interface FormatCMSData {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  rules: string[];
  imageUrl: string;
  metadata: {
    minDeckSize: number;
    maxDeckSize?: number;
    maxCopies: number;
    sideboardSize: number;
  };
}

// Simulación de contenido que vendría de un CMS (Contentful, Strapi, etc.)
const MOCK_CMS_DATA: Record<string, FormatCMSData> = {
  commander: {
    slug: "commander",
    title: "Commander (EDH)",
    subtitle: "El formato multijugador definitivo",
    description:
      "Commander es una forma emocionante y única de jugar a Magic que se centra en criaturas legendarias impresionantes, grandes jugadas y batallas contra tus amigos en partidas multijugador todos contra todos. Cada jugador elige una criatura legendaria como comandante y construye un mazo en torno a su identidad de color.",
    rules: [
      "1 carta de Comandante (Criatura Legendaria)",
      "99 cartas en el mazo principal",
      "Solo una copia de cada carta (excepto tierras básicas)",
      "Todas las cartas deben compartir la identidad de color del comandante",
      "Las partidas suelen ser de 4 jugadores todos contra todos",
      "Empiezas con 40 vidas",
    ],
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop", // Urza
    metadata: {
      minDeckSize: 100,
      maxCopies: 1,
      sideboardSize: 0,
    },
  },
  modern: {
    slug: "modern",
    title: "Modern",
    subtitle: "Un formato sin rotación desde la Octava Edición",
    description:
      "Modern es un formato construido que permite cartas desde la Octava Edición (2003) hasta la actualidad. Es conocido por su diversidad de mazos y su alto nivel de poder sin llegar a los extremos de Legacy o Vintage. Es uno de los formatos competitivos más populares del mundo.",
    rules: [
      "Mínimo 60 cartas en el mazo principal",
      "Hasta 15 cartas en el banquillo (Sideboard)",
      "Máximo 4 copias de cada carta (excepto tierras básicas)",
      "No hay rotación de sets, pero existe una lista de prohibidas",
    ],
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop", // Ugin's Labyrinth
    metadata: {
      minDeckSize: 60,
      maxCopies: 4,
      sideboardSize: 15,
    },
  },
  pauper: {
    slug: "pauper",
    title: "Pauper",
    subtitle: "Solo cartas comunes",
    description:
      "En Pauper, solo se permiten cartas que hayan sido impresas con rareza común en algún momento de la historia de Magic (físico o digital). Es un formato accesible económicamente pero con un nivel de estrategia sorprendentemente profundo y un metajuego vibrante.",
    rules: [
      "Solo cartas con rareza Común",
      "Mínimo 60 cartas en el mazo principal",
      "Hasta 15 cartas en el banquillo",
      "Máximo 4 copias de cada carta",
    ],
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Psychatog&format=image&version=art_crop", // Psychatog
    metadata: {
      minDeckSize: 60,
      maxCopies: 4,
      sideboardSize: 15,
    },
  },
  legacy: {
    slug: "legacy",
    title: "Legacy",
    subtitle: "Toda la historia de Magic",
    description:
      "Legacy permite cartas de todas las expansiones legales en torneos. Es un formato de alto poder donde se pueden jugar algunas de las cartas más icónicas y poderosas de la historia del juego, como las Dual Lands originales y Force of Will.",
    rules: [
      "Mínimo 60 cartas en el mazo principal",
      "Hasta 15 cartas en el banquillo",
      "Máximo 4 copias de cada carta",
      "Lista de prohibidas específica para mantener el equilibrio",
    ],
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Delver%20of%20Secrets&format=image&version=art_crop", // Delver
    metadata: {
      minDeckSize: 60,
      maxCopies: 4,
      sideboardSize: 15,
    },
  },
  premodern: {
    slug: "premodern",
    title: "Premodern",
    subtitle: "Magic como solía ser (1995-2003)",
    description:
      "Premodern es un formato construido por la comunidad que consiste en cartas impresas entre la Cuarta Edición (1995) y Azote (2003). El formato busca capturar la sensación de Magic de esa época, permitiendo solo cartas con el marco antiguo pero utilizando las reglas actuales.",
    rules: [
      "Cartas impresas entre 4th Edition y Scourge",
      "Mínimo 60 cartas en el mazo principal",
      "Hasta 15 cartas en el banquillo",
      "Máximo 4 copias de cada carta",
    ],
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Spiritmonger&format=image&version=art_crop", // Spiritmonger
    metadata: {
      minDeckSize: 60,
      maxCopies: 4,
      sideboardSize: 15,
    },
  },
};

const FormatDetail = () => {
  const { t } = useTranslation();
  const { formatName } = useParams<{ formatName: string }>();
  const [data, setData] = useState<FormatCMSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBanlistModalOpen, setIsBanlistModalOpen] = useState(false);
  const [bannedCards, setBannedCards] = useState<any[]>([]);
  const [loadingBanlist, setLoadingBanlist] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleViewBanlist = async () => {
    setIsBanlistModalOpen(true);
    if (data?.slug && bannedCards.length === 0) {
      setLoadingBanlist(true);
      try {
        const response = await fetch(
          `http://localhost:8080/api/cards/banned/${data.slug}`
        );
        if (response.ok) {
          const result = await response.json();
          // Aseguramos que sea un array, manejando posibles envoltorios
          if (Array.isArray(result)) {
            setBannedCards(result);
          } else {
            setBannedCards(result?.data || result?.cards || []);
          }
        }
      } catch (error) {
        console.error("Error fetching banlist:", error);
      } finally {
        setLoadingBanlist(false);
      }
    }
  };

  const isAllFormats = !formatName || formatName === "all-formats";

  useEffect(() => {
    // Simular fetch al CMS
    setLoading(true);
    setBannedCards([]);
    setTimeout(() => {
      if (isAllFormats) {
        setData(null); // No necesitamos datos específicos para la vista de lista
      } else if (formatName && MOCK_CMS_DATA[formatName.toLowerCase()]) {
        setData(MOCK_CMS_DATA[formatName.toLowerCase()]);
      } else {
        setData(null);
      }
      setLoading(false);
    }, 300);
  }, [formatName, isAllFormats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <ForgeSpinner className="text-orange-500" size={128} />
      </div>
    );
  }

  if (isAllFormats) {
    return (
      <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-orange-600 p-2 rounded-lg">
            <Users className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-white">
            {t("dashboard.exploreFormats")}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(MOCK_CMS_DATA).map((format) => (
            <Link
              to={`/formats/${format.slug}`}
              key={format.slug}
              className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-zinc-800/50 transition-all flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-700 group-hover:border-orange-500/30 transition-colors">
                  <Layers size={24} className="text-orange-500" />
                </div>
                <ArrowRight
                  className="text-zinc-600 group-hover:text-orange-500 transition-colors"
                  size={20}
                />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                {format.title}
              </h3>
              <p className="text-sm text-zinc-400 mb-6 flex-grow leading-relaxed">
                {format.subtitle}
              </p>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>{format.metadata.minDeckSize}+ Cards</span>
                <span>
                  Max {format.metadata.maxCopies}{" "}
                  {format.metadata.maxCopies === 1 ? "Copy" : "Copies"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-4">
          {t("formatDetail.notFoundTitle")}
        </h2>
        <p className="text-zinc-400 mb-8">
          {t("formatDetail.notFoundDescription", {
            formatName: formatName || "",
          })}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft size={20} /> {t("formatDetail.backToHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Hero Header */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={data.imageUrl}
            alt={data.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-zinc-300 hover:text-white mb-6 transition-colors bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 w-fit"
          >
            <ArrowLeft size={16} /> {t("common.back")}
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight">
            {data.title}
          </h1>
          <p className="text-xl text-orange-400 font-medium max-w-2xl">
            {data.subtitle}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="text-orange-500" size={24} />
                <h2 className="text-2xl font-bold text-white">
                  {t("common.description")}
                </h2>
              </div>
              <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed">
                <p>{data.description}</p>
              </div>
            </div>

            {/* Rules */}
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <Layers className="text-indigo-500" size={24} />
                <h2 className="text-2xl font-bold text-white">
                  {t("formatDetail.mainRules")}
                </h2>
              </div>
              <ul className="space-y-3">
                {data.rules.map((rule, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-zinc-300"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats / Metadata */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">
                {t("formatDetail.deckStructure")}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">{t("common.mainDeck")}</span>
                  <span className="text-white font-mono font-bold">
                    {data.metadata.minDeckSize}+
                  </span>
                </div>
                {data.metadata.sideboardSize > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">
                      {t("common.sideboard")}
                    </span>
                    <span className="text-white font-mono font-bold">
                      {t("formatDetail.upTo", {
                        count: data.metadata.sideboardSize,
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">
                    {t("formatDetail.maxCopies")}
                  </span>
                  <span className="text-white font-mono font-bold">
                    {data.metadata.maxCopies}
                  </span>
                </div>
              </div>
            </div>

            {/* Banlist Link (Mock) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Ban className="text-red-500" size={20} />
                <h3 className="text-lg font-bold text-white">
                  {t("formatDetail.bannedCards")}
                </h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                {t("formatDetail.bannedCardsDescription", {
                  formatTitle: data.title,
                })}
              </p>
              <button
                onClick={handleViewBanlist}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium border border-zinc-700"
              >
                {t("formatDetail.viewBanlist")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isBanlistModalOpen}
        onClose={() => setIsBanlistModalOpen(false)}
        title={t("formatDetail.bannedCards")}
        maxWidth="max-w-6xl"
      >
        {loadingBanlist ? (
          <div className="flex justify-center p-8">
            <ForgeSpinner size={64} className="text-orange-500" />
          </div>
        ) : (
          <>
            {bannedCards.length > 0 && (
              <div className="flex justify-end px-4 mb-4">
                <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "grid"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === "list"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            )}

            {bannedCards.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-h-[70vh] overflow-y-auto p-2">
                  {bannedCards.map((card: any, idx: number) => (
                    <div key={idx} className="flex flex-col items-center group">
                      <div className="relative rounded-lg overflow-hidden aspect-[2.5/3.5] w-full mb-2 bg-zinc-800">
                        {card.image_uris?.normal ? (
                          <img
                            src={card.image_uris.normal}
                            alt={card.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-500 text-xs p-2 text-center">
                            {card.name}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-center text-zinc-300 font-medium leading-tight">
                        {card.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto p-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {bannedCards.map((card: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                      >
                        <span className="text-zinc-300 font-medium">
                          {card.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="col-span-full text-center text-zinc-400 py-8">
                <p className="mb-4">
                  {t("common.info")}: Banlist visual not available for this
                  format yet.
                </p>
                <a
                  href="https://magic.wizards.com/en/banned-restricted-list"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  Visit Official Banlist
                </a>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default FormatDetail;
