import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronDown, Cookie } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

type CookiePreferences = {
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
};

interface CategoryProps {
  title: string;
  description: string;
  checked: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  alwaysActiveLabel?: string;
  recommendedLabel?: string;
}

const PreferenceCategory: React.FC<CategoryProps> = ({
  title,
  description,
  checked,
  onChange,
  disabled = false,
  alwaysActiveLabel,
  recommendedLabel,
}) => {
  const [isOpen, setIsOpen] = useState(disabled); // Functional is open by default

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className="border-b border-zinc-800 last:border-b-0"
    >
      <summary className="flex items-center justify-between py-3 cursor-pointer list-none -webkit-details-marker:hidden">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={checked}
              onChange={onChange}
              disabled={disabled}
            />
            <div className="w-9 h-5 bg-zinc-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600 peer-disabled:bg-zinc-800 peer-disabled:peer-checked:bg-green-600/50"></div>
          </label>
          <span className="font-semibold text-zinc-200 text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {disabled && (
            <span className="text-xs text-green-400 font-bold">{alwaysActiveLabel}</span>
          )}
          {recommendedLabel && (
            <span className="text-xs text-blue-400 font-bold">{recommendedLabel}</span>
          )}
          <ChevronDown
            size={20}
            className={`text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </summary>
      <div className="pb-4 pl-12 text-xs text-zinc-400">{description}</div>
    </details>
  );
};

const CookieConsent = () => {
  const { t } = useTranslation();
  const storedConsent = localStorage.getItem('cookie_consent');
  const [isVisible, setIsVisible] = useState(!!storedConsent);
  const [isMinimized, setIsMinimized] = useState(!!storedConsent);
  const [showPreferences, setShowPreferences] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>({
    preferences: true,
    statistics: true,
    marketing: true,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsMinimized(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    const finalConsent = { functional: true, ...cookiePrefs };
    localStorage.setItem('cookie_consent', JSON.stringify(finalConsent));
    setIsMinimized(true);
    setShowPreferences(false);
  };

  const handleDeny = () => {
    const minimalConsent = {
      functional: true,
      preferences: false,
      statistics: false,
      marketing: false,
    };
    localStorage.setItem('cookie_consent', JSON.stringify(minimalConsent));
    setIsMinimized(true);
    setShowPreferences(false);
  };

  const handleSavePreferences = () => {
    setShowPreferences(false);
  };

  const openBanner = () => {
    setIsMinimized(false);
  };

  const handleTogglePreference = (key: keyof CookiePreferences) => {
    setCookiePrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isVisible) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] animate-in fade-in duration-300">
        <button
          onClick={openBanner}
          className="bg-zinc-900/95 backdrop-blur-lg border border-zinc-800 rounded-full shadow-2xl p-3 text-orange-500 hover:text-white hover:bg-orange-500 transition-all"
          aria-label={t('legal.cookies.title')}
        >
          <Cookie size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-[100] w-full max-w-lg animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-zinc-900/95 backdrop-blur-lg border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-bold text-white">{t('legal.cookies.title')}</h3>
          <button
            onClick={handleDeny}
            className="p-1 text-zinc-500 hover:text-white transition-colors"
            aria-label={t('legal.cookies.reject')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-zinc-400 italic">{t('legal.cookies.bannerTextLong')}</p>
          <p className="text-xs text-zinc-400 mt-2">
            {t('legal.cookies.bannerHint').replace('{policyLink}', '')}
            <Link
              to="/legal/cookie-policy"
              className="font-semibold text-orange-500 hover:underline"
            >
              {t('legal.cookies.policyLink')}
            </Link>
          </p>

          {showPreferences && (
            <div className="mt-4 border-t border-zinc-800 pt-2 animate-in fade-in duration-300">
              <PreferenceCategory
                title={t('legal.cookies.categories.functional.title')}
                description={t('legal.cookies.categories.functional.description')}
                checked={true}
                disabled={true}
                alwaysActiveLabel={t('legal.cookies.alwaysActive')}
              />
              <PreferenceCategory
                title={t('legal.cookies.categories.preferences.title')}
                description={t('legal.cookies.categories.preferences.description')}
                checked={cookiePrefs.preferences}
                onChange={() => handleTogglePreference('preferences')}
                recommendedLabel={t('legal.cookies.recommended')}
              />
              <PreferenceCategory
                title={t('legal.cookies.categories.statistics.title')}
                description={t('legal.cookies.categories.statistics.description')}
                checked={cookiePrefs.statistics}
                onChange={() => handleTogglePreference('statistics')}
                recommendedLabel={t('legal.cookies.recommended')}
              />
              <PreferenceCategory
                title={t('legal.cookies.categories.marketing.title')}
                description={t('legal.cookies.categories.marketing.description')}
                checked={cookiePrefs.marketing}
                onChange={() => handleTogglePreference('marketing')}
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 rounded-b-2xl">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleAccept}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {t('legal.cookies.accept')}
            </button>
            <button
              onClick={handleDeny}
              className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {t('legal.cookies.reject')}
            </button>
            {showPreferences ? (
              <button
                onClick={handleSavePreferences}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {t('legal.cookies.savePreferences')}
              </button>
            ) : (
              <button
                onClick={() => setShowPreferences(true)}
                className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {t('legal.cookies.viewPreferences')}
              </button>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <Link
              to="/legal/cookie-policy"
              className="text-zinc-500 hover:text-orange-500 transition-colors"
            >
              {t('footer.cookies')}
            </Link>
            <Link
              to="/legal/privacy-policy"
              className="text-zinc-500 hover:text-orange-500 transition-colors"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              to="/legal/terms-and-conditions"
              className="text-zinc-500 hover:text-orange-500 transition-colors"
            >
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
