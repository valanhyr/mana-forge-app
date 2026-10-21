import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReplyBox } from './ReplyBox';

describe('ReplyBox', () => {
  it('never transfers a private draft into a public reply and asks before discarding it', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ReplyBox onSendMessage={vi.fn()} canReplyOnWeb />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SECRET draft' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('textbox')).toHaveValue('SECRET draft');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('button', { name: /respond on the web/i })).toBeDisabled();
    confirm.mockRestore();
  });
  it('does not offer a public reply without declared web access but still allows a private note', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    render(<ReplyBox onSendMessage={send} />);
    expect(screen.queryByRole('button', { name: /respond on the web/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/internal note/i));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Private only' } });
    fireEvent.click(screen.getByRole('button', { name: /save note/i }));
    await waitFor(() => expect(send).toHaveBeenCalledWith('Private only', true));
  });
  it('preserves the draft on failed writes and clears it only on confirmation', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('conflict')).mockResolvedValueOnce(undefined);
    render(<ReplyBox onSendMessage={send} canReplyOnWeb />);
    const draft = screen.getByPlaceholderText(/type your reply/i);
    fireEvent.change(draft, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Respond on the web' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(draft).toHaveValue('Keep this draft');
    fireEvent.click(screen.getByRole('button', { name: 'Respond on the web' }));
    await waitFor(() => expect(draft).toHaveValue(''));
  });
});
