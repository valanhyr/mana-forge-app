import { useEffect, useState } from 'react';
import { AuthService } from '../../services/AuthService';
import { useTranslation } from '../../hooks/useTranslation';

export default function Unsubscribe() {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [token] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    // Remove the bearer token from browser history after reading it into memory.
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  const unsubscribe = async () => {
    setState('sending');
    try { await AuthService.unsubscribeNewsletter(token); setState('done'); }
    catch { setState('error'); }
  };
  return <section className="max-w-xl mx-auto p-8 space-y-4 text-zinc-200">
    <h1 className="text-2xl font-bold">{t('newsletter.title')}</h1>
    {state === 'done' ? <p role="status">{t('newsletter.done')}</p> : <>
      <p>{t('newsletter.hint')}</p>
      {(state === 'error' || !token) && <p role="alert">{t('newsletter.error')}</p>}
      <button onClick={() => void unsubscribe()} disabled={!token || state === 'sending'}
        className="rounded-lg px-4 py-2 bg-orange-500 text-white disabled:opacity-50">{t('newsletter.confirm')}</button>
    </>}
  </section>;
}
