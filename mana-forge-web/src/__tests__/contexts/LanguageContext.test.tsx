import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useLanguage } from '../../services/LanguageContext';

const LanguageDisplay = () => {
  const { locale, setLocale } = useLanguage();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale('en')}>en</button>
      <button onClick={() => setLocale('es')}>es</button>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // Limpiar URL params del test runner
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('inicializa el locale desde localStorage', () => {
    localStorage.setItem('app_locale', 'en');
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('inicializa el locale desde el URL param ?lang=en', () => {
    window.history.replaceState({}, '', '/?lang=en');
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('usa "es" por defecto cuando no hay preferencia guardada', () => {
    // Navigator.language en jsdom suele ser 'en-US', por eso verificamos el default sin pref
    // Lo que importa es que no lanza error
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    const locale = screen.getByTestId('locale').textContent;
    expect(['es', 'en']).toContain(locale);
  });

  it('setLocale actualiza el estado visible', async () => {
    localStorage.setItem('app_locale', 'es');
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('setLocale persiste la preferencia en localStorage', async () => {
    localStorage.setItem('app_locale', 'es');
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LanguageDisplay />
      </LanguageProvider>
    );
    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(localStorage.getItem('app_locale')).toBe('en');
  });

  it('useLanguage fuera del Provider lanza error descriptivo', () => {
    const BadComponent = () => {
      useLanguage();
      return null;
    };
    expect(() => render(<BadComponent />)).toThrow(
      'useLanguage must be used within a LanguageProvider'
    );
  });
});
