import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownInput from '../../../components/ui/DropdownInput';

const options = [
  { value: 'opt1', label: 'Opción 1' },
  { value: 'opt2', label: 'Opción 2' },
  { value: 'opt3', label: 'Opción 3' },
];

const DEFAULT_PLACEHOLDER = 'Selecciona una opción';

describe('DropdownInput', () => {
  it('muestra el placeholder cuando no hay valor seleccionado', () => {
    render(
      <DropdownInput options={options} value="" onChange={vi.fn()} placeholder="Selecciona" />
    );
    expect(screen.getByText('Selecciona')).toBeInTheDocument();
  });

  it('abre la lista de opciones al hacer click', async () => {
    const user = userEvent.setup();
    render(<DropdownInput options={options} value="" onChange={vi.fn()} />);
    await user.click(screen.getByText(DEFAULT_PLACEHOLDER));
    expect(screen.getByText('Opción 1')).toBeInTheDocument();
    expect(screen.getByText('Opción 2')).toBeInTheDocument();
  });

  it('llama onChange con el valor correcto al seleccionar una opción', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DropdownInput options={options} value="" onChange={onChange} />);
    await user.click(screen.getByText(DEFAULT_PLACEHOLDER));
    await user.click(screen.getByText('Opción 2'));
    expect(onChange).toHaveBeenCalledWith('opt2');
  });

  it('se cierra al hacer click fuera del componente', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DropdownInput options={options} value="" onChange={vi.fn()} />
        <span>Fuera del dropdown</span>
      </div>
    );
    await user.click(screen.getByText(DEFAULT_PLACEHOLDER));
    expect(screen.getByText('Opción 1')).toBeInTheDocument();
    await user.click(screen.getByText('Fuera del dropdown'));
    expect(screen.queryByText('Opción 1')).not.toBeInTheDocument();
  });

  it('no se abre cuando disabled=true', async () => {
    const user = userEvent.setup();
    render(<DropdownInput options={options} value="" onChange={vi.fn()} disabled />);
    await user.click(screen.getByText(DEFAULT_PLACEHOLDER));
    expect(screen.queryByText('Opción 1')).not.toBeInTheDocument();
  });
});
