import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { mockUser } from '../mocks/handlers';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { UserProvider, useUser } from '../../services/UserContext';
import { setAnalyticsConsent } from '../../services/AnalyticsService';
import Login from '../../views/auth/Login';

const events = () => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
  .map((args) => Array.from(args)).filter((entry) => entry[0] === 'event');

function SessionState() {
  const { isAuthenticated, isSessionLoading } = useUser();
  return <span data-testid="session">{isSessionLoading ? 'loading' : String(isAuthenticated)}</span>;
}

describe('Google login analytics integration', () => {
  afterEach(() => setAnalyticsConsent(false));

  it('marks an explicit click and consumes it once after a confirmed return, not on normal restoration', async () => {
    localStorage.clear();
    sessionStorage.clear();
    setAnalyticsConsent(false);
    setAnalyticsConsent(true);
    document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com/gtag/js"]')?.dispatchEvent(new Event('load'));
    server.use(http.get('http://localhost:8080/users/me', () => new HttpResponse(null, { status: 401 })));
    const first = render(<StrictMode><LanguageProvider><UserProvider><ToastProvider><MemoryRouter>
      <SessionState /><Login />
    </MemoryRouter></ToastProvider></UserProvider></LanguageProvider></StrictMode>);
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('false'));
    const link = screen.getByRole('link', { name: /google/i });
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    fireEvent.click(link);
    first.unmount();

    server.use(http.get('http://localhost:8080/users/me', () => HttpResponse.json(mockUser)));
    const returned = render(<StrictMode><LanguageProvider><UserProvider><SessionState /></UserProvider></LanguageProvider></StrictMode>);
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('true'));
    expect(events().filter((entry) => entry[1] === 'login')).toEqual([['event', 'login', { method: 'google' }]]);
    returned.unmount();

    render(<StrictMode><LanguageProvider><UserProvider><SessionState /></UserProvider></LanguageProvider></StrictMode>);
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('true'));
    expect(events().filter((entry) => entry[1] === 'login')).toHaveLength(1);
  });
});
