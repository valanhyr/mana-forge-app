import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../../../components/layout/Footer';
import { LanguageProvider } from '../../../services/LanguageContext';

const renderFooter = () =>
  render(
    <LanguageProvider>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </LanguageProvider>
  );

describe('Footer', () => {
  it('renders brand, internal links, and legal copy', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: /manaforge/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /explorer/i })).toHaveAttribute('href', '/explorer');
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute(
      'href',
      '/legal/privacy-policy'
    );
    expect(screen.getByRole('link', { name: 'company.wizards.com' })).toHaveAttribute(
      'href',
      'https://company.wizards.com/'
    );
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it('renders external resource links with secure attributes', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: /scryfall/i })).toHaveAttribute(
      'href',
      'https://scryfall.com'
    );
    expect(screen.getByRole('link', { name: /moxfield/i })).toHaveAttribute(
      'href',
      'https://www.moxfield.com'
    );
    expect(screen.getByRole('link', { name: /magic: the gathering official/i })).toHaveAttribute(
      'href',
      'https://magic.wizards.com'
    );

    for (const link of [
      screen.getByRole('link', { name: /scryfall/i }),
      screen.getByRole('link', { name: /moxfield/i }),
      screen.getByRole('link', { name: /magic: the gathering official/i }),
    ]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('toggles accordion sections on mobile buttons', async () => {
    const user = userEvent.setup();
    renderFooter();

    const productButton = screen.getByRole('button', { name: /product/i });
    const resourcesButton = screen.getByRole('button', { name: /resources/i });
    const legalButton = screen.getByRole('button', { name: /legal/i });

    expect(productButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(productButton);
    expect(productButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(resourcesButton);
    expect(productButton).toHaveAttribute('aria-expanded', 'false');
    expect(resourcesButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(legalButton);
    expect(resourcesButton).toHaveAttribute('aria-expanded', 'false');
    expect(legalButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(legalButton);
    expect(legalButton).toHaveAttribute('aria-expanded', 'false');
  });
});
