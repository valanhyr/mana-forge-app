import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { User } from 'lucide-react';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Nombre de usuario" />);
    expect(screen.getByLabelText('Nombre de usuario')).toBeInTheDocument();
  });

  it('associates the label when an explicit id is given', () => {
    render(<Input id="nombre" label="Nombre" />);
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('id', 'nombre');
  });

  it('marks the field invalid and points at the error', () => {
    render(<Input label="Usuario" error="Nombre ya ocupado" />);
    const input = screen.getByLabelText('Usuario');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
    const describedBy = input.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)).toHaveTextContent('Nombre ya ocupado');
  });

  it('points at the hint when there is no error', () => {
    render(<Input label="Usuario" hint="Entre 3 y 20 caracteres" />);
    const describedBy = screen.getByLabelText('Usuario').getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)).toHaveTextContent('Entre 3 y 20 caracteres');
  });

  it('is not invalid without an error', () => {
    render(<Input label="Usuario" />);
    expect(screen.getByLabelText('Usuario')).not.toHaveAttribute('aria-invalid');
  });

  it('renders the icon and keeps padding for it', () => {
    render(<Input label="Usuario" icon={<User size={18} />} />);
    expect(screen.getByLabelText('Usuario')).toHaveClass('pl-10');
  });

  it('types normally', async () => {
    render(<Input label="Usuario" />);
    await userEvent.type(screen.getByLabelText('Usuario'), 'urza');
    expect(screen.getByLabelText('Usuario')).toHaveValue('urza');
  });

  it('supports every native input attribute', () => {
    render(<Input label="Email" type="email" disabled />);
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeDisabled();
  });
});

describe('Textarea', () => {
  it('associates the label', () => {
    render(<Textarea label="Biografía" />);
    expect(screen.getByLabelText('Biografía')).toBeInTheDocument();
  });

  it('marks invalid and points at the error', () => {
    render(<Textarea label="Biografía" error="Demasiado largo" />);
    const input = screen.getByLabelText('Biografía');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)).toHaveTextContent('Demasiado largo');
  });

  it('does not reserve icon padding', () => {
    render(<Textarea label="Biografía" />);
    expect(screen.getByLabelText('Biografía')).not.toHaveClass('pl-10');
  });

  it('types normally', async () => {
    render(<Textarea label="Biografía" />);
    await userEvent.type(screen.getByLabelText('Biografía'), 'hola');
    expect(screen.getByLabelText('Biografía')).toHaveValue('hola');
  });
});