import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ForgotPassword from '../../views/auth/ForgotPassword';
import { ToastProvider } from '../../services/ToastContext';
import * as apiModule from '../../services/api';

jest.mock('../../services/api');

test('renders forgot password and sends request', async () => {
  (apiModule as any).api = { post: jest.fn().mockResolvedValue({}) };
  render(<ToastProvider><ForgotPassword/></ToastProvider>);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'me@example.com' } });
  fireEvent.submit(screen.getByRole('button'));
  expect((apiModule as any).api.post).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'me@example.com' });
});
