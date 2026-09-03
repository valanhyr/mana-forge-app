import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../../components/layout/Layout';
import * as UserContextModule from '../../../services/UserContext';
import * as TranslationModule from '../../../hooks/useTranslation';

// Mock dependencies
vi.mock('../../../services/UserContext', () => ({
  useUser: vi.fn(),
}));

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: vi.fn(),
}));

vi.mock('../../../services/MessageService', () => ({
  MessageService: {
    getUnreadCount: vi.fn().mockResolvedValue(0),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../../core/utils/avatar', () => ({
  getAvatarUrl: vi.fn((email) => `https://api.example.com/avatar/${email}`),
}));

vi.mock('../../../components/ui/LanguageSelector', () => ({
  default: () => <div>Language Selector</div>,
}));

vi.mock('../../../components/ui/FeedbackModal', () => ({
  default: () => <div>Feedback Modal</div>,
}));

vi.mock('../../../components/ui/BetaWelcomeModal', () => ({
  default: () => <div>Beta Welcome Modal</div>,
}));

vi.mock('../../../views/auth/Login', () => ({
  default: () => <div>Auth Modal</div>,
}));

vi.mock('../../../components/layout/Footer', () => ({
  default: () => <footer>Footer</footer>,
}));

const mockUseUser = UserContextModule.useUser as ReturnType<typeof vi.fn>;
const mockUseTranslation = TranslationModule.useTranslation as ReturnType<typeof vi.fn>;

const defaultMockUser = {
  user: null,
  isAuthenticated: false,
  logout: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  decks: [],
  loadDecks: vi.fn(),
  addDeck: vi.fn(),
  updateDeck: vi.fn(),
  deleteDeck: vi.fn(),
  togglePinDeck: vi.fn(),
  isSessionLoading: false,
  loadDecksError: null,
};

const mockT = (key: string) => key;

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue(defaultMockUser);
    mockUseTranslation.mockReturnValue({ t: mockT });
    sessionStorage.clear();
  });

  it('renderiza sin errores cuando no está autenticado', () => {
    const { container } = render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renderiza con usuario autenticado', () => {
    mockUseUser.mockReturnValue({
      ...defaultMockUser,
      isAuthenticated: true,
      user: {
        id: 'user1',
        email: 'test@example.com',
        username: 'testuser',
      },
    });

    const { container } = render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renderiza componentes internos', () => {
    const { container } = render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );
    
    // Just verify the component renders without crashing
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
