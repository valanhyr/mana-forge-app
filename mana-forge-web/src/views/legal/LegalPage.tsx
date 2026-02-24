import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { LegalService } from "../../services/LegalService";
import { type LegalPage } from "../../core/models/LegalPage";
import { useLanguage } from "../../services/LanguageContext";
import { useTranslation } from "../../hooks/useTranslation";

const SLUG_LABELS: Record<string, string> = {
  "privacy-policy": "footer.privacy",
  "terms-and-conditions": "footer.terms",
  "cookie-policy": "footer.cookies",
};

const LegalPageView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const { locale } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    if (!slug) {
      setPage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    LegalService.getBySlug(slug, locale).then((data) => {
      setPage(data);
      setLoading(false);
    });
  }, [slug, locale]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-4">
          {t("legal.notFoundTitle")}
        </h2>
        <p className="text-zinc-400 mb-8">{t("legal.notFoundDescription")}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft size={20} /> {t("legal.backToHome")}
        </Link>
      </div>
    );
  }

  const sectionLabel = slug ? SLUG_LABELS[slug] : undefined;

  return (
    <div className="min-h-screen pb-16">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link
            to="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors text-sm w-fit"
          >
            <ArrowLeft size={16} /> {t("common.back")}
          </Link>

          <div>
            {sectionLabel && (
              <span className="block text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                {t("footer.legal")}
              </span>
            )}
            <h1 className="text-4xl font-bold text-white">{page.title}</h1>
          </div>

          <p className="mt-3 flex items-center gap-2 text-zinc-500 text-sm">
            <Calendar size={14} />
            {t("legal.lastUpdated")}{" "}
            {new Date(page.lastUpdated).toLocaleDateString(locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Table of contents */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <nav className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            {t("legal.tableOfContents")}
          </p>
          <ol className="list-decimal list-inside space-y-1">
            {page.sections.map((section, idx) => (
              <li key={idx}>
                <a
                  href={`#section-${idx}`}
                  className="text-zinc-300 hover:text-orange-400 transition-colors text-sm"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10">
          {page.sections.map((section, idx) => (
            <section key={idx} id={`section-${idx}`}>
              <h2 className="text-xl font-semibold text-white mb-4 pb-2 border-b border-zinc-800">
                {section.heading}
              </h2>
              <div
                className="prose prose-invert max-w-none prose-p:text-zinc-300 prose-li:text-zinc-300 prose-a:text-orange-500 hover:prose-a:text-orange-400 prose-strong:text-white"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalPageView;
