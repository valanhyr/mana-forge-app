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
    expect(screen.getByText(/MANA FORGE/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^tickets/i })).toBeInTheDocument();
  });

  it('should switch views when navigation links are clicked', async () => {
    render(<App />);
    const usersBtn = screen.getByRole('button', { name: /users 360/i });
    fireEvent.click(usersBtn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search users by username/i)).toBeInTheDocument();
    });
  });
});
