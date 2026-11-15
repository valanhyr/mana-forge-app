import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import KlaroConsent from '../../components/ui/KlaroConsent';
import FaqSection from '../../components/home/FaqSection';
import { LanguageProvider } from '../../services/LanguageContext';
import { trackFaqOpen, trackPageView } from '../../services/AnalyticsService';

const googleScript = () => document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com/gtag/js"]');
const eventCount = () => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
  .filter((entry) => entry[0] === 'event' && entry[1] === 'faq_open').length;

describe('consent and FAQ analytics integration', () => {
  it('sends FAQ openings only after consent and stops after withdrawal', async () => {
    localStorage.clear();
    localStorage.setItem('app_locale', 'es');
    trackPageView('/');
    const user = userEvent.setup();
    render(
      <MemoryRouter><LanguageProvider>
        <FaqSection
          title="FAQ" topicsLabel="Topics"
          topics={[{ id: 'general', title: 'General', questions: [{ id: 'first', question: 'Pregunta', answer: 'Respuesta' }] }]}
          onOpen={(topic, faq) => trackFaqOpen(topic, faq, 'es')}
        />
        <KlaroConsent />
      </LanguageProvider></MemoryRouter>
    );

    const question = screen.getByRole('button', { name: 'Pregunta' });
    await user.click(question);
    expect(googleScript()).toBeNull();
    await user.click(await screen.findByRole('button', { name: 'Aceptar todas' }));
    await waitFor(() => expect(googleScript()).not.toBeNull());
    googleScript()?.dispatchEvent(new Event('load'));
    await user.click(question);
    await user.click(question);
    expect(eventCount()).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Gestionar consentimiento' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Google Analytics' }));
    await user.click(screen.getByRole('button', { name: 'Guardar preferencias' }));
    await user.click(question);
    await user.click(question);
    expect(eventCount()).toBe(1);
  });
});
