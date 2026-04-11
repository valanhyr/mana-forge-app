import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../../services/ToastContext';

const ToastTrigger = ({
  message = 'Test message',
  type,
}: {
  message?: string;
  type?: 'success' | 'error' | 'info';
}) => {
  const { showToast } = useToast();
  return <button onClick={() => showToast(message, type)}>Show Toast</button>;
};

const renderWithProvider = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>);

describe('ToastContext', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('showToast renderiza el mensaje', () => {
    renderWithProvider(<ToastTrigger message="Deck guardado!" />);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByText('Deck guardado!')).toBeInTheDocument();
  });

  it('el toast desaparece automáticamente después de 3.5s', () => {
    vi.useFakeTimers();
    renderWithProvider(<ToastTrigger message="Auto dismiss" />);

    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('toast tipo "success" muestra el icono ✓', () => {
    renderWithProvider(<ToastTrigger type="success" />);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('toast tipo "error" muestra el icono ✕', () => {
    renderWithProvider(<ToastTrigger type="error" />);
    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });
    expect(screen.getAllByText('✕').length).toBeGreaterThanOrEqual(1);
  });

  it('el botón ✕ elimina el toast inmediatamente', () => {
    renderWithProvider(<ToastTrigger message="Cerrar esto" />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Show Toast' }));
    });
    expect(screen.getByText('Cerrar esto')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    });
    expect(screen.queryByText('Cerrar esto')).not.toBeInTheDocument();
  });

  it('se pueden mostrar múltiples toasts simultáneos', () => {
    const MultiTrigger = () => {
      const { showToast } = useToast();
      return (
        <>
          <button onClick={() => showToast('Mensaje 1')}>T1</button>
          <button onClick={() => showToast('Mensaje 2')}>T2</button>
        </>
      );
    };
    render(
      <ToastProvider>
        <MultiTrigger />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'T1' }));
      fireEvent.click(screen.getByRole('button', { name: 'T2' }));
    });

    expect(screen.getByText('Mensaje 1')).toBeInTheDocument();
    expect(screen.getByText('Mensaje 2')).toBeInTheDocument();
  });

  it('useToast fuera del Provider lanza error descriptivo', () => {
    const BadComponent = () => {
      useToast();
      return null;
    };
    expect(() => render(<BadComponent />)).toThrow('useToast must be used within ToastProvider');
  });
});
