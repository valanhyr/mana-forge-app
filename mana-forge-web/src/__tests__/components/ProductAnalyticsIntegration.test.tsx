import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { StrictMode } from 'react';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { setAnalyticsConsent, trackPageView } from '../../services/AnalyticsService';
import Contact from '../../views/contact/Contact';
import NotFound from '../../views/errors/NotFound';

const events = () => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
  .map((args) => Array.from(args)).filter((entry) => entry[0] === 'event');

function Navigation() {
  const navigate = useNavigate();
  return <>
    <button onClick={() => { trackPageView('/contact'); navigate('/contact'); }}>Contact</button>
    <button onClick={() => { trackPageView('/missing-private'); navigate('/missing-private'); }}>Missing</button>
  </>;
}

describe('product analytics and consent integration', () => {
  afterEach(() => setAnalyticsConsent(false));

  it('does not replay pre-consent 404s and sends consented contact and 404 events without form data', async () => {
    setAnalyticsConsent(false);
    const user = userEvent.setup();
    render(<StrictMode><LanguageProvider><ToastProvider><MemoryRouter initialEntries={['/first-private']}>
      <Navigation /><Routes><Route path="/contact" element={<Contact />} /><Route path="*" element={<NotFound />} /></Routes>
    </MemoryRouter></ToastProvider></LanguageProvider></StrictMode>);
    expect(events()).toEqual([]);

    setAnalyticsConsent(true);
    document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com/gtag/js"]')?.dispatchEvent(new Event('load'));
    expect(events().filter((entry) => entry[1] === 'page_not_found')).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Contact' }));
    const fields = screen.getAllByRole('textbox');
    fireEvent.change(fields[0], { target: { value: 'Private Person' } });
    fireEvent.change(fields[1], { target: { value: 'private@example.com' } });
    fireEvent.change(fields[2], { target: { value: 'Private message content' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'general' } });
    await user.click(screen.getByRole('button', { name: /enviar|send/i }));
    await waitFor(() => expect(events()).toContainEqual(['event', 'contact_submitted', {}]));
    await user.click(screen.getByRole('button', { name: 'Missing' }));
    await waitFor(() => expect(events()).toContainEqual(['event', 'page_not_found', {}]));
    expect(events().filter((entry) => entry[1] === 'page_not_found')).toHaveLength(1);
    expect(JSON.stringify(events())).not.toMatch(/Private Person|private@example\.com|Private message content|missing-private|first-private/);
    setAnalyticsConsent(false);
    const count = events().length;
    await user.click(screen.getByRole('button', { name: 'Contact' }));
    await user.click(screen.getByRole('button', { name: 'Missing' }));
    expect(events()).toHaveLength(count);
  });
});
