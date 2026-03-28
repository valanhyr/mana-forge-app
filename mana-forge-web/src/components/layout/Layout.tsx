import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { Anvil, ChevronDown, LogOut, User, Settings, Book, Menu, X, Users, LayoutDashboard, Layers, Wand2, MessageCircle, Sparkles, Info, MessageSquarePlus } from "lucide-react";
import { useUser } from "../../services/UserContext";
import LanguageSelector from "../ui/LanguageSelector";
import Footer from "./Footer";
import AuthModal from "../../views/auth/Login";
import FeedbackModal from "../ui/FeedbackModal";
import BetaWelcomeModal from "../ui/BetaWelcomeModal";
import { useTranslation } from "../../hooks/useTranslation";
import { MessageService } from "../../services/MessageService";

const BETA_BANNER_KEY = "feedback_banner_v1_dismissed";
const FEEDBACK_TOOLTIP_KEY = "feedback_tooltip_shown";

const Layout = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useUser();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Feedback banner visibility logic (repurposed from beta)
  const [bannerVisible, setBannerVisible] = useState(() => !sessionStorage.getItem(BETA_BANNER_KEY));
  const [showBannerInfo, setShowBannerInfo] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isBetaWelcomeOpen, setIsBetaWelcomeOpen] = useState(() => searchParams.get("beta_welcome") === "true");
  const [showFeedbackTooltip, setShowFeedbackTooltip] = useState(() => !localStorage.getItem(FEEDBACK_TOOLTIP_KEY));
  // Once the user has seen the tooltip, always show the FAB (even while banner is visible)
  const [fabAlwaysVisible, setFabAlwaysVisible] = useState(() => !!localStorage.getItem(FEEDBACK_TOOLTIP_KEY));

  useEffect(() => {
    if (!showFeedbackTooltip) return;
    localStorage.setItem(FEEDBACK_TOOLTIP_KEY, "1");
    const id = setTimeout(() => {
      setShowFeedbackTooltip(false);
      setFabAlwaysVisible(true);
    }, 6000);
    return () => clearTimeout(id);
  }, []);

  // Google Analytics Page Tracking
  useEffect(() => {
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("config", "G-YR4GEC9XWL", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  const menuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { to: "/", label: t("nav.home"), icon: <LayoutDashboard size={16} />, exact: true },
    { to: "/explorer", label: t("nav.explorer" as any) || "Explorar", icon: <Sparkles size={16} /> },
    { to: "/formats/all-formats", label: t("nav.formats"), icon: <Layers size={16} /> },
    ...(isAuthenticated ? [{ to: "/deck-builder", label: t("nav.deckBuilder"), icon: <Wand2 size={16} /> }] : []),
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bloquear scroll del body cuando el sidebar está abierto
  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isSidebarOpen]);

  // Poll unread message count every 30s
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = () => MessageService.getUnreadCount().then(setUnreadCount).catch(() => {});
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* Feedback Banner */}
      {bannerVisible && (
        <div className="w-full bg-zinc-900 border-b border-orange-500/20 px-4 py-2 flex items-center justify-between gap-2 text-sm relative z-40">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={15} className="text-orange-400 flex-shrink-0" />
            <span className="text-zinc-300 truncate hidden sm:block">{t("beta.bannerText")}</span>
            <span className="text-zinc-300 truncate sm:hidden">{t("beta.bannerTextShort")}</span>
            <button
              onClick={() => setShowBannerInfo((v) => !v)}
              className="text-zinc-500 hover:text-orange-400 transition-colors flex-shrink-0"
              aria-label="Más información"
            >
              <Info size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 rounded-lg text-xs font-medium transition-all"
            >
              <MessageSquarePlus size={13} />
              <span className="hidden xs:block">{t("beta.feedbackButton")}</span>
            </button>
            <button
              onClick={() => { setBannerVisible(false); sessionStorage.setItem(BETA_BANNER_KEY, "1"); }}
              className="text-zinc-500 hover:text-white transition-colors p-1"
              aria-label="Cerrar banner"
            >
              <X size={14} />
            </button>
          </div>
          {/* Info popover */}
          {showBannerInfo && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-80 max-w-[calc(100vw-2rem)] bg-zinc-800 border border-zinc-700 rounded-xl p-4 shadow-2xl z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowBannerInfo(false)} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X size={14} /></button>
              <p className="text-sm font-semibold text-white mb-1">{t("beta.infoTitle")}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{t("beta.infoBody")}</p>
            </div>
          )}
        </div>
      )}

      <div className="p-8 flex-1">
        {/* Header / Navbar Global */}
        <header className="max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto flex justify-between items-center mb-12">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-orange-600 p-2 rounded-lg group-hover:bg-orange-500 transition-colors">
              <Anvil className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white">
              MANA<span className="text-orange-500">FORGE</span>
            </h1>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex gap-1 text-zinc-400 font-medium items-center">
            {navLinks.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive(to, exact)
                    ? "text-orange-500 bg-orange-500/10"
                    : "hover:text-white hover:bg-zinc-800"
                }`}
              >
                {label}
              </Link>
            ))}

            <div className="w-px h-5 bg-zinc-700 mx-2" />

            <LanguageSelector />

            {isAuthenticated && (
              <>
                <div className="w-px h-5 bg-zinc-700 mx-2" />
                <Link
                  to="/messages"
                  className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  aria-label="Mensajes"
                >
                  <MessageCircle size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            <div className="w-px h-5 bg-zinc-700 mx-2" />

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
                    className={`transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800 mb-2 bg-zinc-900/50">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">
                        {t("userOptions.connectedAs")}
                      </p>
                      <p className="text-sm text-white truncate font-medium">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      to="/my-decks"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <Book size={16} /> {t("userOptions.myDecks")}
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <User size={16} /> {t("userOptions.myProfile")}
                    </Link>
                    <Link
                      to="/friends"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <Users size={16} /> {t("userOptions.myFriends")}
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <MessageCircle size={16} />
                      {t("messages.title")}
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
                    >
                      <Settings size={16} /> {t("userOptions.mySettings")}
                    </Link>
                    <div className="border-t border-zinc-800 my-2"></div>
                    <button
                      onClick={() => { logout(); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={16} /> {t("userOptions.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2 rounded-lg transition-all text-sm font-bold shadow-lg hover:shadow-orange-900/10"
              >
                {t("userOptions.login")}
              </button>
            )}
          </nav>

          {/* Botón hamburguesa + mensajes (solo mobile) */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && (
              <Link
                to="/messages"
                className="relative p-2 rounded-lg text-zinc-300 hover:text-white transition-colors"
                aria-label="Mensajes"
              >
                <MessageCircle size={22} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              className="text-zinc-300 hover:text-white transition-colors"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={28} />
            </button>
          </div>
        </header>

        <main className="max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto">
          <Outlet />
        </main>
      </div>
      <Footer />

      {/* Overlay sidebar mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={`fixed top-0 right-0 h-full w-72 bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col transition-transform duration-300 md:hidden ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <span className="text-white font-bold text-lg">
            MANA<span className="text-orange-500">FORGE</span>
          </span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {navLinks.map(({ to, label, icon, exact }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-colors ${
                isActive(to, exact)
                  ? "text-orange-500 bg-orange-500/10"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-orange-500"
              }`}
            >
              {icon} {label}
            </Link>
          ))}

          <div className="px-3 py-2">
            <LanguageSelector />
          </div>

          <div className="border-t border-zinc-800 my-2" />

          {isAuthenticated && user ? (
            <>
              <div className="px-3 py-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  {t("userOptions.connectedAs")}
                </p>
                <p className="text-sm text-orange-500 font-semibold truncate mt-0.5">
                  {user.username}
                </p>
                <p className="text-xs text-zinc-400 truncate">{user.email}</p>
              </div>
              <Link
                to="/my-decks"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
              >
                <Book size={16} /> {t("userOptions.myDecks")}
              </Link>
              <Link
                to="/profile"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
              >
                <User size={16} /> {t("userOptions.myProfile")}
              </Link>
              <Link
                to="/friends"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
              >
                <Users size={16} /> {t("userOptions.myFriends")}
              </Link>
              <Link
                to="/messages"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
              >
                <MessageCircle size={16} />
                {t("messages.title")}
                {unreadCount > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to="/settings"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 transition-colors"
              >
                <Settings size={16} /> {t("userOptions.mySettings")}
              </Link>
              <div className="border-t border-zinc-800 my-2" />
              <button
                onClick={() => { logout(); setIsSidebarOpen(false); }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
              >
                <LogOut size={16} /> {t("userOptions.logout")}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setIsSidebarOpen(false); setIsAuthModalOpen(true); }}
              className="mx-3 mt-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg transition-all text-sm font-bold"
            >
              {t("userOptions.login")}
            </button>
          )}
        </nav>
      </aside>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Feedback Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* Beta Welcome Modal (new Google OAuth users) */}
      <BetaWelcomeModal isOpen={isBetaWelcomeOpen} onAccept={() => setIsBetaWelcomeOpen(false)} />

      {/* Feedback tooltip — shown once on first visit, always rendered regardless of banner state */}
      {showFeedbackTooltip && (
        <div className="fixed bottom-36 right-6 z-50 w-64 bg-zinc-800 border border-orange-500/40 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => { setShowFeedbackTooltip(false); setFabAlwaysVisible(true); }}
            className="absolute top-2 right-2 text-zinc-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-zinc-800 border-r border-b border-orange-500/40 rotate-45" />
          <p className="text-sm font-bold text-orange-400 mb-1">{t("beta.feedbackTooltipTitle")}</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{t("beta.feedbackTooltipBody")}</p>
        </div>
      )}

      {/* FAB — visible when banner is dismissed, tooltip is active, or user has already seen the tooltip */}
      {(!bannerVisible || showFeedbackTooltip || fabAlwaysVisible) && (
        <button
          onClick={() => { setIsFeedbackOpen(true); setShowFeedbackTooltip(false); }}
          className={`fixed bottom-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-900/30 transition-all active:scale-95 ${showFeedbackTooltip ? "animate-pulse" : ""}`}
          aria-label={t("beta.feedbackButton")}
        >
          <MessageSquarePlus size={16} />
          <span className="hidden sm:block">{t("beta.feedbackButton")}</span>
        </button>
      )}
    </div>
  );
};

export default Layout;
