import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import VerifyEmail from '../../views/auth/VerifyEmail';
import { LanguageProvider } from '../../services/LanguageContext';

const BASE = 'http://localhost:8080';

const renderVerify = (search = '?token=valid-token') =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[`/verify-email${search}`]}>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );

describe('VerifyEmail', () => {
  it('muestra el estado de carga al iniciar', () => {
    // Retrasar la respuesta para capturar el estado loading
    server.use(
      http.get(`${BASE}/users/verify`, async () => {
        await new Promise((r) => setTimeout(r, 100));
        return new HttpResponse(null, { status: 200 });
      })
    );
    renderVerify();
    // El spinner se muestra antes de recibir respuesta
    // Comprobamos que no hay ni success ni error inmediatamente
    expect(screen.queryByText(/verificado/i)).not.toBeInTheDocument();
  });

  it('muestra estado success tras verificación exitosa', async () => {
    server.use(http.get(`${BASE}/users/verify`, () => new HttpResponse(null, { status: 200 })));
    renderVerify();
    await waitFor(() => {
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  it('muestra estado error cuando no hay token en la URL', async () => {
    renderVerify('');
    await waitFor(() => {
      // Sin token, status pasa a 'error' inmediatamente
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('muestra estado error cuando el token es inválido', async () => {
    server.use(http.get(`${BASE}/users/verify`, () => new HttpResponse(null, { status: 400 })));
    renderVerify('?token=invalid-token');
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('navega a /login 2s después de una verificación exitosa', async () => {
    vi.useFakeTimers();
    server.use(http.get(`${BASE}/users/verify`, () => new HttpResponse(null, { status: 200 })));
    renderVerify();

    // Flush microtasks so the fetch response processes and state updates
    await act(async () => {});

    expect(screen.getByRole('heading')).toBeInTheDocument();

    // Advance past the 2s navigation delay
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
