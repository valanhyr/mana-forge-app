import { useRef, useState } from 'react';
import { Send, CheckCircle2, Loader2, Mail, User, FileText, MessageSquare, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../services/ToastContext';
import { ContactService, type ContactFormData } from '../../services/ContactService';
import TurnstileWidget from '../../components/ui/TurnstileWidget';
import { isTurnstileConfigured } from '../../config/turnstile';

const SUBJECTS = [
  { value: 'general',  labelKey: 'contact.subject.general'  },
  { value: 'support',  labelKey: 'contact.subject.support'  },
  { value: 'business', labelKey: 'contact.subject.business' },
  { value: 'other',    labelKey: 'contact.subject.other'    },
] as const;

const EMPTY_FORM: ContactFormData = { name: '', email: '', subject: '', message: '' };

const Contact = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  /** Set when the challenge script fails to load (e.g. a site key that is not
   *  allowed on this hostname). The widget is then hidden instead of leaving the
   *  submit button permanently dead. */
  const [challengeFailed, setChallengeFailed] = useState(false);
  /** Honeypot. Never rendered as visible, and never filled by a human. */
  const [website, setWebsite] = useState('');
  /** Render timestamp for the server-side "filled too fast" check. */
  const renderedAtRef = useRef(Date.now());

  const needsChallenge = isTurnstileConfigured() && !challengeFailed;

  const set = (field: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = (): string => {
    if (!form.name.trim()) return t('contact.error.nameRequired');
    if (!form.email.trim()) return t('contact.error.emailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t('contact.error.emailInvalid');
    if (!form.subject) return t('contact.error.subjectRequired');
    if (!form.message.trim()) return t('contact.error.messageRequired');
    if (form.message.trim().length < 10) return t('contact.error.messageTooShort');
    if (needsChallenge && !turnstileToken) return t('contact.error.challengeRequired');
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setIsLoading(true);
    try {
      await ContactService.send(form, {
        turnstileToken: turnstileToken || undefined,
        website,
        formRenderedAt: renderedAtRef.current,
      });
      setSent(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        // Either the challenge was not solved/expired or the anti-spam heuristics
        // tripped. The proof token is single-use, so ask for a fresh one.
        setTurnstileToken('');
        setError(t('contact.error.challengeFailed'));
      } else {
        showToast(t('contact.error.sendFailed'), 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-green-500/10 p-5 rounded-full">
              <CheckCircle2 size={56} className="text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">{t('contact.successTitle')}</h2>
          <p className="text-zinc-400">{t('contact.successMessage')}</p>
          <button
            onClick={() => {
              setSent(false);
              setForm(EMPTY_FORM);
              setTurnstileToken('');
              // A proof token is single-use, and the render timestamp must not
              // be inherited from the previous submission.
              renderedAtRef.current = Date.now();
            }}
            className="mt-8 text-orange-500 hover:text-orange-400 transition-colors text-sm font-medium"
          >
            {t('contact.sendAnother')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center bg-orange-600/10 p-4 rounded-2xl mb-4">
          <Mail size={32} className="text-orange-500" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-3">{t('contact.title')}</h1>
        <p className="text-zinc-400 text-base">{t('contact.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <User size={14} className="inline mr-1.5 text-zinc-400" />
            {t('contact.name')} <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder={t('contact.namePlaceholder')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <Mail size={14} className="inline mr-1.5 text-zinc-400" />
            {t('contact.email')} <span className="text-orange-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder={t('contact.emailPlaceholder')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <FileText size={14} className="inline mr-1.5 text-zinc-400" />
            {t('contact.subjectLabel')} <span className="text-orange-500">*</span>
          </label>
          <select
            value={form.subject}
            onChange={set('subject')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none"
          >
            <option value="" disabled>{t('contact.subjectPlaceholder')}</option>
            {SUBJECTS.map(({ value, labelKey }) => (
              <option key={value} value={value}>{t(labelKey)}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            <MessageSquare size={14} className="inline mr-1.5 text-zinc-400" />
            {t('contact.message')} <span className="text-orange-500">*</span>
          </label>
          <textarea
            value={form.message}
            onChange={set('message')}
            rows={6}
            placeholder={t('contact.messagePlaceholder')}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
          />
          <p className="text-xs text-zinc-600 mt-1 text-right">{form.message.length} / 2000</p>
        </div>

        {/* Honeypot. `display:none` plus `aria-hidden` keeps it out of the a11y
            tree and away from autofill heuristics; only a bot parsing the DOM
            will find and fill it, which is exactly what we want. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-website">{t('contact.websiteLabel')}</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {/* Turnstile. Rendered only when a site key is configured, and the submit
            button is gated on the token so nobody can bypass it from the UI. */}
        {isTurnstileConfigured() && !challengeFailed && (
          <div>
            <TurnstileWidget
              onToken={(token) => { setTurnstileToken(token); setError(''); }}
              onError={() => { setTurnstileToken(''); setChallengeFailed(true); }}
            />
            <p className="text-xs text-zinc-600 mt-2">{t('contact.challengeNotice')}</p>
          </div>
        )}

        {challengeFailed && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300">{t('contact.challengeFailedTitle')}</p>
              <p className="text-xs text-zinc-500 mt-1">{t('contact.challengeFailedHint')}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
        >
          {isLoading ? (
            <><Loader2 size={18} className="animate-spin" /> {t('contact.sending')}</>
          ) : (
            <><Send size={18} /> {t('contact.send')}</>
          )}
        </button>
      </form>
    </div>
  );
};

export default Contact;
