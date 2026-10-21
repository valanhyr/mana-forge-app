import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordField from '../../../components/ui/PasswordField';

const setup = (overrides: Partial<React.ComponentProps<typeof PasswordField>> = {}) => {
  const props = {
    id: 'pw',
    label: 'Contraseña Actual',
    value: '',
    visible: false,
    toggleLabel: 'Mostrar contraseña',
    onVisibleChange: vi.fn(),
    onChange: vi.fn(),
    ...overrides,
  };
  const view = render(<PasswordField {...props} />);
  return { props, user: userEvent.setup(), ...view };
};

describe('PasswordField', () => {
  it('associates the label with the input', () => {
    setup();
    expect(screen.getByLabelText('Contraseña Actual')).toBeInTheDocument();
  });

  it('masks the value by default', () => {
    setup();
    expect(screen.getByLabelText('Contraseña Actual')).toHaveAttribute('type', 'password');
  });

  it('shows the value when visible', () => {
    setup({ visible: true });
    expect(screen.getByLabelText('Contraseña Actual')).toHaveAttribute('type', 'text');
  });

  it('uses the given toggle label and reports its pressed state', async () => {
    const { props, user } = setup({ visible: true, toggleLabel: 'Ocultar contraseña' });
    const toggle = screen.getByRole('button', { name: 'Ocultar contraseña' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle);
    expect(props.onVisibleChange).toHaveBeenCalledOnce();
  });

  it('reports typed values as strings', async () => {
    // El input es controlado, así que el DOM no refleja lo tecleado mientras
    // el padre no actualice `value`. Comprobamos lo que se emite.
    const onChange = vi.fn();
    const Wrapper = () => {
      const [value, setValue] = useState('');
      return (
        <PasswordField
          id="pw"
          label="Contraseña Actual"
          value={value}
          visible={false}
          toggleLabel="Mostrar contraseña"
          onVisibleChange={vi.fn()}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    };
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.type(screen.getByLabelText('Contraseña Actual'), 'secreto');
    expect(onChange).toHaveBeenLastCalledWith('secreto');
    expect(screen.getByLabelText('Contraseña Actual')).toHaveValue('secreto');
  });

  it('does not submit the form when the toggle is pressed', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { user } = setup();
    render(
      <form onSubmit={onSubmit}>
        <button type="submit">enviar</button>
      </form>
    );
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});