import { useState } from "react";
import { useUser } from "../../services/UserContext";
import { useTranslation } from "../../hooks/useTranslation";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const AuthModal = ({ isOpen = true, onClose }: AuthModalProps) => {
  const { t } = useTranslation();
  const { login, register } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(username, password);
        onClose?.();
      } else {
        await register(username, email, password);
        onClose?.();
      }
    } catch (err: any) {
      setError(
        err.message ||
          (isLogin ? t("auth.error.credentials") : "Error al crear la cuenta"),
      );
    }
  };

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
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
          >
            {t("auth.loginTab")}
          </button>
          <button
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              !isLogin
                ? "text-orange-500 border-b-2 border-orange-500 bg-zinc-800/50"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
            }`}
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
          >
            {t("auth.registerTab")}
          </button>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">
                {t("auth.username")}
              </label>
              <input
                type="text"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                placeholder={t("auth.usernamePlaceholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">
                {t("auth.password")}
              </label>
              <input
                type="password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-orange-500 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 mt-4"
            >
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
              href="http://localhost:8080/oauth2/authorization/google"
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
