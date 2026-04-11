import { useEffect, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { useLanguage } from "../../services/LanguageContext";

const STORAGE_KEY = "manaforge_whats_new_seen";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface ReleaseNotes {
  version: string;
  features: {
    es: Feature[];
    en: Feature[];
  };
}

interface WhatsNewData {
  releases: ReleaseNotes[];
}

const compareVersionsDesc = (left: string, right: string) => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const maxParts = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxParts; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return rightPart - leftPart;
    }
  }

  return 0;
};

const WhatsNewModal = () => {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<WhatsNewData | null>(null);
  const [showOlderReleases, setShowOlderReleases] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/whats-new.json");
        const json: WhatsNewData = await res.json();
        const releases = [...json.releases].sort((a, b) =>
          compareVersionsDesc(a.version, b.version),
        );
        const latestRelease = releases[0];
        if (!latestRelease) return;
        const seenVersion = localStorage.getItem(STORAGE_KEY);
        if (seenVersion !== latestRelease.version) {
          setData({ releases });
          setIsOpen(true);
        }
      } catch {
        // silently fail — non-critical feature
      }
    };
    load();
  }, []);

  const handleClose = () => {
    if (data?.releases[0]) {
      localStorage.setItem(STORAGE_KEY, data.releases[0].version);
    }
    setIsOpen(false);
    setShowOlderReleases(false);
  };

  if (!isOpen || !data) return null;

  const lang = locale === "es" ? "es" : "en";
  const [latestRelease, ...olderReleases] = data.releases;
  const latestFeatures = latestRelease.features[lang] ?? latestRelease.features.en;
  const toggleLabel = showOlderReleases
    ? lang === "es"
      ? "Ocultar versiones anteriores"
      : "Hide previous versions"
    : lang === "es"
      ? "Ver versiones anteriores"
      : "See previous versions";

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
                ? `Versión ${latestRelease.version} · Gracias a vuestro feedback durante la beta`
                : `Version ${latestRelease.version} · Thanks to your beta feedback`}
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
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-[0.2em]">
                {lang === "es" ? `Versión ${latestRelease.version}` : `Version ${latestRelease.version}`}
              </h3>
              <span className="text-[11px] text-zinc-500 uppercase tracking-[0.2em]">
                {lang === "es" ? "Último release" : "Latest release"}
              </span>
            </div>

            {latestFeatures.map((feature, index) => (
              <div key={`${latestRelease.version}-${index}`} className="flex gap-3">
                <span className="text-xl leading-tight flex-shrink-0 mt-0.5">{feature.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{feature.title}</p>
                  <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </section>

          {olderReleases.length > 0 && (
            <section className="border-t border-zinc-800 pt-4">
              <button
                onClick={() => setShowOlderReleases((current) => !current)}
                className="w-full flex items-center justify-between gap-3 text-left text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
              >
                <span>{toggleLabel}</span>
                <ChevronDown
                  size={18}
                  className={`transition-transform ${showOlderReleases ? "rotate-180" : ""}`}
                />
              </button>

              {showOlderReleases && (
                <div className="mt-4 space-y-6">
                  {olderReleases.map((release) => {
                    const releaseFeatures = release.features[lang] ?? release.features.en;
                    return (
                      <div key={release.version} className="space-y-4">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">
                          {lang === "es" ? `Versión ${release.version}` : `Version ${release.version}`}
                        </h4>
                        {releaseFeatures.map((feature, index) => (
                          <div key={`${release.version}-${index}`} className="flex gap-3">
                            <span className="text-xl leading-tight flex-shrink-0 mt-0.5">
                              {feature.icon}
                            </span>
                            <div>
                              <p className="text-white font-semibold text-sm">{feature.title}</p>
                              <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
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
