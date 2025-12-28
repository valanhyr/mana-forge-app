import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Users } from "lucide-react";

// --- Mock Data ---

// 1. Noticias
const newsItems = [
  {
    title: "Nueva Expansión: Horizontes de Modern 3",
    subtitle: "Descubre las cartas que cambiarán el formato para siempre.",
    link: "/articles/mh3-review",
    linkLabel: "Leer análisis",
    imageUrl:
      "https://cards.scryfall.io/art_crop/front/7/1/71c6f927-951d-422b-a839-489e895a5922.jpg?1712484988", // Ugin's Labyrinth
  },
  {
    title: "Guía de Commander: Empezando con Urza",
    subtitle:
      "Aprende a construir un mazo poderoso alrededor de Urza, Lord Protector.",
    link: "/guides/urza-commander",
    linkLabel: "Ver guía",
    imageUrl:
      "https://cards.scryfall.io/art_crop/front/8/0/800d2c03-2d88-4603-b151-3b9c39a2a4a2.jpg?1674421994", // Urza, Lord Protector
  },
  {
    title: "El Estado del Metajuego de Premodern",
    subtitle:
      "Analizamos los mazos dominantes y las joyas ocultas del formato.",
    link: "/meta/premodern-state",
    linkLabel: "Explorar meta",
    imageUrl:
      "https://cards.scryfall.io/art_crop/front/4/b/4b81167a-439b-4e4f-a4e6-7039a0c36936.jpg?1562906886", // Psychatog
  },
];

// 2. Mazos del Día
const deckOfTheDay = {
  name: "Izzet Delver",
  format: "Legacy",
  archetype: "Tempo",
  cardArtUrl:
    "https://cards.scryfall.io/art_crop/front/1/1/1165f435-de5b-4d2c-8de1-51f6e7f524a6.jpg?1626094284", // Delver of Secrets
  deckId: "some-public-deck-id",
};

const aiGeneratedDeck = {
  name: "Goblins Tribales (IA)",
  format: "Modern",
  archetype: "Aggro",
  cardArtUrl:
    "https://cards.scryfall.io/art_crop/front/a/9/a9446d18-904f-4d4c-a1b6-5d7c2a3a55a8.jpg?1562925291", // Goblin Piledriver
  deckId: "some-ai-deck-id",
};

// 3. Formatos Populares (Sugerencia)
const popularFormats = [
  {
    name: "Commander",
    description: "El formato multijugador por excelencia.",
    link: "/decks/commander",
  },
  {
    name: "Modern",
    description: "Poder y consistencia con un amplio pool de cartas.",
    link: "/decks/modern",
  },
  {
    name: "Pauper",
    description: "Construye mazos solo con cartas comunes.",
    link: "/decks/pauper",
  },
  {
    name: "Legacy",
    description: "Donde la historia de Magic cobra vida.",
    link: "/decks/legacy",
  },
];

const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 space-y-12 mb-12">
      {/* --- Sección de Noticias --- */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-6">Últimas Noticias</h2>
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
        <h2 className="text-3xl font-bold text-white mb-6">Mazos Destacados</h2>
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
                  <Zap size={14} /> Mazo del Día
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
          <Link
            to={`/deck-viewer/${aiGeneratedDeck.deckId}`}
            className="group relative block overflow-hidden rounded-2xl shadow-lg"
          >
            <div className="absolute inset-0 z-0">
              <img
                src={aiGeneratedDeck.cardArtUrl}
                alt={aiGeneratedDeck.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
            <div className="relative z-10 flex flex-col justify-between h-80 p-6 text-white">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                  <Sparkles size={14} /> Generado por IA
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">{aiGeneratedDeck.name}</h3>
                <p className="text-sm text-zinc-300 mt-1">
                  {aiGeneratedDeck.format} &middot; {aiGeneratedDeck.archetype}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* --- Sección Formatos Populares (Sugerencia) --- */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Explora Formatos</h2>
          <Link
            to="/decks"
            className="text-sm font-medium text-orange-500 hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight size={16} />
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
    </div>
  );
};

export default Dashboard;
