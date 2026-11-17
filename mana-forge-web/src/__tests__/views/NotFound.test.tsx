import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { StrictMode } from 'react';
import NotFound from '../../views/errors/NotFound';
import { LanguageProvider } from '../../services/LanguageContext';
import { trackPageNotFound } from '../../services/AnalyticsService';

vi.mock('../../services/AnalyticsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/AnalyticsService')>()),
  trackPageNotFound: vi.fn(),
}));

const renderNotFound = () =>
  render(
    <LanguageProvider>
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    </LanguageProvider>
  );

describe('NotFound', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza el número decorativo 404', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('counts once per unknown navigation in Strict Mode without recording the path', async () => {
    const Navigate = () => {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/private-second')}>next</button>;
    };
    render(<StrictMode><LanguageProvider><MemoryRouter initialEntries={['/private-first']}>
      <Navigate /><NotFound />
    </MemoryRouter></LanguageProvider></StrictMode>);
    expect(trackPageNotFound).toHaveBeenCalledExactlyOnceWith();
    await userEvent.setup().click(screen.getByRole('button', { name: 'next' }));
    expect(trackPageNotFound).toHaveBeenCalledTimes(2);
    expect(trackPageNotFound).toHaveBeenLastCalledWith();
  });

  it('renderiza el título y descripción traducidos', () => {
    renderNotFound();
    // Verificamos que hay textos visibles que vienen de las traducciones
    // (no los hardcodeamos para no acoplar el test a un idioma concreto)
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).not.toBe('');
  });

  it('el botón "Go Home" es un link que enlaza a "/"', () => {
    renderNotFound();
    const homeLink = screen.getByRole('link');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('ejecuta history.back al pulsar el botón de volver', async () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderNotFound();
    await user.click(screen.getByRole('button', { name: /go back/i }));

    expect(backSpy).toHaveBeenCalledOnce();
  });
});
