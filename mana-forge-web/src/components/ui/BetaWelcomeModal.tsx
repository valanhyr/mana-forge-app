import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onAccept: () => void;
}

const BetaWelcomeModal = ({ isOpen, onAccept }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await api.patch("/users/me", { betaAccepted: true });
    } catch {
      // non-blocking — beta acceptance is best-effort
    } finally {
      setIsLoading(false);
      navigate("/profile", { replace: true });
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
          <FlaskConical size={32} className="text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">{t("beta.welcomeTitle")}</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">{t("beta.welcomeBody")}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{t("beta.infoBody")}</p>
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="mt-2 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all"
        >
          {t("beta.welcomeAccept")}
        </button>
      </div>
    </div>
  );
};

export default BetaWelcomeModal;
