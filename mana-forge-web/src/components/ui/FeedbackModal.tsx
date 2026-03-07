import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useUser } from "../../services/UserContext";
import { api } from "../../services/api";

const CATEGORIES = ["AI", "FEATURE", "BUG", "SUGGESTION", "UI", "OTHER"] as const;
type Category = typeof CATEGORIES[number];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal = ({ isOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const { user } = useUser();

  const [category, setCategory] = useState<Category | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setSent(false);
    setCategory(null);
    setAnonymous(false);
    setEmail(user?.email ?? "");
    setSummary("");
    setDescription("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError(t("feedback.categoryRequired")); return; }
    if (!summary.trim()) { setError(t("feedback.summaryRequired")); return; }
    setError("");
    setIsLoading(true);
    try {
      await api.post("/feedback", {
        category,
        summary: summary.trim(),
        description: description.trim() || null,
        email: anonymous ? null : (email.trim() || null),
      });
      setSent(true);
    } catch {
      setError(t("feedback.errorBody"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white">{t("feedback.title")}</h3>
          <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 size={48} className="text-orange-500" />
            <h4 className="text-xl font-bold text-white">{t("feedback.successTitle")}</h4>
            <p className="text-zinc-400 text-sm">{t("feedback.successBody")}</p>
            <button onClick={handleClose} className="mt-2 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all">
              OK
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Category chips */}
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">{t("feedback.categoryLabel")}</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategory(cat); setError(""); }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      category === cat
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-orange-500/50"
                    }`}
                  >
                    {t(`feedback.categories.${cat}` as any)}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">{t("feedback.summaryLabel")}</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={100}
                  value={summary}
                  onChange={(e) => { setSummary(e.target.value); setError(""); }}
                  placeholder={t("feedback.summaryPlaceholder")}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <span className="absolute right-3 bottom-2 text-xs text-zinc-600">{summary.length}/100</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">{t("feedback.descriptionLabel")}</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("feedback.descriptionPlaceholder")}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
              />
            </div>

            {/* Anonymous toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-orange-500 focus:ring-orange-500/50"
              />
              <span className="text-sm text-zinc-400">{t("feedback.anonymousLabel")}</span>
            </label>

            {/* Email field (visible if not anonymous) */}
            {!anonymous && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">{t("feedback.emailLabel")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            )}

            {error && <p className="text-orange-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {isLoading ? t("feedback.submitting") : t("feedback.submit")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
