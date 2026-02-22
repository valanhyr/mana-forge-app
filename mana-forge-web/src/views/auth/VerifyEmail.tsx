import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AuthService } from "../../services/AuthService";
import { useTranslation } from "../../hooks/useTranslation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

type Status = "loading" | "success" | "error";

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      return;
    }

    AuthService.verifyEmail(token)
      .then(() => {
        setStatus("success");
        setTimeout(() => navigate("/login?verified=true"), 2000);
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-10 flex flex-col items-center text-center gap-5 shadow-2xl">
        {status === "loading" && (
          <>
            <Loader2 size={48} className="text-orange-500 animate-spin" />
            <p className="text-zinc-300 text-lg font-medium">{t("common.loading")}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={48} className="text-green-500" />
            <h2 className="text-2xl font-bold text-white">{t("auth.verifiedSuccess")}</h2>
            <p className="text-zinc-400 text-sm">{t("common.loading")}</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={48} className="text-red-500" />
            <h2 className="text-2xl font-bold text-white">
              {t("auth.verifyEmail.title")}
            </h2>
            <p className="text-zinc-400 text-sm">
              El enlace de verificación no es válido o ha expirado.
            </p>
            <button
              className="mt-2 text-sm text-orange-500 hover:text-orange-400 transition-colors"
              onClick={() => navigate("/login")}
            >
              {t("auth.verifyEmail.backToLogin")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
