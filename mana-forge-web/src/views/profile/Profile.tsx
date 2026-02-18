import { User, Mail, Shield, Settings, Save, LogOut, Lock, Globe, Bell, Loader2, CheckCircle, EyeOff, Eye } from "lucide-react";
import { useUser } from "../../services/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useLanguage } from "../../services/LanguageContext";
import { useState } from "react";
import { AuthService } from "../../services/AuthService";

const Profile = () => {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"personalInfo" | "preferences">("personalInfo");
  const [newsletter, setNewsletter] = useState(true);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.passwordMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("auth.error.passwordMinLength"));
      return;
    }
    setPasswordError("");
    setPasswordLoading(true);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(
        err.message === "wrongPassword"
          ? t("profile.passwordWrong")
          : t("auth.error.credentials")
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  // Mock avatar fijo como se solicitó
  const avatarUrl =
    "https://api.scryfall.com/cards/named?exact=Jace%2C%20the%20Mind%20Sculptor&format=image&version=art_crop";

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] text-white">
        <p>{t("profile.loadingProfile")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 pb-12">
      <h1 className="text-3xl font-bold text-white mb-8">
        {t("profile.title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar / User Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center shadow-lg">
            <div className="relative w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-zinc-800 shadow-inner">
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-bold text-white">{user.username}</h2>
            <p className="text-zinc-400 text-sm">{user.email}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
              <Shield size={12} /> Planeswalker
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-lg">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("personalInfo")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors shadow-sm ${
                  activeTab === "personalInfo"
                    ? "text-white bg-zinc-800"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                <User size={18} /> {t("profile.personalInfo")}
              </button>
              <button
                onClick={() => setActiveTab("preferences")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors shadow-sm ${
                  activeTab === "preferences"
                    ? "text-white bg-zinc-800"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                <Settings size={18} /> {t("profile.preferences")}
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors">
                <LogOut size={18} /> {t("userOptions.logout")}
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content / Forms */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "personalInfo" && (
            <>
              {/* Personal Info */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <User size={20} className="text-orange-500" />{" "}
                  {t("profile.editProfile")}
                </h3>

                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300">
                        {t("profile.username")}
                      </label>
                      <div className="relative">
                        <User
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                          size={18}
                        />
                        <input
                          type="text"
                          defaultValue={user.username}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300">
                        {t("profile.email")}
                      </label>
                      <div className="relative">
                        <Mail
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                          size={18}
                        />
                        <input
                          type="email"
                          defaultValue={user.email}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">
                      {t("profile.biography")}
                    </label>
                    <textarea
                      defaultValue={user.biography}
                      rows={4}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none placeholder:text-zinc-600"
                    ></textarea>
                    <p className="text-xs text-zinc-500">
                      {t("profile.biographyDescription")}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-800 flex justify-end">
                    <button
                      type="button"
                      className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-orange-900/20"
                    >
                      <Save size={18} /> {t("profile.editProfileButton")}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Lock size={20} className="text-indigo-500" />{" "}
                  {t("profile.security")}
                </h3>
                <div className="space-y-4">
                  <button
                    onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordError(""); setPasswordSuccess(false); }}
                    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    {t("profile.changePassword")}
                  </button>

                  {showPasswordForm && (
                    <form onSubmit={handleChangePassword} className="space-y-4 pt-2" noValidate>
                      {/* Current password */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-400">{t("profile.currentPassword")}</label>
                        <div className="relative">
                          <input
                            type={showCurrent ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }}
                            disabled={passwordLoading}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 pr-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                          />
                          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* New password */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-400">{t("profile.newPassword")}</label>
                        <div className="relative">
                          <input
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                            disabled={passwordLoading}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 pr-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                          />
                          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm password */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-400">{t("profile.confirmPassword")}</label>
                        <div className="relative">
                          <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                            disabled={passwordLoading}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-4 pr-10 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                          />
                          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                      {passwordSuccess && (
                        <p className="text-green-400 text-sm flex items-center gap-1">
                          <CheckCircle size={14} /> {t("profile.passwordChanged")}
                        </p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          {t("profile.editProfileButton")}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPasswordForm(false); setPasswordError(""); }}
                          className="px-5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                        {t("common.cancel")}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="h-px bg-zinc-800"></div>
                  <button className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors">
                    {t("profile.deleteAccount")}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "preferences" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings size={20} className="text-orange-500" />{" "}
                {t("profile.preferencesTitle")}
              </h3>

              <div className="space-y-8">
                {/* Language Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <Globe size={20} className="text-zinc-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">
                          {t("profile.language")}
                        </h4>
                        <p className="text-sm text-zinc-400">
                          {t("profile.languageDescription")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setLocale("es")}
                      className={`px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        locale === "es"
                          ? "bg-orange-500/10 border-orange-500 text-orange-400"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-2xl">🇪🇸</span> Español
                    </button>
                    <button
                      onClick={() => setLocale("en")}
                      className={`px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        locale === "en"
                          ? "bg-orange-500/10 border-orange-500 text-orange-400"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-2xl">🇺🇸</span> English
                    </button>
                  </div>
                </div>

                <div className="h-px bg-zinc-800"></div>

                {/* Newsletter Subscription */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <Bell size={20} className="text-zinc-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        {t("profile.newsletter")}
                      </h4>
                      <p className="text-sm text-zinc-400">
                        {t("profile.newsletterDescription")}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
