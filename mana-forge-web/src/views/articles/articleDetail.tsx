import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, User, Loader2 } from "lucide-react";
import { ArticleService } from "../../services/ArticleService";
import { type Article } from "../../core/models/Article";
import { useLanguage } from "../../services/LanguageContext";
import { useTranslation } from "../../hooks/useTranslation";

const ArticleDetail = () => {
  const params = useParams();
  // Intentamos obtener 'documentId'. Si tu ruta es /articles/:id, usamos 'id' como respaldo.
  const documentId = params.documentId || params.id || params.articleId;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { locale } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    console.log("ArticleDetail Params:", params);
    console.log("Buscando artículo con ID:", documentId, "Locale:", locale);

    const fetchArticle = async () => {
      if (!documentId) {
        setArticle(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const fetchedArticle = await ArticleService.getArticle(
        documentId as string,
        locale
      );
      setArticle(fetchedArticle);
      setLoading(false);
    };

    fetchArticle();
  }, [documentId, locale]);

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
          {t("articles.notFoundTitle")}
        </h2>
        <p className="text-zinc-400 mb-8">
          {t("articles.notFoundDescription")}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft size={20} /> {t("articles.backToHome")}
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
            <ArrowLeft size={16} /> {t("common.back")}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1 text-zinc-400 text-sm bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
              <Calendar size={14} />{" "}
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString(locale)
                : ""}
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
                {t("articles.writtenBy")} {article.author || t("articles.anonymous")}
              </p>
              <p className="text-zinc-500 text-xs">{t("articles.contributor")}</p>
            </div>
          </div>

          <div
            className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-zinc-300 prose-a:text-orange-500 hover:prose-a:text-orange-400 prose-strong:text-white prose-li:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: article.content || "" }}
          />
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
