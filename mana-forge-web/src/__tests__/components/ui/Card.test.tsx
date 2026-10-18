import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card, { CardHeader, CardTitle } from '../../../components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>contenido</Card>);
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  it('renders a header with a title', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Editar perfil</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByRole('heading', { name: 'Editar perfil' })).toBeInTheDocument();
  });

  it('uses the surface token and the xl radius', () => {
    const { container } = render(<Card>contenido</Card>);
    expect(container.firstElementChild).toHaveClass('bg-surface', 'rounded-xl');
  });

  it('accepts extra classes without losing the token classes', () => {
    const { container } = render(<Card className="p-2">contenido</Card>);
    expect(container.firstElementChild).toHaveClass('bg-surface', 'rounded-xl', 'p-2');
  });
});