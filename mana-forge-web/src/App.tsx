import { useState } from "react";
import { Sword, BookOpen, Database } from "lucide-react";

function App() {
  // Estado simple para probar la interactividad
  const [deckName, setDeckName] = useState("Mi Mazo de Premodern");

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

            <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95">
              INICIAR FORJA DE MAZO
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
