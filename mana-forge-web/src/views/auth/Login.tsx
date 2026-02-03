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
          (isLogin ? t("auth.error.credentials") : "Error al crear la cuenta")
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
