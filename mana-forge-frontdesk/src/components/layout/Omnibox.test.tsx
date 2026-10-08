import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { Omnibox } from './Omnibox';

describe('Omnibox', () => {
  it('should render search input and handle typing', async () => {
    render(<Omnibox isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/search users, tickets/i);
    fireEvent.change(input, { target: { value: 'urza' } });
    expect(screen.getByDisplayValue('urza')).toBeInTheDocument();

    await waitFor(() => {
      const elements = screen.getAllByText(/Urza/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('should not render anything when isOpen is false', () => {
    const { container } = render(<Omnibox isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
