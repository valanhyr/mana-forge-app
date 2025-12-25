import { useState } from "react";
import {
  Sword,
  BookOpen,
  Database,
  Layers,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import DropdownInput from "./components/ui/DropdownInput.tsx";
import SearchInput from "./components/ui/SearchInput.tsx";
import TextAreaInput from "./components/ui/TextAreaInput.tsx";
import DeckTable, { type Deck } from "./components/ui/DeckTable.tsx";
import CardGrid, { type CardDisplayData } from "./components/ui/CardGrid.tsx";
import DeckList, { type DeckCard } from "./components/ui/DeckList.tsx";

function App() {
  // Estado simple para probar la interactividad
  const [deckName, setDeckName] = useState("Mi Mazo de Premodern");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [formatError, setFormatError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [isStacked, setIsStacked] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const formatOptions = [
    { value: "premodern", label: "Premodern" },
    { value: "legacy", label: "Legacy" },
    { value: "vintage", label: "Vintage" },
    { value: "commander", label: "Commander" },
  ];

  const handleStartForge = () => {
    if (!selectedFormat) {
      setFormatError("Debes seleccionar un formato válido");
    } else {
      setFormatError("");
      console.log("Iniciando forja:", deckName, selectedFormat);
    }
  };

  // Datos mockeados para la tabla
  const mockDecks: Deck[] = [
    {
      id: "1",
      name: "Maha, It’s Feathers Night",
      format: "Commander",
      colors: ["B"],
      lastUpdated: "4 months ago",
      isPrivate: true,
      isPinned: true,
    },
    {
      id: "2",
      name: "Azorius Control",
      format: "Modern",
      colors: ["W", "U"],
      lastUpdated: "2 days ago",
    },
    {
      id: "3",
      name: "Goblin Aggro",
      format: "Legacy",
      colors: ["R"],
      lastUpdated: "1 week ago",
    },
  ];

  // Generar 20 cartas mockeadas con imágenes reales de Scryfall (4 copias de cada una)
  const mockCards: CardDisplayData[] = [];
  const cardTemplates = [
    {
      name: "Lightning Bolt",
      url: "https://cards.scryfall.io/normal/front/c/e/ce753aa3-c235-4777-9f3c-02b70d4b9c0c.jpg",
    },
    {
      name: "Counterspell",
      url: "https://cards.scryfall.io/normal/front/a/4/a457f404-ddf1-40fa-b0f0-23c8598533f4.jpg",
    },
    {
      name: "Dark Ritual",
      url: "https://cards.scryfall.io/normal/front/9/5/95f27eeb-6f14-4db3-adb9-9be5ed76b34b.jpg",
    },
    {
      name: "Giant Growth",
      url: "https://cards.scryfall.io/normal/front/0/6/06ec9e8b-4bd8-4caf-a559-6514b7ab4ca4.jpg",
    },
    {
      name: "Llanowar Elves",
      url: "https://cards.scryfall.io/normal/front/8/b/8bbcfb77-daa1-4ce5-b5f9-48d0a8edbba9.jpg",
    },
  ];

  for (let i = 0; i < 20; i++) {
    const template = cardTemplates[i % 5];
    mockCards.push({
      id: `card-${i}`,
      name: template.name,
      imageUrl: template.url,
    });
  }

  // Datos mockeados para la lista detallada
  const mockDeckList: DeckCard[] = [
    {
      id: "c1",
      name: "Animar, Soul of Elements",
      quantity: 1,
      type: "Commander",
      manaCost: "{G}{U}{R}",
      price: 8.56,
      inCollection: true,
    },
    {
      id: "cr1",
      name: "Birds of Paradise",
      quantity: 1,
      type: "Creature",
      manaCost: "{G}",
      price: 5.56,
      inCollection: true,
    },
    {
      id: "cr2",
      name: "Fyndhorn Elves",
      quantity: 1,
      type: "Creature",
      manaCost: "{G}",
      price: 2.17,
      inCollection: false,
    },
    {
      id: "cr3",
      name: "Solemn Simulacrum",
      quantity: 1,
      type: "Creature",
      manaCost: "{4}",
      price: 0.31,
      inCollection: true,
    },
    {
      id: "cr4",
      name: "Mulldrifter",
      quantity: 1,
      type: "Creature",
      manaCost: "{4}{U}",
      price: 0.25,
      inCollection: true,
    },
    {
      id: "in1",
      name: "Counterspell",
      quantity: 1,
      type: "Instant",
      manaCost: "{U}{U}",
      price: 1.11,
      inCollection: true,
    },
    {
      id: "in2",
      name: "Lightning Bolt",
      quantity: 1,
      type: "Instant",
      manaCost: "{R}",
      price: 0.5,
      inCollection: true,
    },
    {
      id: "in3",
      name: "Cyclonic Rift",
      quantity: 1,
      type: "Instant",
      manaCost: "{1}{U}",
      price: 25.0,
      inCollection: false,
    },
    {
      id: "so1",
      name: "Cultivate",
      quantity: 1,
      type: "Sorcery",
      manaCost: "{2}{G}",
      price: 0.8,
      inCollection: true,
    },
    {
      id: "so2",
      name: "Blasphemous Act",
      quantity: 1,
      type: "Sorcery",
      manaCost: "{8}{R}",
      price: 2.5,
      inCollection: true,
    },
    {
      id: "en1",
      name: "Rhystic Study",
      quantity: 1,
      type: "Enchantment",
      manaCost: "{2}{U}",
      price: 35.0,
      inCollection: false,
    },
    {
      id: "ar1",
      name: "Sol Ring",
      quantity: 1,
      type: "Artifact",
      manaCost: "{1}",
      price: 1.5,
      inCollection: true,
    },
    {
      id: "ar2",
      name: "Arcane Signet",
      quantity: 1,
      type: "Artifact",
      manaCost: "{2}",
      price: 0.9,
      inCollection: true,
    },
    {
      id: "la1",
      name: "Command Tower",
      quantity: 1,
      type: "Land",
      price: 0.25,
      inCollection: true,
    },
    {
      id: "la2",
      name: "Forest",
      quantity: 8,
      type: "Land",
      price: 0.05,
      inCollection: true,
    },
    {
      id: "la3",
      name: "Island",
      quantity: 6,
      type: "Land",
      price: 0.05,
      inCollection: true,
    },
    {
      id: "la4",
      name: "Mountain",
      quantity: 5,
      type: "Land",
      price: 0.05,
      inCollection: true,
    },
  ];

  const handleSearch = () => {
    console.log("Buscando en Scryfall:", searchQuery);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      {/* Header / Navbar */}
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg">
            <Sword className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white">
            MANA<span className="text-orange-500">FORGE</span>
          </h1>
        </div>

        <nav className="flex gap-6 text-zinc-400 font-medium">
          <a href="#" className="hover:text-orange-500 transition-colors">
            Analizador
          </a>
          <a href="#" className="hover:text-orange-500 transition-colors">
            Guías Strapi
          </a>
          <a href="#" className="hover:text-orange-500 transition-colors">
            Mi Perfil
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold mb-4 text-zinc-100">
            Configuración del Proyecto
          </h2>

          <div className="space-y-6">
            {/* Ejemplo de SearchInput */}
            <SearchInput
              label="Buscar Carta (Scryfall)"
              placeholder="Ej: Black Lotus"
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              hint="Presiona Enter para buscar en la base de datos"
            />

            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                Nombre del Mazo
              </label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
            </div>

            {/* Nuevo componente TextAreaInput */}
            <TextAreaInput
              label="Descripción / Estrategia"
              placeholder="Describe la estrategia principal de tu mazo..."
              value={deckDescription}
              onChange={setDeckDescription}
              hint="Opcional. Máximo 500 caracteres."
            />

            {/* Componente DropdownInput estilizado */}
            <DropdownInput
              label="Formato de Juego"
              options={formatOptions}
              value={selectedFormat}
              onChange={(val: string) => {
                setSelectedFormat(val);
                setFormatError("");
              }}
              placeholder="Selecciona un formato..."
              error={formatError}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center gap-4">
                <Database className="text-blue-500" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase">
                    Backend Java
                  </p>
                  <p className="text-sm font-bold text-green-500">Conectado</p>
                </div>
              </div>
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center gap-4">
                <BookOpen className="text-purple-500" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Strapi CMS</p>
                  <p className="text-sm font-bold text-zinc-400 italic">
                    Esperando IP Debian...
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartForge}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95"
            >
              INICIAR FORJA DE MAZO
            </button>

            <div className="mt-8 pt-8 border-t border-zinc-800">
              <h3 className="text-lg font-bold mb-4 text-zinc-100">
                Mis Mazos Recientes
              </h3>
              <DeckTable
                decks={mockDecks}
                onPin={(id) => console.log("Pin deck", id)}
                onInfo={(id) => console.log("Info deck", id)}
                onMore={(id) => console.log("More options", id)}
              />
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-zinc-100">
                  Vista Previa del Mazo (20 Cartas)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setViewMode(viewMode === "grid" ? "list" : "grid")
                    }
                    className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800"
                  >
                    {viewMode === "grid" ? (
                      <ListIcon size={16} />
                    ) : (
                      <LayoutGrid size={16} />
                    )}
                    {viewMode === "grid" ? "Ver Lista" : "Ver Grid"}
                  </button>
                  {viewMode === "grid" && (
                    <button
                      onClick={() => setIsStacked(!isStacked)}
                      className="flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800"
                    >
                      {isStacked ? (
                        <LayoutGrid size={16} />
                      ) : (
                        <Layers size={16} />
                      )}
                      {isStacked ? "Ver Individuales" : "Ver Apiladas"}
                    </button>
                  )}
                </div>
              </div>

              {viewMode === "grid" ? (
                <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 min-h-[200px]">
                  <CardGrid cards={mockCards} stacked={isStacked} />
                </div>
              ) : (
                <DeckList
                  cards={mockDeckList}
                  onCardClick={(id) => console.log("Click card", id)}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
