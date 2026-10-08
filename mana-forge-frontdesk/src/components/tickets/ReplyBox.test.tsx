import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReplyBox } from './ReplyBox';

describe('ReplyBox', () => {
  it('preserves the draft on failed writes and clears it only on confirmation', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('conflict')).mockResolvedValueOnce(undefined);
    render(<ReplyBox onSendMessage={send} />);
    const draft = screen.getByPlaceholderText(/type your reply/i);
    fireEvent.change(draft, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save reply' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(draft).toHaveValue('Keep this draft');
    fireEvent.click(screen.getByRole('button', { name: 'Save reply' }));
    await waitFor(() => expect(draft).toHaveValue(''));
  });
});
