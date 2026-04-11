import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../../../components/ui/Modal';

describe('Modal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Contenido</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('renderiza el contenido cuando isOpen es true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Contenido del modal</p>
      </Modal>
    );
    expect(screen.getByText('Contenido del modal')).toBeInTheDocument();
  });

  it('muestra el title proporcionado', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Mi Título">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Mi Título')).toBeInTheDocument();
  });

  it('llama onClose al hacer click en el botón X', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    await user.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
