import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DeckBuilder from '../../views/deck-builder/DeckBuilder';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { DeckService } from '../../services/DeckService';
import { FormatService } from '../../services/FormatService';
import { trackDeckCreated, trackAnalysisStarted, trackAnalysisFinished } from '../../services/AnalyticsService';

const session = vi.hoisted(() => ({
  user: { userId: 'private-user-id' }, isAuthenticated: true, isSessionLoading: false,
}));
vi.mock('../../services/UserContext', () => ({ useUser: () => session }));
vi.mock('../../services/FormatService', () => ({ FormatService: { getActiveFormats: vi.fn() } }));
vi.mock('../../services/CardService', () => ({ CardService: { autocomplete: vi.fn(), getCardByName: vi.fn(), batchSearch: vi.fn() } }));
vi.mock('../../services/DeckService', () => ({ DeckService: {
  getDeckById: vi.fn(), getDeckScores: vi.fn(), saveDeck: vi.fn(), updateDeck: vi.fn(), analyzeDeck: vi.fn(),
} }));
vi.mock('../../services/AnalyticsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/AnalyticsService')>()),
  trackDeckCreated: vi.fn(), trackAnalysisStarted: vi.fn(), trackAnalysisFinished: vi.fn(),
}));

const format = {
  id: 'format-1', name: { es: 'Formato de prueba', en: 'Test format' },
  scryfallKey: 'premodern', config: { minMainDeck: 0, maxSideboard: 15, maxCopies: 4 }, isActive: true,
};

const renderBuilder = (path = '/deck-builder') => render(
  <MemoryRouter initialEntries={[path]}><LanguageProvider><ToastProvider><Routes>
    <Route path="/deck-builder" element={<DeckBuilder />} />
    <Route path="/deck-builder/:deckId" element={<DeckBuilder />} />
  </Routes></ToastProvider></LanguageProvider></MemoryRouter>
);

async function prepareNewDeck() {
  const user = userEvent.setup();
  await user.click(await screen.findByText('Selecciona un formato...'));
  await user.click(screen.getByText('Formato de prueba'));
  fireEvent.change(screen.getByPlaceholderText('Ej: Goblin Aggro'), { target: { value: 'Private deck name' } });
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Guardar y continuar' })[0]).toBeEnabled());
  return user;
}

describe('builder analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('app_locale', 'es');
    session.isAuthenticated = true;
    session.isSessionLoading = false;
    vi.mocked(FormatService.getActiveFormats).mockResolvedValue([format]);
    vi.mocked(DeckService.getDeckScores).mockResolvedValue({ scores: {} });
    vi.mocked(DeckService.saveDeck).mockResolvedValue({ id: 'private-deck-id' });
    vi.mocked(DeckService.updateDeck).mockResolvedValue({ id: 'private-deck-id' });
    vi.mocked(DeckService.getDeckById).mockResolvedValue({ name: 'Existing deck', formatId: 'format-1', cards: [], analysisScores: {} });
  });

  it('tracks a new deck only after each successful creation', async () => {
    let resolve!: (value: { id: string }) => void;
    vi.mocked(DeckService.saveDeck).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    renderBuilder();
    const user = await prepareNewDeck();
    await user.click(screen.getAllByRole('button', { name: 'Guardar y continuar' })[0]);
    await waitFor(() => expect(DeckService.saveDeck).toHaveBeenCalledTimes(1));
    expect(trackDeckCreated).not.toHaveBeenCalled();
    resolve({ id: 'private-deck-id' });
    await waitFor(() => expect(trackDeckCreated).toHaveBeenCalledExactlyOnceWith('authenticated'));
    await user.click(await screen.findAllByRole('button', { name: 'Guardar y continuar' }).then((buttons) => buttons[0]));
    await waitFor(() => expect(trackDeckCreated).toHaveBeenCalledTimes(2));
  });

  it('does not track a failed save or an update as creation', async () => {
    vi.mocked(DeckService.saveDeck).mockRejectedValue(new Error('offline'));
    const view = renderBuilder();
    const user = await prepareNewDeck();
    await user.click(screen.getAllByRole('button', { name: 'Guardar y continuar' })[0]);
    await waitFor(() => expect(DeckService.saveDeck).toHaveBeenCalled());
    expect(trackDeckCreated).not.toHaveBeenCalled();
    view.unmount();

    renderBuilder('/deck-builder/private-deck-id');
    await waitFor(() => expect(screen.getByPlaceholderText('Ej: Goblin Aggro')).toHaveValue('Existing deck'));
    await user.click(screen.getAllByRole('button', { name: 'Guardar y continuar' })[0]);
    await waitFor(() => expect(DeckService.updateDeck).toHaveBeenCalled());
    expect(trackDeckCreated).not.toHaveBeenCalled();
  });

  it('records builder analysis start and response with the original session state', async () => {
    let resolve!: (value: { general_summary: string; strengths: string[]; weaknesses: string[]; matchups: [] }) => void;
    vi.mocked(DeckService.analyzeDeck).mockReturnValue(new Promise((done) => { resolve = done; }));
    const view = renderBuilder();
    const user = await prepareNewDeck();
    await user.click(screen.getByRole('button', { name: 'Analizar IA' }));
    await waitFor(() => expect(trackAnalysisStarted).toHaveBeenCalledExactlyOnceWith('authenticated', 'deck_builder'));
    session.isAuthenticated = false;
    view.rerender(<MemoryRouter initialEntries={['/deck-builder']}><LanguageProvider><ToastProvider><Routes>
      <Route path="/deck-builder" element={<DeckBuilder />} />
    </Routes></ToastProvider></LanguageProvider></MemoryRouter>);
    const result = { general_summary: 'Private analysis', strengths: [], weaknesses: [], matchups: [] };
    resolve(result);
    await waitFor(() => expect(trackAnalysisFinished).toHaveBeenCalledExactlyOnceWith('authenticated', 'deck_builder', result));
  });

  it('records a failed builder analysis once without tracking deck creation', async () => {
    vi.mocked(DeckService.analyzeDeck).mockRejectedValue(new Error('offline'));
    renderBuilder();
    const user = await prepareNewDeck();
    await user.click(screen.getByRole('button', { name: 'Analizar IA' }));
    await waitFor(() => expect(trackAnalysisStarted).toHaveBeenCalledExactlyOnceWith('authenticated', 'deck_builder'));
    await waitFor(() => expect(trackAnalysisFinished).toHaveBeenCalledExactlyOnceWith('authenticated', 'deck_builder', null));
    expect(trackDeckCreated).not.toHaveBeenCalled();
  });
});
