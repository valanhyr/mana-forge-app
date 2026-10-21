import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { ApiError } from '../infrastructure/api/api-client';
import { Operator } from '../core/domain/operator';
import { OperatorContext } from '../hooks/use-operator';
import { useTranslation } from '../hooks/use-translation';
import { ErrorNotice } from '../components/ui/ErrorNotice';

export function SessionGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState(401);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [expired, setExpired] = useState(false);
  const generation = useRef(0);
  const currentOperator = useRef<Operator | null>(null);

  const checkSession = useCallback(async () => {
    const attempt = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const current = await container.authService.currentOperator();
      if (attempt === generation.current) {
        if (currentOperator.current && currentOperator.current.id !== current.id) {
          void queryClient.cancelQueries();
          queryClient.clear();
        }
        currentOperator.current = current;
        setOperator(current);
      }
    }
    catch (failure) {
      if (attempt !== generation.current) return;
      setOperator(null);
      currentOperator.current = null;
      void queryClient.cancelQueries();
      queryClient.clear();
      setPassword('');
      setExpired(false);
      setStatus(failure instanceof ApiError ? failure.status : 0);
      if (!(failure instanceof ApiError) || (failure.status !== 401 && failure.status !== 403)) setError(failure);
    } finally { if (attempt === generation.current) setLoading(false); }
  }, [queryClient]);

  useEffect(() => {
    void checkSession();
    const unsubscribe = container.authService.onAccessFailure(failureStatus => {
      generation.current++;
      setOperator(null);
      currentOperator.current = null;
      setPassword('');
      setExpired(failureStatus === 401);
      setStatus(failureStatus);
      setError(null);
      setLoading(false);
      void queryClient.cancelQueries();
      queryClient.clear(); // Do not leave previous operator's private data in the query cache.
    });
    const refresh = () => { if (!document.hidden) void checkSession(); };
    // Revalidate an externally changed/revoked cookie without persisting sensitive data locally.
    const timer = container.useMocks ? undefined : setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      generation.current++;
      unsubscribe();
      window.removeEventListener('focus', refresh);
      if (timer !== undefined) clearInterval(timer);
    };
  }, [checkSession, queryClient]);

  if (operator) return <OperatorContext.Provider value={operator}>{children}</OperatorContext.Provider>;
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <section className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Mana Forge Frontdesk</h1>
      {loading ? <p role="status">{t('loadingSession')}</p> : <>
        <p>{status === 403 ? t('forbidden') : status === 0 ? t('unavailable') : expired ? t('expired') : t('signIn')}</p>
        <ErrorNotice error={error} />
        {status !== 403 && <form className="space-y-3" onSubmit={async event => {
          event.preventDefault();
          setLoading(true);
          setError(null);
          try {
            queryClient.clear();
            const current = await container.authService.signIn(username.trim(), password);
            currentOperator.current = current;
            setOperator(current);
          }
          catch (failure) { setError(failure); setStatus(failure instanceof ApiError ? failure.status : 0); }
          finally { setPassword(''); setLoading(false); }
        }}>
          <label className="block">{t('username')}<input required autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2" /></label>
          <label className="block">{t('password')}<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2" /></label>
          <button className="w-full bg-indigo-600 rounded p-2" type="submit">{t('login')}</button>
        </form>}
        {!container.useMocks && <>
          <a href={container.authService.googleLoginUrl()} target="_blank" rel="noopener noreferrer" className="block underline">{t('google')}</a>
          <p className="text-xs text-slate-400">{t('googleHint')}</p>
        </>}
        <button type="button" className="underline" onClick={() => void checkSession()}>{t('checkSession')}</button>
        {status === 403 && <button type="button" className="ml-4 underline" onClick={async () => {
          try { await container.authService.signOut(); queryClient.clear(); setStatus(401); setError(null); }
          catch (failure) { setError(failure); }
        }}>{t('logout')}</button>}
      </>}
    </section>
  </main>;
}
