import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../../components/layout/ProtectedRoute';
import { useUser } from '../../../services/UserContext';
import { LanguageProvider } from '../../../services/LanguageContext';

vi.mock('../../../services/UserContext');

const mockUseUser = useUser as ReturnType<typeof vi.fn>;

const renderProtected = () =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );

describe('ProtectedRoute', () => {
  it('muestra el spinner cuando isSessionLoading es true', () => {
    mockUseUser.mockReturnValue({ isAuthenticated: false, isSessionLoading: true });
    renderProtected();
    // ForgeSpinner se renderiza, verificamos que no hay contenido protegido
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('redirige a "/" cuando el usuario no está autenticado', () => {
    mockUseUser.mockReturnValue({ isAuthenticated: false, isSessionLoading: false });
    renderProtected();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renderiza el Outlet cuando el usuario está autenticado', () => {
    mockUseUser.mockReturnValue({ isAuthenticated: true, isSessionLoading: false });
    renderProtected();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
