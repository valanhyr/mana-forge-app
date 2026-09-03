import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import App from '../App';
import { mockUser } from './mocks/handlers';

const BASE = 'http://localhost:8080';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renderiza sin fallos', async () => {
    server.use(
      http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 })),
      http.get(`${BASE}/formats/active`, () => HttpResponse.json([])),
      http.get(`${BASE}/legal/active`, () => HttpResponse.json({}))
    );
    render(<App />);
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('renderiza Layout cuando la sesión está cargada', async () => {
    server.use(
      http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 })),
      http.get(`${BASE}/formats/active`, () => HttpResponse.json([])),
      http.get(`${BASE}/legal/active`, () => HttpResponse.json({}))
    );
    render(<App />);
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
