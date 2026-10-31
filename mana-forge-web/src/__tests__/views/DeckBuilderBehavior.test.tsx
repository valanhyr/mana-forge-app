import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeckBuilder from '../../views/deck-builder/DeckBuilder';
import { LanguageProvider } from '../../services/LanguageContext';
import { FormatService } from '../../services/FormatService';
import { CardService } from '../../services/CardService';
import { DeckService } from '../../services/DeckService';

vi.mock('../../services/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUser: () => ({
    user: { userId: 'u1', username: 'testuser' },
    decks: [],
    loadDecks: vi.fn(),
    deleteDeck: vi.fn(),
    togglePinDeck: vi.fn(),
  }),
}));

vi.mock('../../services/FormatService', () => ({
  FormatService: { getActiveFormats: vi.fn() },
}));

vi.mock('../../services/CardService', () => ({
  CardService: {
    getCardByName: vi.fn(),
    batchSearch: vi.fn(),
    autocomplete: vi.fn(),
    getBannedcards: vi.fn(),
  },
}));

vi.mock('../../services/DeckService', () => ({
  DeckService: {
    getDeckById: vi.fn(),
    saveDeck: vi.fn(),
    updateDeck: vi.fn(),
    cloneDeck: vi.fn(),
    getDeckScores: vi.fn(),
    analyzeDeck: vi.fn(),
  },
}));

vi.mock('../../services/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: vi.fn() }),
}));

const premodern = {
  id: 'f1',
  name: { es: 'Premodern', en: 'Premodern' },
  scryfallKey: 'premodern',
  config: { minMainDeck: 60, maxMainDeck: undefined, maxSideboard: 15, maxCopies: 4 },
  isActive: true,
};

const commander = {
  id: 'f2',
  name: { es: 'Commander', en: 'Commander' },
  scryfallKey: 'commander',
  config: { minMainDeck: 99, maxMainDeck: 100, maxSideboard: 0, maxCopies: 1 },
  isActive: true,
};

const mountain = {
  id: 'mountain-id',
  name: 'Mountain',
  mana_cost: '',
  cmc: 0,
  type_line: 'Basic Land — Mountain',
  prices: { eur: '0.1' },
  legalities: { premodern: 'legal', commander: 'legal' },
  image_uris: { normal: 'https://img.test/mountain.jpg' },
};

const renderBuilder = () =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/deck-builder']}>
        <DeckBuilder />
      </MemoryRouter>
    </LanguageProvider>
  );

const selectFormat = async (name: string) => {
  const candidates = await screen.findAllByText(/selecciona un formato/i);
  const dropdown = candidates.find((el) => el.classList.contains('truncate')) ?? candidates[0];
  fireEvent.click(dropdown);
  fireEvent.click(await screen.findByText(name));
};

const importList = async (text: string) => {
  fireEvent.click(screen.getByText('Importar lista de cartas'));
  const textarea = await screen.findByPlaceholderText(/Lightning Bolt/);
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.click(screen.getByText('Importar Cartas'));
};

describe('DeckBuilder: importación, guardado y validación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('app_locale', 'es');
    vi.mocked(FormatService.getActiveFormats).mockResolvedValue([premodern, commander]);
    vi.mocked(CardService.getCardByName).mockResolvedValue(null);
    vi.mocked(CardService.batchSearch).mockResolvedValue({ Mountain: mountain });
    vi.mocked(DeckService.getDeckById).mockResolvedValue(null);
    vi.mocked(DeckService.saveDeck).mockResolvedValue({ id: 'new-deck' });
    vi.mocked(DeckService.getDeckScores).mockResolvedValue({ scores: {} });
  });

  it('import reports lines that cannot be resolved', async () => {
    renderBuilder();
    await selectFormat('Premodern');
    await importList('4 Mountain\n2 Carta Inventada');

    expect((await screen.findAllByText(/2 Carta Inventada/)).length).toBeGreaterThan(0);
    expect(CardService.batchSearch).toHaveBeenCalledWith(['Mountain', 'Carta Inventada']);
  });

  it('save sends the expected payload shape', async () => {
    renderBuilder();
    fireEvent.change(screen.getByPlaceholderText('Ej: Goblin Aggro'), {
      target: { value: 'Mono Red' },
    });
    await selectFormat('Premodern');
    await importList('60 Mountain');
    await waitFor(() => expect(screen.queryByText('Importar Cartas')).not.toBeInTheDocument());

    const saveButton = (await screen.findAllByText('Guardar y salir'))[0];
    await waitFor(() => expect(saveButton.closest('button')).not.toBeDisabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(DeckService.saveDeck).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(DeckService.saveDeck).mock.calls[0][0] as unknown as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      name: 'Mono Red',
      formatId: 'f1',
      userId: 'u1',
      isPrivate: false,
      analysisScores: {},
    });
    expect(payload.cards).toEqual([
      expect.objectContaining({ id: 'mountain-id', quantity: 60, board: 'main' }),
    ]);
  });

  it('commander format asks for 100 cards and a commander', async () => {
    renderBuilder();
    fireEvent.change(screen.getByPlaceholderText('Ej: Goblin Aggro'), {
      target: { value: 'EDH' },
    });
    await selectFormat('Commander');
    await importList('60 Mountain');

    expect(await screen.findByText(/exactamente 100 cartas/i)).toBeInTheDocument();
    expect(screen.getByText(/al menos una carta como Comandante/i)).toBeInTheDocument();
    expect(DeckService.saveDeck).not.toHaveBeenCalled();
  });
});
