import { useState, useEffect } from "react";
import { useUser } from "../../services/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import { API_URL } from "../../services/api";
import { Loader2, Mail } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "../../services/ToastContext";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const AuthModal = ({ isOpen = true, onClose }: AuthModalProps) => {
  const { t } = useTranslation();
  const { login, register, isAuthenticated } = useUser();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registrationDone, setRegistrationDone] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [betaAccepted, setBetaAccepted] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      showToast(t("auth.verifiedSuccess"), "success");
    }
    // Si ya está autenticado y accede a esta "página", redirigir fuera
    if (isAuthenticated && !onClose) {
      navigate("/");
    }
  }, [isAuthenticated, onClose, navigate, searchParams, showToast, t]);

  if (!isOpen) return null;

  const validate = (): string => {
    if (!username.trim()) return t("auth.error.usernameRequired");
    if (!password) return t("auth.error.passwordRequired");
    if (password.length < 6) return t("auth.error.passwordMinLength");
    if (!isLogin) {
      if (!email.trim()) return t("auth.error.emailRequired");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return t("auth.error.emailInvalid");
      if (!betaAccepted) return t("beta.betaCheckboxRequired");
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
        if (onClose) {
          onClose();
        } else {
          navigate("/");
        }
      } else {
        await register(username, email, password);
        setRegisteredEmail(email);
        setRegistrationDone(true);
      }
    } catch (err: any) {
      setError(
        err.message === "EMAIL_NOT_VERIFIED"
          ? t("auth.error.emailNotVerified")
          : err.message ||
              (isLogin
                ? t("auth.error.credentials")
                : t("auth.error.notImplemented")),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabSwitch = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setBetaAccepted(false);
    setRegistrationDone(false);
  };

  if (registrationDone) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Mail size={32} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t("auth.verifyEmail.title")}</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {t("auth.verifyEmail.description")}{" "}
            <span className="text-orange-400 font-medium">{registeredEmail}</span>.
            <br />
            {t("auth.verifyEmail.hint")}
          </p>
          <button
            className="mt-2 text-sm text-zinc-500 hover:text-white transition-colors"
            onClick={() => handleTabSwitch(true)}
          >
            {t("auth.verifyEmail.backToLogin")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex border-b border-zinc-800">
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              isLogin
                ? "text-orange-500 border-b-2 border-orange-500 bg-zinc-800/50"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
            }`}
            onClick={() => handleTabSwitch(true)}
          >
            {t("auth.loginTab")}
          </button>
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              !isLogin
                ? "text-orange-500 border-b-2 border-orange-500 bg-zinc-800/50"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
            }`}
            onClick={() => handleTabSwitch(false)}
          >
            {t("auth.registerTab")}
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">
                {t("auth.username")}
              </label>
              <input
                type="text"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all disabled:opacity-50"
                placeholder={t("auth.usernamePlaceholder")}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all disabled:opacity-50"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">
                {t("auth.password")}
              </label>
              <input
                type="password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all disabled:opacity-50"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                disabled={isLoading}
              />
            </div>

            {!isLogin && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-zinc-600 bg-zinc-950 text-orange-500 focus:ring-orange-500/50 cursor-pointer"
                  checked={betaAccepted}
                  onChange={(e) => { setBetaAccepted(e.target.checked); setError(""); }}
                  disabled={isLoading}
                />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                  {t("beta.betaCheckbox")}
                </span>
              </label>
            )}

            {error && <p className="text-orange-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 mt-4 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              {isLogin ? t("auth.loginButton") : t("auth.registerButton")}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900 text-zinc-500">
                  {t("auth.continueWith")}
                </span>
              </div>
            </div>

            <a
              href={`${API_URL}/oauth2/authorization/google`}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-all active:scale-95"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </a>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
