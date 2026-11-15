import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { LanguageProvider } from '../../services/LanguageContext';
import { trackPageView } from '../../services/AnalyticsService';

vi.mock('../../services/AnalyticsService', () => ({ trackPageView: vi.fn() }));
vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ isAuthenticated: false, user: null, logout: vi.fn() }),
}));
vi.mock('../../views/auth/Login', () => ({ default: () => null }));
vi.mock('../../components/ui/FeedbackModal', () => ({ default: () => null }));
vi.mock('../../components/ui/BetaWelcomeModal', () => ({ default: () => null }));

describe('SPA analytics routing', () => {
  it('delegates page tracking instead of calling gtag directly', () => {
    const gtag = vi.fn();
    Object.assign(window, { gtag });
    render(<MemoryRouter initialEntries={['/contact?source=test']}><LanguageProvider><Layout /></LanguageProvider></MemoryRouter>);
    expect(trackPageView).toHaveBeenCalledWith('/contact?source=test');
    expect(gtag).not.toHaveBeenCalled();
    delete (window as unknown as { gtag?: unknown }).gtag;
  });
});
