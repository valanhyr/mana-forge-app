import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';

describe('App Integration', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should render the application dashboard with navigation', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^tickets/i })).toBeInTheDocument());
    expect(screen.getByText(/MANA FORGE/i)).toBeInTheDocument();
  });

  it('should switch views when navigation links are clicked', async () => {
    render(<App />);
    const usersBtn = await screen.findByRole('button', { name: /users 360/i });
    fireEvent.click(usersBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search users by username/i)).toBeInTheDocument();
    });
  });
});
