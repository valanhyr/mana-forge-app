import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../../../components/ui/Button';

describe('Button', () => {
  it('renders children and forwards the click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('defaults to type=button so it cannot submit a form by accident', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('submits when type=submit is passed explicitly', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Guardar</Button>
      </form>
    );
    screen.getByRole('button').click();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('blocks the click while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps an accessible name while loading', () => {
    render(<Button loading>Guardando</Button>);
    expect(screen.getByRole('button', { name: 'Guardando' })).toBeInTheDocument();
  });

  it('marks the destructive variant', () => {
    const { rerender } = render(<Button variant="destructive">Eliminar</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-red-400');
    rerender(<Button variant="primary">Guardar</Button>);
    expect(screen.getByRole('button')).not.toHaveClass('text-red-400');
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the size token', () => {
    const { rerender } = render(<Button size="sm">Guardar</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2');
    rerender(<Button size="md">Guardar</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-2.5');
  });
});