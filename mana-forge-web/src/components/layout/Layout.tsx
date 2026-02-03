import { useState, useEffect, useRef } from "react";
import { Link, Outlet } from "react-router-dom";
import { Sword, ChevronDown, LogOut, User, Settings, Book } from "lucide-react";
import { useUser } from "../../services/UserContext";
import LanguageSelector from "../ui/LanguageSelector";
import Footer from "./Footer";
import AuthModal from "../../views/auth/Login";

const Layout = () => {
  const { user, isAuthenticated, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="p-8 flex-1">
        {/* Header / Navbar Global */}
        <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-orange-600 p-2 rounded-lg group-hover:bg-orange-500 transition-colors">
              <Sword className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white">
              MANA<span className="text-orange-500">FORGE</span>
            </h1>
          </Link>

          <nav className="flex gap-6 text-zinc-400 font-medium items-center">
            <Link to="/" className="hover:text-orange-500 transition-colors">
              Dashboard
            </Link>

            <LanguageSelector />

            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors focus:outline-none"
                >
                  <span className="text-orange-500 font-semibold">
                    {user.username}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 mb-2 bg-zinc-900/50">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        Conectado como
                      </p>
                      <p className="text-sm text-white truncate font-medium">
                        {user.email}
                      </p>
                    </div>

                    <Link
                      to="/my-decks"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <Book size={16} /> Mis Mazos
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <User size={16} /> Mi Perfil
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <Settings size={16} /> Configuración
                    </Link>

                    <div className="border-t border-zinc-800 my-2"></div>

                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={16} /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2 rounded-lg transition-all text-sm font-bold shadow-lg hover:shadow-orange-900/10"
              >
                Iniciar Sesión
              </button>
            )}
          </nav>
        </header>

        <main className="max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
      <Footer />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default Layout;
