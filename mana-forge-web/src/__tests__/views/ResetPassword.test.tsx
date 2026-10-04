import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResetPassword from '../../views/auth/ResetPassword';
import { ToastProvider } from '../../services/ToastContext';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as apiModule from '../../services/api';

jest.mock('../../services/api');

test('renders reset password and validates', async () => {
  (apiModule as any).api = { post: jest.fn().mockResolvedValue({}) };
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={["/reset-password?token=abc"]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword/>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );

  const pw = screen.getAllByLabelText(/contraseña/i)[0];
  const confirm = screen.getAllByLabelText(/confirmar contraseña/i)[0];
  fireEvent.change(pw, { target: { value: 'Newpass123' } });
  fireEvent.change(confirm, { target: { value: 'Newpass123' } });
  fireEvent.submit(screen.getByRole('button'));

  expect((apiModule as any).api.post).toHaveBeenCalledWith('/api/auth/reset-password', { token: 'abc', password: 'Newpass123' });
});
