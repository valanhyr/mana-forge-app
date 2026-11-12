import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Dashboard from '../../views/dashboard/Dashboard';
import Layout from '../../components/layout/Layout';
import { LanguageProvider, useLanguage } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { DeckService } from '../../services/DeckService';
import { FormatService } from '../../services/FormatService';
import { ArticleService } from '../../services/ArticleService';

const fixtures = vi.hoisted(() => ({
  es: [
    {
      id: 'general',
      title: 'General',
      questions: [
        { id: 'first', question: 'Primera pregunta', answer: 'Primera respuesta' },
        { id: 'second', question: 'Segunda pregunta', answer: 'Segunda respuesta' },
      ],
    },
    {
      id: 'account',
      title: 'Cuenta',
      questions: [
        { id: 'account-question', question: 'Pregunta de cuenta', answer: 'Respuesta de cuenta' },
      ],
    },
    { id: 'empty', title: 'Tema vacío', questions: [] },
  ],
  en: [
    {
      id: 'general',
      title: 'General',
      questions: [
        { id: 'first', question: 'First question', answer: 'First answer' },
        { id: 'second', question: 'Second question', answer: 'Second answer' },
      ],
    },
    {
      id: 'account',
      title: 'Account',
      questions: [
        { id: 'account-question', question: 'Account question', answer: 'Account answer' },
      ],
    },
  ],
}));

vi.mock('../../data/faqs.json', () => ({ default: fixtures }));
vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ isAuthenticated: false }),
}));
vi.mock('../../components/home/DeckAnalyzerSection', () => ({ default: () => null }));

const SwitchLanguage = () => {
  const { setLocale } = useLanguage();
  return <button onClick={() => setLocale('en')}>Switch language</button>;
};

const setup = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>
          <SwitchLanguage />
          <Dashboard />
          <footer>Footer</footer>
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('Dashboard FAQ', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.spyOn(DeckService, 'getDailyDeck').mockResolvedValue({
      id: 'daily',
      deck_name: 'Daily deck',
      main_deck: [],
    } as never);
    vi.spyOn(DeckService, 'getFeaturedDeck').mockResolvedValue(null);
    vi.spyOn(FormatService, 'getCMSAllFormats').mockResolvedValue([]);
    vi.spyOn(ArticleService, 'getLastArticles').mockResolvedValue([]);
  });

  it('renders the FAQ as the final home section with only nonempty topics', () => {
    const { container } = setup();
    const section = screen.getByRole('region', { name: 'Preguntas frecuentes' });
    expect(container.querySelectorAll('section')).toHaveLength(4);
    expect(container.querySelectorAll('section')[3]).toBe(section);
    expect(
      section.compareDocumentPosition(screen.getByText('Footer')) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(within(section).getByRole('tab', { name: 'General' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(within(section).getByRole('tab', { name: 'Cuenta' })).toBeInTheDocument();
    expect(within(section).queryByText('Tema vacío')).not.toBeInTheDocument();
  });

  it('opens, highlights and closes one question at a time with keyboard and mouse', async () => {
    const user = userEvent.setup();
    setup();
    const first = screen.getByRole('button', { name: 'Primera pregunta' });
    const second = screen.getByRole('button', { name: 'Segunda pregunta' });
    expect(first).toHaveAttribute('aria-expanded', 'false');
    first.focus();
    await user.keyboard('{Enter}');
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveClass('text-orange-400');
    expect(screen.getByText('Primera respuesta')).toBeVisible();
    await user.click(second);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(first).not.toHaveClass('text-orange-400');
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Primera respuesta')).not.toBeInTheDocument();
    await user.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'false');
  });

  it('switches topics with the keyboard and resets the open question', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Primera pregunta' }));
    screen.getByRole('tab', { name: 'General' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Cuenta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Pregunta de cuenta' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await user.click(screen.getByRole('tab', { name: 'General' }));
    expect(screen.getByRole('button', { name: 'Primera pregunta' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('switches section labels, topics and questions with the language', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('tab', { name: 'Cuenta' }));
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('region', { name: 'Frequently asked questions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Account' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Account question' })).toBeInTheDocument();
    expect(screen.queryByText('Pregunta de cuenta')).not.toBeInTheDocument();
  });

  it('does not show FAQ in other routes that share the footer', () => {
    render(
      <MemoryRouter initialEntries={['/contact']}>
        <LanguageProvider>
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="contact" element={<p>Contact page</p>} />
              </Route>
            </Routes>
          </ToastProvider>
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Contact page')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Preguntas frecuentes' })).not.toBeInTheDocument();
  });
});
