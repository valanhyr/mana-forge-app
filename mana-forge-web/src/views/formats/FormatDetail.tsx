import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Ban, Layers } from "lucide-react";

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
};

const FormatDetail = () => {
  const { formatName } = useParams<{ formatName: string }>();
  const [data, setData] = useState<FormatCMSData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular fetch al CMS
    setLoading(true);
    setTimeout(() => {
      if (formatName && MOCK_CMS_DATA[formatName.toLowerCase()]) {
        setData(MOCK_CMS_DATA[formatName.toLowerCase()]);
      } else {
        setData(null);
      }
      setLoading(false);
    }, 300);
  }, [formatName]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-4">
          Formato no encontrado
        </h2>
        <p className="text-zinc-400 mb-8">
          Lo sentimos, no tenemos información sobre el formato "{formatName}".
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft size={20} /> Volver al inicio
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
            <ArrowLeft size={16} /> Volver
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
                <h2 className="text-2xl font-bold text-white">Descripción</h2>
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
                  Reglas Principales
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
                Estructura del Mazo
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Mazo Principal</span>
                  <span className="text-white font-mono font-bold">
                    {data.metadata.minDeckSize}+
                  </span>
                </div>
                {data.metadata.sideboardSize > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Sideboard</span>
                    <span className="text-white font-mono font-bold">
                      Hasta {data.metadata.sideboardSize}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Máx. Copias</span>
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
                  Cartas Prohibidas
                </h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                Consulta la lista oficial de cartas prohibidas y restringidas
                para {data.title}.
              </p>
              <button className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium border border-zinc-700">
                Ver Banlist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function Loader2({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default FormatDetail;
