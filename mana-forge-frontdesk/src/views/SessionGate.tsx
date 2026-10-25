import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { ApiError } from '../infrastructure/api/api-client';
import { Operator } from '../core/domain/operator';
import { EnrollmentStart } from '../core/ports/auth-service.port';
import { OperatorContext } from '../hooks/use-operator';
import { useTranslation } from '../hooks/use-translation';
import { ErrorNotice } from '../components/ui/ErrorNotice';
import { QrCode } from '../components/ui/QrCode';

type Step = 'credentials' | 'totp' | 'recovery' | 'enroll' | 'codes';

const field = 'mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2';

export function SessionGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [status, setStatus] = useState(401);
  const [step, setStep] = useState<Step>('credentials');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentStart | null>(null);
  const [pending, setPending] = useState<{ operator: Operator; recoveryCodes: string[] } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [expired, setExpired] = useState(false);
  const generation = useRef(0);
  const currentOperator = useRef<Operator | null>(null);
  const stepRef = useRef<Step>('credentials');
  stepRef.current = step;

  const resetLogin = useCallback(() => {
    setStep('credentials');
    setChallenge(null);
    setEnrollment(null);
    setPending(null);
    setPassword('');
    setCode('');
  }, []);

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
      resetLogin();
      setExpired(failureStatus === 401);
      setStatus(failureStatus);
      setError(null);
      setLoading(false);
      void queryClient.cancelQueries();
      queryClient.clear(); // Do not leave previous operator's private data in the query cache.
    });
    // Never poll while a login is in progress: it would replace the form the operator is typing in.
    const refresh = () => { if (!document.hidden && stepRef.current === 'credentials') void checkSession(); };
    // Revalidate an externally changed/revoked cookie without persisting sensitive data locally.
    const timer = container.useMocks ? undefined : setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => {
      generation.current++;
      unsubscribe();
      window.removeEventListener('focus', refresh);
      if (timer !== undefined) clearInterval(timer);
    };
  }, [checkSession, queryClient, resetLogin]);

  const open = (signedIn: Operator) => {
    queryClient.clear();
    currentOperator.current = signedIn;
    resetLogin();
    setExpired(false);
    setError(null);
    setOperator(signedIn);
  };

  const run = async (action: () => Promise<void>, clearOnFailure: 'password' | 'code') => {
    setBusy(true);
    setError(null);
    try { await action(); }
    catch (failure) {
      setError(failure);
      setStatus(failure instanceof ApiError ? failure.status : 0);
      if (clearOnFailure === 'password') setPassword(''); else setCode('');
    }
    finally { setBusy(false); }
  };

  const submitCredentials = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const next = await container.authService.signIn(email.trim(), password);
      setPassword('');
      setChallenge(next.challenge);
      if (next.status === 'ENROLLMENT_REQUIRED') {
        setEnrollment(await container.authService.startEnrollment(next.challenge));
        setStep('enroll');
      } else setStep('totp');
    }, 'password');
  };

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    if (!challenge) return;
    void run(async () => {
      const value = code.trim();
      if (step === 'enroll') {
        const result = await container.authService.confirmEnrollment(challenge, value);
        setCode('');
        setEnrollment(null);
        setPending(result);
        setStep('codes');
        return;
      }
      open(step === 'recovery'
        ? await container.authService.verifyRecovery(challenge, value)
        : await container.authService.verifyTotp(challenge, value));
    }, 'code');
  };

  if (operator) return <OperatorContext.Provider value={operator}>{children}</OperatorContext.Provider>;

  const failed = error instanceof ApiError && (error.status === 401 || error.status === 403)
    ? <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">{t('invalidCredentials')}</div>
    : <ErrorNotice error={error} />;
  const back = () => { resetLogin(); setError(null); };
  const grouped = enrollment ? enrollment.secret.replace(/(.{4})/g, '$1 ').trim() : '';

  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
    <section className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Mana Forge Frontdesk</h1>
      {loading ? <p role="status">{t('loadingSession')}</p> : <>
        {step === 'credentials' && <p>{status === 403 ? t('forbidden') : status === 0 ? t('unavailable') : expired ? t('expired') : t('signIn')}</p>}
        {failed}

        {step === 'credentials' && status !== 403 && <form className="space-y-3" onSubmit={submitCredentials}>
          <label className="block">{t('email')}<input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className={field} /></label>
          <label className="block">{t('password')}<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className={field} /></label>
          <button className="w-full bg-indigo-600 rounded p-2 disabled:opacity-50" type="submit" disabled={busy}>{t('login')}</button>
        </form>}

        {(step === 'totp' || step === 'recovery') && <form className="space-y-3" onSubmit={submitCode}>
          <p>{step === 'totp' ? t('totpPrompt') : t('recoveryPrompt')}</p>
          {step === 'totp'
            ? <label className="block">{t('totpCode')}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} className={field} /></label>
            : <label className="block">{t('recoveryCode')}<input required autoComplete="off" autoCapitalize="characters" value={code} onChange={event => setCode(event.target.value)} className={field} /></label>}
          <button className="w-full bg-indigo-600 rounded p-2 disabled:opacity-50" type="submit" disabled={busy}>{t('verify')}</button>
          <button type="button" className="underline" onClick={() => { setCode(''); setError(null); setStep(step === 'totp' ? 'recovery' : 'totp'); }}>
            {step === 'totp' ? t('useRecovery') : t('useAuthenticator')}
          </button>
          <button type="button" className="ml-4 underline" onClick={back}>{t('back')}</button>
        </form>}

        {step === 'enroll' && enrollment && <form className="space-y-3" onSubmit={submitCode}>
          <h2 className="font-semibold">{t('enrollTitle')}</h2>
          <p>{t('enrollIntro')}</p>
          <QrCode value={enrollment.otpauthUri} label={t('enrollQr')} />
          <p className="text-xs text-slate-400">{t('enrollSecret')}</p>
          <p className="font-mono text-lg tracking-wider break-all select-all">{grouped}</p>
          {enrollment.otpauthUri.startsWith('otpauth://') && <a className="underline block" href={enrollment.otpauthUri}>{t('enrollOpen')}</a>}
          <label className="block">{t('totpCode')}<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value)} className={field} /></label>
          <button className="w-full bg-indigo-600 rounded p-2 disabled:opacity-50" type="submit" disabled={busy}>{t('enrollConfirm')}</button>
          <button type="button" className="underline" onClick={back}>{t('back')}</button>
        </form>}

        {step === 'codes' && pending && <div className="space-y-3">
          <h2 className="font-semibold">{t('recoveryCodesTitle')}</h2>
          <p className="text-amber-300">{t('recoveryCodesWarning')}</p>
          <ul className="font-mono space-y-1 select-all">{pending.recoveryCodes.map(item => <li key={item}>{item}</li>)}</ul>
          <button type="button" className="w-full bg-indigo-600 rounded p-2" onClick={() => open(pending.operator)}>{t('recoveryCodesSaved')}</button>
        </div>}

        {step === 'credentials' && <button type="button" className="underline" onClick={() => void checkSession()}>{t('checkSession')}</button>}
        {step === 'credentials' && status === 403 && <button type="button" className="ml-4 underline" onClick={async () => {
          try { await container.authService.signOut(); queryClient.clear(); setStatus(401); setError(null); }
          catch (failure) { setError(failure); }
        }}>{t('logout')}</button>}
      </>}
    </section>
  </main>;
}
