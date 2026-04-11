import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../../views/errors/NotFound';
import { LanguageProvider } from '../../services/LanguageContext';

const renderNotFound = () =>
  render(
    <LanguageProvider>
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    </LanguageProvider>
  );

describe('NotFound', () => {
  it('renderiza el número decorativo 404', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renderiza el título y descripción traducidos', () => {
    renderNotFound();
    // Verificamos que hay textos visibles que vienen de las traducciones
    // (no los hardcodeamos para no acoplar el test a un idioma concreto)
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).not.toBe('');
  });

  it('el botón "Go Home" es un link que enlaza a "/"', () => {
    renderNotFound();
    const homeLink = screen.getByRole('link');
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
