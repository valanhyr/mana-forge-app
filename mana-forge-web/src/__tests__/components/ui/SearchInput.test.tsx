import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchInput from '../../../components/ui/SearchInput';

describe('SearchInput', () => {
  it('renderiza el input y el botón de búsqueda', () => {
    render(<SearchInput value="" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('llama onChange al escribir en el input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="" onChange={onChange} />);
    await user.type(screen.getByRole('textbox'), 'li');
    expect(onChange).toHaveBeenCalled();
  });

  it('llama onSearch al hacer click en el botón', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="test" onSearch={onSearch} />);
    await user.click(screen.getByRole('button'));
    expect(onSearch).toHaveBeenCalledOnce();
  });

  it('llama onSearch al pulsar Enter en el input', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="test" onSearch={onSearch} />);
    await user.type(screen.getByRole('textbox'), '{Enter}');
    expect(onSearch).toHaveBeenCalledOnce();
  });

  it('no llama onSearch cuando disabled=true', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchInput value="test" onSearch={onSearch} disabled />);
    await user.click(screen.getByRole('button'));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de error cuando error prop tiene valor', () => {
    render(<SearchInput value="" error="Campo requerido" />);
    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
  });

  it('muestra el hint cuando no hay error', () => {
    render(<SearchInput value="" hint="Escribe al menos 3 caracteres" />);
    expect(screen.getByText('Escribe al menos 3 caracteres')).toBeInTheDocument();
  });
});
