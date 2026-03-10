import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { useLanguage } from "../../services/LanguageContext";

const STORAGE_KEY = "manaforge_whats_new_seen";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface WhatsNewData {
  version: string;
  features: {
    es: Feature[];
    en: Feature[];
  };
}

const WhatsNewModal = () => {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<WhatsNewData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/whats-new.json");
        const json: WhatsNewData = await res.json();
        const seenVersion = localStorage.getItem(STORAGE_KEY);
        if (seenVersion !== json.version) {
          setData(json);
          setIsOpen(true);
        }
      } catch {
        // silently fail — non-critical feature
      }
    };
    load();
  }, []);

  const handleClose = () => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, data.version);
    }
    setIsOpen(false);
  };

  if (!isOpen || !data) return null;

  const lang = locale === "es" ? "es" : "en";
  const features = data.features[lang] ?? data.features.en;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleClose}
    >
      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-900/60 to-orange-900/40 border-b border-zinc-800 px-6 py-5 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40">
            <Sparkles size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">
              {lang === "es" ? "¡Novedades de Mana Forge!" : "What's New in Mana Forge!"}
            </h2>
            <p className="text-zinc-400 text-xs mt-0.5">
              {lang === "es"
                ? `Versión ${data.version} · Gracias a vuestro feedback durante la beta`
                : `Version ${data.version} · Thanks to your beta feedback`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature list */}
        <div className="px-6 py-4 space-y-4 max-h-[55vh] overflow-y-auto">
          {features.map((f, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-xl leading-tight flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-colors active:scale-95"
          >
            {lang === "es" ? "¡Entendido!" : "Got it!"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
