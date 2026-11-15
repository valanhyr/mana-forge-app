import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import KlaroConsent from '../../components/ui/KlaroConsent';
import { LanguageProvider, useLanguage } from '../../services/LanguageContext';
import { setAnalyticsConsent } from '../../services/AnalyticsService';

vi.mock('../../services/AnalyticsService', () => ({ setAnalyticsConsent: vi.fn() }));

const SwitchLanguage = () => {
  const { setLocale } = useLanguage();
  return <button onClick={() => setLocale('en')}>Switch language</button>;
};

describe('Klaro language', () => {
  it('updates the visible banner when the application language changes', async () => {
    localStorage.clear();
    localStorage.setItem('app_locale', 'es');
    const user = userEvent.setup();
    render(<MemoryRouter><LanguageProvider><SwitchLanguage /><KlaroConsent /></LanguageProvider></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Rechazar todas' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(await screen.findByRole('button', { name: 'Reject all' })).toBeInTheDocument();
    expect(setAnalyticsConsent).not.toHaveBeenCalledWith(true);
  });
});
