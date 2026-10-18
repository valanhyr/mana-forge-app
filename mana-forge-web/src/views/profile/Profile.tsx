import {
  User,
  Mail,
  Shield,
  Settings,
  LogOut,
  Lock,
  Pencil,
  Globe,
  Bell,
  CheckCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '../../services/UserContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../services/LanguageContext';
import { useToast } from '../../services/ToastContext';
import { AuthService } from '../../services/AuthService';
import SEO from '../../components/ui/SEO';
import { DEFAULT_AVATAR, getAvatarUrl } from '../../core/utils/avatar';
import { useAnalysisQuota } from '../../hooks/useAnalysisQuota';
import AnalysisQuotaSummary from '../../components/ui/AnalysisQuotaSummary';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Card, { CardTitle } from '../../components/ui/Card';
import PasswordField from '../../components/ui/PasswordField';
import AvatarPickerModal from '../../components/ui/AvatarPickerModal';
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability';
import { usePasswordForm } from '../../hooks/usePasswordForm';

type TabId = 'personalInfo' | 'preferences';

const TABS: { id: TabId; labelKey: string; icon: typeof User }[] = [
  { id: 'personalInfo', labelKey: 'profile.personalInfo', icon: User },
  { id: 'preferences', labelKey: 'profile.preferences', icon: Settings },
];

const PASSWORD_FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const;

const Profile = () => {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();
  const { user, logout, updateUser } = useUser();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('personalInfo');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    personalInfo: null,
    preferences: null,
  });

  // Navegación de tabs por teclado, como espera el patrón ARIA de tablist.
  const handleTabKeyDown = (event: React.KeyboardEvent, current: TabId) => {
    const offset =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (offset === 0) return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === current);
    const next = TABS[(index + offset + TABS.length) % TABS.length];
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  };
  const newsletter = user?.newsletterSubscribed === true;
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const { quota } = useAnalysisQuota();

  const [username, setUsername] = useState('');
  const [biography, setBiography] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [draftAvatar, setDraftAvatar] = useState(DEFAULT_AVATAR);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const availability = useUsernameAvailability(username, user?.username ?? '');
  const {
    status: usernameStatus,
    isBlocked: isUsernameBlocked,
    isChecking: isUsernameChecking,
    setStatus: setUsernameStatus,
    changed: usernameChanged,
    trimmed: trimmedUsername,
  } = availability;

  const password = usePasswordForm(t);

  useEffect(() => {
    if (!user) return;

    setUsername(user.username ?? '');
    setBiography(user.biography ?? '');
    setSelectedAvatar(user.avatar || DEFAULT_AVATAR);
    setDraftAvatar(user.avatar || DEFAULT_AVATAR);
    setUsernameStatus('idle');
  }, [user, setUsernameStatus]);

  const avatarUrl = useMemo(() => getAvatarUrl(selectedAvatar), [selectedAvatar]);

  const openAvatarModal = () => {
    setDraftAvatar(selectedAvatar);
    setIsAvatarModalOpen(true);
  };

  const closeAvatarModal = () => {
    setDraftAvatar(selectedAvatar);
    setIsAvatarModalOpen(false);
  };

  const applyAvatarSelection = () => {
    setSelectedAvatar(draftAvatar);
    setIsAvatarModalOpen(false);
  };

  const hasProfileChanges =
    !!user &&
    (usernameChanged ||
      biography.trim() !== (user.biography ?? '') ||
      selectedAvatar !== (user.avatar || DEFAULT_AVATAR));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasProfileChanges) return;

    if (!trimmedUsername) {
      showToast(t('profile.usernameEmpty'), 'error');
      return;
    }
    if (isUsernameBlocked || isUsernameChecking) return;

    setProfileLoading(true);
    try {
      const updatedUser = await AuthService.updateProfile({
        ...(usernameChanged ? { username: trimmedUsername } : {}),
        biography: biography.trim(),
        avatar: selectedAvatar,
      });
      updateUser(updatedUser);
      setUsername(updatedUser.username ?? '');
      setUsernameStatus('idle');
      setBiography(updatedUser.biography ?? '');
      setSelectedAvatar(updatedUser.avatar || DEFAULT_AVATAR);
      showToast(t('profile.saveSuccess'), 'success');
    } catch (err: unknown) {
      if ((err as Error).message === 'USERNAME_TAKEN') {
        setUsernameStatus('taken');
        showToast(t('profile.usernameTaken'), 'error');
      } else {
        showToast(t('profile.saveError'), 'error');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    void password.submit(password.values);
  };

  const saveNewsletter = async (subscribed: boolean) => {
    if (!user || newsletterSaving) return;
    setNewsletterSaving(true);
    try {
      const result = await AuthService.setNewsletterPreference(subscribed);
      updateUser({ ...user, newsletterSubscribed: result.subscribed });
      showToast(t('profile.saveSuccess'), 'success');
    } catch { showToast(t('profile.saveError'), 'error'); }
    finally { setNewsletterSaving(false); }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] text-white">
        <p>{t('profile.loadingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 pb-12">
      <SEO title={t('seo.profileTitle')} description={t('seo.profileDescription')} />
      <h1 className="text-3xl font-bold text-white mb-8">{t('profile.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-zinc-800 shadow-inner">
                <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={openAvatarModal}
                className="absolute -bottom-1 -right-1 flex items-center justify-center w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-500 text-white border-2 border-zinc-900 shadow-lg transition-colors"
                aria-label={t('profile.editAvatar')}
              >
                <Pencil size={16} />
              </button>
            </div>
            <h2 className="text-xl font-bold text-white">{user.username}</h2>
            <p className="text-zinc-400 text-sm">{user.email}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">
              <Shield size={12} /> {t('profile.rankTitle')}
            </div>
          </Card>

          <Card className="p-2">
            <nav className="space-y-1">
              <div role="tablist" aria-orientation="vertical" className="space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    id={`profile-tab-${tab.id}`}
                    role="tab"
                    type="button"
                    aria-selected={activeTab === tab.id}
                    aria-controls="profile-tabpanel"
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors shadow-sm ${
                      activeTab === tab.id
                        ? 'text-white bg-zinc-800'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    <tab.icon size={18} /> {t(tab.labelKey)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => void logout()}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut size={18} /> {t('userOptions.logout')}
              </button>
            </nav>
          </Card>
        </div>

        <div
          className="lg:col-span-2 space-y-6"
          role="tabpanel"
          id="profile-tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
        >
          {activeTab === 'personalInfo' && (
            <>
              <Card className="p-8">
                <CardTitle className="mb-6" icon={<User size={20} className="text-brand-500" />}>
                  {t('profile.editProfile')}
                </CardTitle>

                <form className="space-y-6" onSubmit={handleSaveProfile}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label={t('profile.username')}
                      icon={<User size={18} />}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={profileLoading}
                      error={
                        usernameChanged && usernameStatus === 'taken'
                          ? t('profile.usernameTaken')
                          : usernameChanged && usernameStatus === 'empty'
                            ? t('profile.usernameEmpty')
                            : undefined
                      }
                      hint={
                        usernameChanged && usernameStatus !== 'idle' && usernameStatus !== 'taken'
                          ? usernameStatus === 'available'
                            ? t('profile.usernameAvailable')
                            : usernameStatus === 'checking'
                              ? t('profile.usernameChecking')
                              : usernameStatus === 'empty'
                                ? t('profile.usernameEmpty')
                                : usernameStatus === 'error'
                                  ? t('profile.usernameCheckError')
                                  : undefined
                          : undefined
                      }
                    />

                    <Input
                      label={t('profile.email')}
                      icon={<Mail size={18} />}
                      type="email"
                      value={user.email}
                      disabled
                    />
                  </div>

                  <Textarea
                    label={t('profile.biography')}
                    hint={t('profile.biographyDescription')}
                    value={biography}
                    onChange={(e) => setBiography(e.target.value)}
                    rows={4}
                  />

                  <div className="pt-4 border-t border-zinc-800 flex justify-end">
                    <Button
                      type="submit"
                      loading={profileLoading}
                      disabled={
                        !hasProfileChanges || isUsernameBlocked || isUsernameChecking
                      }
                    >
                      {profileLoading ? t('common.saving') : t('profile.editProfileButton')}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="p-8">
                <CardTitle className="mb-6" icon={<Lock size={20} className="text-indigo-500" />}>
                  {t('profile.security')}
                </CardTitle>
                <div className="space-y-4">
                  <button
                    onClick={() => (password.isOpen ? password.close() : password.open())}
                    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    {t('profile.changePassword')}
                  </button>

                  {password.isOpen && (
                    <form onSubmit={handleChangePassword} className="space-y-4 pt-2" noValidate>
                      {PASSWORD_FIELDS.map((field) => (
                        <PasswordField
                          key={field}
                          id={`profile-${field}`}
                          label={t(`profile.${field}`)}
                          value={password.values[field]}
                          visible={password.visible[field]}
                          disabled={password.loading}
                          onVisibleChange={() => password.toggleVisibility(field)}
                          toggleLabel={`${t(
                            password.visible[field]
                              ? 'profile.hidePassword'
                              : 'profile.showPassword'
                          )}: ${t(`profile.${field}`)}`}
                          onChange={(next) => password.setValue(field, next)}
                        />
                      ))}

                      <div role="status" aria-live="polite">
                        {password.error && <p className="text-red-400 text-sm">{password.error}</p>}
                        {password.success && (
                          <p className="text-green-400 text-sm flex items-center gap-1">
                            <CheckCircle size={14} /> {t('profile.passwordChanged')}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button type="submit" size="sm" loading={password.loading}>
                          {t('profile.editProfileButton')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={password.close}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="h-px bg-zinc-800"></div>
                  <Button variant="destructive" size="sm">
                    {t('profile.deleteAccount')}
                  </Button>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'preferences' && (
            <Card className="p-8">
              <CardTitle className="mb-6" icon={<Settings size={20} className="text-brand-500" />}>
                {t('profile.preferencesTitle')}
              </CardTitle>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <Globe size={20} className="text-zinc-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{t('profile.language')}</h4>
                        <p className="text-sm text-zinc-400">{t('profile.languageDescription')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setLocale('es')}
                      className={`px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        locale === 'es'
                          ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-2xl">🇪🇸</span> Español
                    </button>
                    <button
                      onClick={() => setLocale('en')}
                      className={`px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                        locale === 'en'
                          ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-2xl">🇺🇸</span> English
                    </button>
                  </div>
                </div>

                <div className="h-px bg-zinc-800"></div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <Bell size={20} className="text-zinc-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{t('profile.newsletter')}</h4>
                      <p className="text-sm text-zinc-400">{t('profile.newsletterDescription')}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      role="switch"
                      aria-checked={newsletter}
                      checked={newsletter}
                      onChange={(e) => void saveNewsletter(e.target.checked)}
                      disabled={newsletterSaving}
                      aria-label={t('profile.newsletter')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-900"></div>
                  </label>
                </div>
                <section className="border-t border-zinc-800 pt-4">
                  <h4 className="font-medium text-white mb-2">{t('usage.title')}</h4>
                  <AnalysisQuotaSummary quota={quota} />
                </section>
              </div>
            </Card>
          )}
        </div>
      </div>

      <AvatarPickerModal
        isOpen={isAvatarModalOpen}
        selectedAvatar={draftAvatar}
        onSelect={setDraftAvatar}
        onClose={closeAvatarModal}
        onApply={applyAvatarSelection}
        t={t}
      />
    </div>
  );
};

export default Profile;
