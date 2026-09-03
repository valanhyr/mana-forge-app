import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from '../../../components/ui/LoadingOverlay';

describe('LoadingOverlay', () => {
  it('no renderiza cuando open es false', () => {
    const { container } = render(
      <LoadingOverlay open={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza cuando open es true', () => {
    render(
      <LoadingOverlay open={true} />
    );
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('muestra mensaje personalizado', () => {
    render(
      <LoadingOverlay open={true} message="Procesando..." />
    );
    expect(screen.getByText('Procesando...')).toBeInTheDocument();
  });

  it('muestra spinner SVG', () => {
    const { container } = render(
      <LoadingOverlay open={true} />
    );
    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
  });

  it('tiene mensaje default cuando no se proporciona', () => {
    render(
      <LoadingOverlay open={true} message={undefined} />
    );
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('renderiza con overlay oscuro', () => {
    const { container } = render(
      <LoadingOverlay open={true} />
    );
    const overlay = container.querySelector('div[class*="bg-black"]');
    expect(overlay).toBeInTheDocument();
  });

  it('posiciona el contenido en el centro', () => {
    const { container } = render(
      <LoadingOverlay open={true} />
    );
    const wrapper = container.querySelector('div[class*="flex items-center justify-center"]');
    expect(wrapper).toBeInTheDocument();
  });
});
