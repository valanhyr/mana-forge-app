import { useEffect, useRef } from 'react';
import { Cookie } from 'lucide-react';
import * as Klaro from 'klaro/dist/klaro-no-css';
import 'klaro/dist/klaro.css';
import { useTranslation } from '../../hooks/useTranslation';
import { setAnalyticsConsent } from '../../services/AnalyticsService';

const STORAGE_NAME = 'mana_forge_klaro';

const config = {
  version: 2,
  storageMethod: 'localStorage',
  storageName: STORAGE_NAME,
  default: false,
  acceptAll: true,
  hideDeclineAll: false,
  lang: 'es',
  translations: {
    es: {
      privacyPolicyUrl: '/legal/privacy-policy',
      ok: 'Aceptar todas',
      acceptAll: 'Aceptar todas',
      decline: 'Rechazar todas',
      save: 'Guardar preferencias',
      consentNotice: {
        description: 'Usamos Google Analytics para estadísticas solo si lo aceptas. Puedes cambiar tu elección en cualquier momento.',
        learnMore: 'Elegir preferencias',
      },
      consentModal: {
        title: 'Preferencias de privacidad',
        description: 'Elige si permites estadísticas de Google Analytics.',
      },
      purposes: { analytics: { title: 'Estadísticas' } },
    },
    en: {
      privacyPolicyUrl: '/legal/privacy-policy',
      ok: 'Accept all',
      acceptAll: 'Accept all',
      decline: 'Reject all',
      save: 'Save preferences',
      consentNotice: {
        description: 'We use Google Analytics for statistics only if you agree. You can change your choice at any time.',
        learnMore: 'Choose preferences',
      },
      consentModal: {
        title: 'Privacy preferences',
        description: 'Choose whether to allow Google Analytics statistics.',
      },
      purposes: { analytics: { title: 'Statistics' } },
    },
  },
  services: [{
    name: 'googleAnalytics',
    default: false,
    optOut: false,
    purposes: ['analytics'],
    translations: {
      zz: { title: 'Google Analytics' },
      es: { description: 'Mide visitas, aperturas de preguntas frecuentes, creación y duplicación de mazos y uso del análisis de IA.' },
      en: { description: 'Measures visits, FAQ openings, deck creation and cloning and use of AI analysis.' },
    },
    callback: (allowed: boolean) => setAnalyticsConsent(allowed === true),
  }],
};

function discardInvalidConsent() {
  const saved = localStorage.getItem(STORAGE_NAME);
  if (saved === null) return;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(saved));
    if (typeof parsed === 'object' && parsed !== null &&
        'googleAnalytics' in parsed && typeof parsed.googleAnalytics === 'boolean') return;
  } catch {
    // An unreadable choice cannot authorize tracking.
  }
  localStorage.removeItem(STORAGE_NAME);
}

function makeModalAccessible(root: HTMLElement, takeReturnFocus: () => HTMLElement | null) {
  let wasOpen = false;
  let previousFocus: HTMLElement | null = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const findDialog = () => root.querySelector<HTMLElement>('.cookie-modal .cm-modal');

  const updateDialog = () => {
    const dialog = findDialog();
    if (dialog) {
      const title = dialog.querySelector<HTMLElement>('.cm-header .title');
      if (title) {
        title.id = 'klaro-consent-dialog-title';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', title.id);
      }
      wasOpen = true;
    } else if (wasOpen) {
      wasOpen = false;
      const target = takeReturnFocus() ?? previousFocus;
      if (target?.isConnected) target.focus();
    }
  };

  const rememberFocus = (event: FocusEvent) => {
    if (!wasOpen && event.target instanceof HTMLElement && !findDialog()?.contains(event.target)) {
      previousFocus = event.target;
    }
  };

  const handleKeys = (event: KeyboardEvent) => {
    const dialog = findDialog();
    if (!dialog) return;
    if (event.key === 'Escape') {
      dialog.querySelector<HTMLButtonElement>('.cm-header button.hide')?.click();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
    )).filter((item) => item.tabIndex >= 0 && !item.closest('[hidden]'));
    if (focusable.length === 0) return;
    const current = focusable.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey && current <= 0) {
      event.preventDefault();
      focusable[focusable.length - 1].focus();
    } else if (!event.shiftKey && (current === -1 || current === focusable.length - 1)) {
      event.preventDefault();
      focusable[0].focus();
    }
  };

  const observer = new MutationObserver(updateDialog);
  observer.observe(root, { childList: true, subtree: true });
  document.addEventListener('focusin', rememberFocus);
  document.addEventListener('keydown', handleKeys);
  updateDialog();
  return () => {
    observer.disconnect();
    document.removeEventListener('focusin', rememberFocus);
    document.removeEventListener('keydown', handleKeys);
  };
}

const KlaroConsent = ({ onConsentResolved }: { onConsentResolved?: (resolved: boolean) => void }) => {
  const { t, locale } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let removeModalAccessibility = () => {};
    let removeConsentWatcher = () => {};
    const syncConsent = (event: StorageEvent) => {
      if (event.key !== STORAGE_NAME && event.key !== null) return;
      try {
        discardInvalidConsent();
        const manager = Klaro.getManager(config);
        if (localStorage.getItem(STORAGE_NAME) === null) manager.resetConsents();
        else {
          manager.loadConsents();
          manager.applyConsents();
        }
      } catch {
        setAnalyticsConsent(false);
      }
    };
    try {
      discardInvalidConsent();
      config.lang = locale;
      Klaro.render(config);
      const manager = Klaro.getManager(config);
      const watcher = { update: () => onConsentResolved?.(manager.confirmed) };
      manager.watch(watcher);
      onConsentResolved?.(manager.confirmed);
      removeConsentWatcher = () => manager.unwatch(watcher);
      const root = document.getElementById('klaro');
      if (root) removeModalAccessibility = makeModalAccessible(root, () => {
        const target = returnFocus.current;
        returnFocus.current = null;
        return target;
      });
      window.addEventListener('storage', syncConsent);
    } catch {
      setAnalyticsConsent(false);
    }
    return () => {
      removeModalAccessibility();
      removeConsentWatcher();
      window.removeEventListener('storage', syncConsent);
    };
  }, [locale, onConsentResolved]);

  const showPreferences = () => {
    try {
      config.lang = locale;
      returnFocus.current = triggerRef.current;
      Klaro.show(config, true);
    } catch {
      returnFocus.current = null;
      setAnalyticsConsent(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <button
        ref={triggerRef}
        type="button"
        onClick={showPreferences}
        className="bg-zinc-900/95 backdrop-blur-lg border border-zinc-800 rounded-full shadow-2xl p-3 text-orange-500 hover:text-white hover:bg-orange-500 transition-all"
        aria-label={t('legal.cookies.title')}
      >
        <Cookie size={24} />
      </button>
    </div>
  );
};

export default KlaroConsent;
