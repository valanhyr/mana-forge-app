import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Loader2 } from "lucide-react";

interface ArticleData {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  date: string;
  category: "Article" | "Guide" | "Meta";
  content: string;
  imageUrl: string;
}

// Mock de artículos basado en los items del Dashboard
const MOCK_ARTICLES: Record<string, ArticleData> = {
  "mh3-review": {
    id: "mh3-review",
    title: "Nueva Expansión: Horizontes de Modern 3",
    subtitle: "Descubre las cartas que cambiarán el formato para siempre.",
    author: "Jace Beleren",
    date: "10 Jun 2024",
    category: "Article",
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop",
    content: `
      <p class="mb-4">Modern Horizons 3 ha llegado y el impacto en el formato es innegable. Desde las nuevas Fetch Lands hasta los Eldrazi titanes reimaginados, esta colección promete sacudir los cimientos de Modern.</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-3">Las cartas clave</h3>
      <p class="mb-4">Sin duda, <strong>Nadu, Winged Wisdom</strong> se perfila como una de las criaturas más polémicas. Su interacción con equipamientos de coste 0 como Shuko está generando combos infinitos en los primeros turnos.</p>
      <p class="mb-4">Por otro lado, <strong>Phlage, Titan of Fire's Fury</strong> ofrece una recursividad impresionante para los mazos Boros y Jeskai, actuando como un Uro en colores agresivos.</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-3">Conclusión</h3>
      <p class="mb-4">Prepárate para un metajuego rápido y lleno de interacciones poderosas. El banquillo será más importante que nunca.</p>
    `,
  },
  "urza-commander": {
    id: "urza-commander",
    title: "Guía de Commander: Empezando con Urza",
    subtitle:
      "Aprende a construir un mazo poderoso alrededor de Urza, Lord Protector.",
    author: "Teferi",
    date: "15 Jun 2024",
    category: "Guide",
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
    content: `
      <p class="mb-4">Urza, Lord Protector no es solo una carta, es una declaración de intenciones. Si te gusta el control, los artefactos y reducir costes, este es tu comandante.</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-3">La estrategia</h3>
      <p class="mb-4">El objetivo principal es controlar la mesa en los primeros turnos mientras desarrollas tu base de maná con artefactos. La habilidad de Urza de reducir costes te permite jugar tus hechizos de control y stax mucho antes de lo esperado.</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-3">La Fusión (Meld)</h3>
      <p class="mb-4">No olvides incluir <strong>The Mightstone and Weakstone</strong>. Fusionar a Urza en su forma Planeswalker es una de las condiciones de victoria más satisfactorias del mazo.</p>
    `,
  },
  "premodern-state": {
    id: "premodern-state",
    title: "El Estado del Metajuego de Premodern",
    subtitle:
      "Analizamos los mazos dominantes y las joyas ocultas del formato.",
    author: "Liliana Vess",
    date: "20 Jun 2024",
    category: "Meta",
    imageUrl:
      "https://api.scryfall.com/cards/named?exact=Psychatog&format=image&version=art_crop",
    content: `
      <p class="mb-4">Premodern sigue creciendo en popularidad, ofreciendo una experiencia nostálgica pero competitiva. El formato se ha estabilizado, pero siempre hay espacio para la innovación.</p>
      <h3 class="text-xl font-bold text-white mt-6 mb-3">Tier 1</h3>
      <ul class="list-disc list-inside mb-4 space-y-2">
        <li><strong>Stiflenought:</strong> Un combo rápido y protegido que puede ganar en turno 2 o 3.</li>
        <li><strong>Goblins:</strong> La marea roja nunca muere. Con Ringleader y Lackey, la ventaja de cartas es absurda.</li>
        <li><strong>The Rock:</strong> Midrange clásico con Spiritmonger y Pernicious Deed.</li>
      </ul>
      <h3 class="text-xl font-bold text-white mt-6 mb-3">Joyas ocultas</h3>
      <p class="mb-4">No pierdas de vista los mazos de <strong>Replenish</strong>. Con el cementerio adecuado, pueden dar la vuelta a la partida en un solo turno.</p>
    `,
  },
};

const ArticleDetail = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simular fetch
    const timer = setTimeout(() => {
      if (articleId && MOCK_ARTICLES[articleId]) {
        setArticle(MOCK_ARTICLES[articleId]);
      } else {
        setArticle(null);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [articleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-4">
          Artículo no encontrado
        </h2>
        <p className="text-zinc-400 mb-8">
          Lo sentimos, no pudimos encontrar el artículo que buscas.
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
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-zinc-300 hover:text-white mb-6 transition-colors bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 w-fit"
          >
            <ArrowLeft size={16} /> Volver
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30 uppercase tracking-wider">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-zinc-400 text-sm bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
              <Calendar size={14} /> {article.date}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
            {article.title}
          </h1>
          <p className="text-xl text-zinc-200 font-medium max-w-2xl drop-shadow-md">
            {article.subtitle}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8 pb-8 border-b border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-700">
              <User size={20} />
            </div>
            <div>
              <p className="text-white font-medium">
                Escrito por {article.author}
              </p>
              <p className="text-zinc-500 text-xs">Colaborador de Mana Forge</p>
            </div>
          </div>

          <div
            className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-a:text-orange-500 hover:prose-a:text-orange-400 prose-strong:text-white prose-li:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
