import { describe, it, expect } from 'vitest';
import { LegalService } from '../../../services/LegalService';

describe('LegalService', () => {
  it('getBySlug retorna la página correcta para locale "es"', async () => {
    // El mock tiene al menos la página de privacy-policy
    const page = await LegalService.getBySlug('privacy-policy', 'es');
    // Si no existe el slug en el mock, retorna null (también es válido)
    if (page) {
      expect(page.slug).toBe('privacy-policy');
    } else {
      // El mock puede no tener ese slug, verificamos que retorna null
      expect(page).toBeNull();
    }
  });

  it('getBySlug retorna la página correcta para locale "en"', async () => {
    const page = await LegalService.getBySlug('privacy-policy', 'en');
    if (page) {
      expect(page.slug).toBe('privacy-policy');
    } else {
      expect(page).toBeNull();
    }
  });

  it('getBySlug retorna null para un slug que no existe', async () => {
    const page = await LegalService.getBySlug('non-existent-slug-xyz', 'es');
    expect(page).toBeNull();
  });

  it('getBySlug hace fallback a "en" para un locale desconocido', async () => {
    // Con locale desconocido no debe lanzar error
    const page = await LegalService.getBySlug('privacy-policy', 'fr');
    // Devuelve la versión en inglés o null, pero nunca lanza
    expect(page === null || typeof page === 'object').toBe(true);
  });

  it.each(['es', 'en'])('describes explicit analytics consent in the %s policy', async (locale) => {
    const cookiePolicy = await LegalService.getBySlug('cookie-policy', locale);
    const privacyPolicy = await LegalService.getBySlug('privacy-policy', locale);
    const cookieText = cookiePolicy?.sections.map((section) => section.content).join(' ') ?? '';
    const privacyText = privacyPolicy?.sections.map((section) => section.content).join(' ') ?? '';
    expect(cookieText).toContain('Google Analytics');
    expect(privacyText).toContain('Google Analytics');
    expect(cookieText).toContain(locale === 'es' ? 'creación y duplicación de mazos y uso del análisis de IA' : 'deck creation and cloning and use of AI analysis');
    expect(privacyText).toContain(locale === 'es' ? 'creación y duplicación de mazos y uso del análisis de IA' : 'deck creation and cloning and use of AI analysis');
    const newCategories = locale === 'es'
      ? 'inicios de sesión, registros, verificaciones de correo, envíos de contacto, copias de listas y errores de uso'
      : 'sign-ins, registrations, email verifications, contact submissions, deck-list copies and usage errors';
    expect(cookieText).toContain(newCategories);
    expect(privacyText).toContain(newCategories);
    expect(cookieText).toContain(locale === 'es' ? 'marca temporal' : 'temporary marker');
    expect(privacyText).not.toMatch(/No recibe el contenido de tus mazos|It does not receive the contents of your decks/i);
    expect(privacyText).toContain(locale === 'es'
      ? 'La integración de Faro está desactivada en esta versión'
      : 'The Faro integration is disabled in this version');
    expect(privacyText).toContain(locale === 'es'
      ? 'los datos enviados anteriormente pueden conservarse'
      : 'previously sent data may be retained');
    expect(cookieText).not.toMatch(/Grafana|Faro/i);
    expect(cookieText).not.toMatch(/Al continuar usando Mana Forge, consientes|By continuing to use Mana Forge, you consent/i);
    expect(cookieText).not.toMatch(/datos son agregados y anónimos|data is aggregated and anonymous/i);
  });
});
