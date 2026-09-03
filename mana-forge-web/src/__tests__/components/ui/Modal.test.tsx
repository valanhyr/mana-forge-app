import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../../../components/ui/Modal';

describe('Modal', () => {
  it('no renderiza cuando isOpen es false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza contenido cuando isOpen es true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <div>Test Content</div>
      </Modal>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('muestra el título', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Mi Título">
        <div>Content</div>
      </Modal>
    );
    expect(screen.getByText('Mi Título')).toBeInTheDocument();
  });

  it('llama onClose cuando se hace clic en el botón cerrar', () => {
    const onCloseMock = vi.fn();
    render(
      <Modal isOpen={true} onClose={onCloseMock} title="Test">
        <div>Content</div>
      </Modal>
    );
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('aplica maxWidth por defecto', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">
        <div>Content</div>
      </Modal>
    );
    const modal = container.querySelector('div[class*="max-w"]');
    expect(modal).toBeInTheDocument();
  });

  it('aplica maxWidth personalizado', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" maxWidth="max-w-2xl">
        <div>Content</div>
      </Modal>
    );
    const modal = container.querySelector('div[class*="max-w-2xl"]');
    expect(modal).toBeInTheDocument();
  });

  it('aplicaclasName personalizado', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" className="custom-class">
        <div>Content</div>
      </Modal>
    );
    const modal = container.querySelector('div[class*="custom-class"]');
    expect(modal).toBeInTheDocument();
  });

  it('soporta fullScreenMobile', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" fullScreenMobile={true}>
        <div>Content</div>
      </Modal>
    );
    const overlay = container.querySelector('div[class*="fixed"]');
    expect(overlay).toBeInTheDocument();
  });

  it('oculta overflow del body cuando está abierto', () => {
    const originalOverflow = document.body.style.overflow;
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">
        <div>Content</div>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');
    document.body.style.overflow = originalOverflow;
  });

  it('restaura overflow del body cuando se cierra', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">
        <div>Content</div>
      </Modal>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="Test">
        <div>Content</div>
      </Modal>
    );
    // Restore should have been called in cleanup
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
