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
  EyeOff,
  Eye,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../../services/UserContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../services/LanguageContext';
import { useToast } from '../../services/ToastContext';
import { AuthService } from '../../services/AuthService';
import SEO from '../../components/ui/SEO';
import { AVATAR_OPTIONS, DEFAULT_AVATAR, getAvatarUrl } from '../../core/utils/avatar';
import { useAnalysisQuota } from '../../hooks/useAnalysisQuota';
import AnalysisQuotaSummary from '../../components/ui/AnalysisQuotaSummary';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Card, { CardTitle } from '../../components/ui/Card';

const Profile = () => {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();
  const { user, logout, updateUser } = useUser();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'personalInfo' | 'preferences'>('personalInfo');
  const newsletter = user?.newsletterSubscribed === true;
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const { quota } = useAnalysisQuota();

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'empty' | 'error'
  >('idle');

  const [biography, setBiography] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [draftAvatar, setDraftAvatar] = useState(DEFAULT_AVATAR);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;

    setUsername(user.username ?? '');
    setBiography(user.biography ?? '');
    setSelectedAvatar(user.avatar || DEFAULT_AVATAR);
    setDraftAvatar(user.avatar || DEFAULT_AVATAR);
    setUsernameStatus('idle');
  }, [user]);

  const trimmedUsername = username.trim();
  const usernameChanged = !!user && trimmedUsername !== (user.username ?? '');

  // Verificación en vivo contra la API, con debounce para no saturar el backend
  useEffect(() => {
    if (!user) return;

    if (!usernameChanged) {
      setUsernameStatus('idle');
      return;
    }
    if (!trimmedUsername) {
      setUsernameStatus('empty');
      return;
    }

    let cancelled = false;
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const available = await AuthService.isUsernameAvailable(trimmedUsername);
        if (!cancelled) setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        if (!cancelled) setUsernameStatus('error');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedUsername, usernameChanged, user]);

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

  const isUsernameBlocked =
    usernameChanged &&
    (usernameStatus === 'taken' || usernameStatus === 'empty' || usernameStatus === 'error');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasProfileChanges) return;

    if (!trimmedUsername) {
      showToast(t('profile.usernameEmpty'), 'error');
      return;
    }
    if (isUsernameBlocked || usernameStatus === 'checking') return;

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordMismatch'));
      return;
    }
    if (newPassword.trim().length === 0 || newPassword.length < 6) {
      setPasswordError(t('auth.error.passwordMinLength'));
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError(t('profile.passwordRejected'));
      return;
    }
    setPasswordError('');
    setPasswordLoading(true);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 2000);
    } catch (err: unknown) {
      setPasswordError(
        (err as Error).message === 'wrongPassword'
          ? t('profile.passwordWrong')
          : (err as Error).message === 'passwordRejected'
            ? t('profile.passwordRejected')
            : t('auth.error.credentials')
      );
    } finally {
      setPasswordLoading(false);
    }
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
              <button
                onClick={() => setActiveTab('personalInfo')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors shadow-sm ${
                  activeTab === 'personalInfo'
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <User size={18} /> {t('profile.personalInfo')}
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors shadow-sm ${
                  activeTab === 'preferences'
                    ? 'text-white bg-zinc-800'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                <Settings size={18} /> {t('profile.preferences')}
              </button>
              <button
                onClick={() => void logout()}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut size={18} /> {t('userOptions.logout')}
              </button>
            </nav>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
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
                        !hasProfileChanges || isUsernameBlocked || usernameStatus === 'checking'
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
                    onClick={() => {
                      setShowPasswordForm(!showPasswordForm);
                      setPasswordError('');
                      setPasswordSuccess(false);
                    }}
                    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    {t('profile.changePassword')}
                  </button>

                  {showPasswordForm && (
                    <form onSubmit={handleChangePassword} className="space-y-4 pt-2" noValidate>
{(
                        [
                          ['currentPassword', currentPassword, showCurrent, setShowCurrent],
                          ['newPassword', newPassword, showNew, setShowNew],
                          ['confirmPassword', confirmPassword, showConfirm, setShowConfirm],
                        ] as const
                      ).map(([field, value, visible, setVisible]) => (
                        <PasswordField
                          key={field}
                          id={`profile-${field}`}
                          label={t(`profile.${field}`)}
                          value={value}
                          visible={visible}
                          disabled={passwordLoading}
                          onVisibleChange={() => setVisible(!visible)}
                          onChange={(next) => {
                            if (field === 'currentPassword') setCurrentPassword(next);
                            else if (field === 'newPassword') setNewPassword(next);
                            else setConfirmPassword(next);
                            setPasswordError('');
                          }}
                        />
                      ))}

                      {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                      {passwordSuccess && (
                        <p className="text-green-400 text-sm flex items-center gap-1">
                          <CheckCircle size={14} /> {t('profile.passwordChanged')}
                        </p>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button type="submit" size="sm" loading={passwordLoading}>
                          {t('profile.editProfileButton')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordError('');
                          }}
                        >
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
                      checked={newsletter}
                      onChange={(e) => void saveNewsletter(e.target.checked)}
                      disabled={newsletterSaving}
                      aria-label={t('profile.newsletter')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
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

interface AvatarPickerModalProps {
  isOpen: boolean;
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
  onClose: () => void;
  onApply: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  disabled?: boolean;
  onVisibleChange: () => void;
  onChange: (value: string) => void;
}

/**
 * Campo de contraseña con el interruptor de visibilidad. Antes estaba
 * copiado tres veces con tres estados booleanos distintos.
 */
function PasswordField({
  id,
  label,
  value,
  visible,
  disabled,
  onVisibleChange,
  onChange,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-surface-sunken border border-zinc-800 rounded-control py-2.5 px-4 pr-10 text-white transition-all disabled:opacity-50 focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={onVisibleChange}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

const AvatarPickerModal = ({
  isOpen,
  selectedAvatar,
  onSelect,
  onClose,
  onApply,
  t,
}: AvatarPickerModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="h-full w-full bg-zinc-900 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl sm:border sm:border-zinc-800 sm:shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 sm:px-6">
          <div>
            <h3 className="text-lg font-bold text-white">{t('profile.avatarModalTitle')}</h3>
            <p className="text-sm text-zinc-400 mt-1">{t('profile.avatarDescription')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
            aria-label={t('common.cancel')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-6 border-b border-zinc-800">
          <div className="flex items-center gap-4 rounded-2xl bg-zinc-950 border border-zinc-800 p-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-orange-500/40 shadow-inner shrink-0">
              <img
                src={getAvatarUrl(selectedAvatar)}
                alt={t('profile.avatarSelected')}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('profile.avatarSelected')}</p>
              <p className="text-xs text-zinc-500 mt-1">{selectedAvatar}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
            {AVATAR_OPTIONS.map((avatar, index) => {
              const isSelected = avatar === selectedAvatar;
              return (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => onSelect(avatar)}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-orange-500 ring-2 ring-orange-500/30'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                  aria-label={t('profile.avatarOptionAlt', {
                    number: index + 1,
                  })}
                  aria-pressed={isSelected}
                >
                  <img
                    src={getAvatarUrl(avatar)}
                    alt={t('profile.avatarOptionAlt', {
                      number: index + 1,
                    })}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  {isSelected && (
                    <span className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="bg-orange-500 text-white text-xs font-bold rounded-full px-2 py-1">
                        {t('profile.selected')}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-zinc-800 px-4 py-4 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onApply}>{t('profile.applyAvatar')}</Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
