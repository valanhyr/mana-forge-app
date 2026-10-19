import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Modal from '../../../components/ui/Modal';

describe('Modal', () => {
  afterEach(() => {
    cleanup();
  });

  it('no renderiza cuando isOpen es false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <div>Content</div>
      </Modal>
    );
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
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

  it('tiene un dialog con role="dialog" cuando está abierto', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">
        <div>Content</div>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('aplica maxWidth por defecto', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">
        <div>Content</div>
      </Modal>
    );
    const content = screen.getByRole('dialog');
    expect(content).toBeInTheDocument();
  });

  it('aplica className personalizado', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" className="custom-class">
        <div>Content</div>
      </Modal>
    );
    expect(document.body.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('soporta fullScreenMobile', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test" fullScreenMobile={true}>
        <div>Content</div>
      </Modal>
    );
    expect(screen.getByRole('dialog').className).toContain('inset-0');
  });
});
