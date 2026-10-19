import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackModal from '../../../components/ui/FeedbackModal';
import BetaWelcomeModal from '../../../components/ui/BetaWelcomeModal';
import WhatsNewModal from '../../../components/ui/WhatsNewModal';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../services/UserContext', () => ({
  useUser: () => ({ user: { email: 'a@b.c' } }),
}));
vi.mock('../../../services/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en' }),
}));
vi.mock('../../../services/api', () => ({
  api: { post: vi.fn(), patch: vi.fn().mockResolvedValue({}) },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

describe('FeedbackModal (Radix)', () => {
  it('es un diálogo con título y se cierra con Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<FeedbackModal isOpen onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'feedback.title' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el botón de cierre tiene nombre accesible', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<FeedbackModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('los campos del formulario tienen etiqueta asociada', () => {
    render(<FeedbackModal isOpen onClose={vi.fn()} />);
    expect(screen.getByLabelText('feedback.summaryLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('feedback.descriptionLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('feedback.emailLabel')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'feedback.categoryLabel' })).toBeInTheDocument();
  });
  it('no renderiza nada si está cerrado', () => {
    render(<FeedbackModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('BetaWelcomeModal (Radix)', () => {
  it('es un diálogo obligatorio: Escape no lo cierra', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<BetaWelcomeModal isOpen onAccept={onAccept} />);
    expect(screen.getByRole('dialog', { name: 'beta.welcomeTitle' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('aceptar llama a onAccept', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<BetaWelcomeModal isOpen onAccept={onAccept} />);
    await user.click(screen.getByRole('button', { name: 'beta.welcomeAccept' }));
    await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
  });
});

describe('WhatsNewModal (Radix)', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        releases: [
          { version: '1.2.0', features: { es: [], en: [{ icon: '*', title: 'Feat', description: 'Desc' }] } },
        ],
      }),
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('se abre con la última versión y al cerrar guarda que fue vista', async () => {
    const user = userEvent.setup();
    render(<WhatsNewModal />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(localStorage.getItem('manaforge_whats_new_seen')).toBe('1.2.0');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
