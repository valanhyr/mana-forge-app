import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchInput from '../../../components/ui/SearchInput';

describe('SearchInput', () => {
  it('renderiza con valor inicial', () => {
    render(
      <SearchInput value="test" onChange={vi.fn()} />
    );
    const input = screen.getByDisplayValue('test');
    expect(input).toBeInTheDocument();
  });

  it('llama onChange cuando cambia el input', async () => {
    const onChangeMock = vi.fn();
    render(
      <SearchInput value="" onChange={onChangeMock} />
    );
    const input = screen.getByPlaceholderText('Buscar...');
    await userEvent.type(input, 'test');
    expect(onChangeMock).toHaveBeenCalled();
  });

  it('llama onSearch cuando se hace clic en el botón', () => {
    const onSearchMock = vi.fn();
    render(
      <SearchInput value="test" onChange={vi.fn()} onSearch={onSearchMock} />
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onSearchMock).toHaveBeenCalled();
  });

  it('llama onSearch cuando se presiona Enter', async () => {
    const onSearchMock = vi.fn();
    render(
      <SearchInput value="test" onChange={vi.fn()} onSearch={onSearchMock} />
    );
    const input = screen.getByDisplayValue('test');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearchMock).toHaveBeenCalled();
  });

  it('no llama onSearch si está deshabilitado y presiona Enter', () => {
    const onSearchMock = vi.fn();
    render(
      <SearchInput value="test" onChange={vi.fn()} onSearch={onSearchMock} disabled={true} />
    );
    const input = screen.getByDisplayValue('test');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearchMock).not.toHaveBeenCalled();
  });

  it('muestra label cuando se proporciona', () => {
    render(
      <SearchInput value="" onChange={vi.fn()} label="Buscar cartas" />
    );
    expect(screen.getByText('Buscar cartas')).toBeInTheDocument();
  });

  it('muestra hint cuando se proporciona', () => {
    render(
      <SearchInput value="" onChange={vi.fn()} hint="Ingrese el nombre de la carta" />
    );
    expect(screen.getByText('Ingrese el nombre de la carta')).toBeInTheDocument();
  });

  it('muestra error cuando se proporciona', () => {
    render(
      <SearchInput value="" onChange={vi.fn()} error="Carta no encontrada" />
    );
    expect(screen.getByText('Carta no encontrada')).toBeInTheDocument();
  });

  it('aplica placeholder personalizado', () => {
    render(
      <SearchInput value="" onChange={vi.fn()} placeholder="Escriba aquí..." />
    );
    const input = screen.getByPlaceholderText('Escriba aquí...');
    expect(input).toBeInTheDocument();
  });

  it('deshabilita el input cuando disabled es true', () => {
    render(
      <SearchInput value="" onChange={vi.fn()} disabled={true} />
    );
    const input = screen.getByRole('textbox');
    const button = screen.getByRole('button');
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('muestra buttonLabel cuando se proporciona', () => {
    render(
      <SearchInput value="" onChange={vi.fn()} buttonLabel="Buscar" />
    );
    expect(screen.getByText('Buscar')).toBeInTheDocument();
  });

  it('renderiza buttonIcon cuando se proporciona', () => {
    render(
      <SearchInput value="" onChange={vi.fn()} buttonIcon={<span data-testid="custom-icon">🔍</span>} />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
