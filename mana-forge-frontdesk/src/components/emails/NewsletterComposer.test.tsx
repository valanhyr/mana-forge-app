import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NewsletterComposer } from './NewsletterComposer';

describe('Newsletter composer', () => {
  it('requires selected subscribers and explicit confirmation before starting', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<NewsletterComposer templates={[]} recipientCount={0} locked={false} onSend={send} />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'News' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Updates' } });
    expect(screen.getByRole('button', { name: /Review recipients/ })).toBeDisabled();
    rerender(<NewsletterComposer templates={[]} recipientCount={2} locked={false} onSend={send} />);
    fireEvent.click(screen.getByRole('button', { name: /Review recipients/ }));
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start campaign' }));
    expect(send).toHaveBeenCalledWith({ subject: 'News', body: 'Updates', templateId: undefined });
  });
  it('locks a submitted draft and blocks unresolved macros', () => {
    const send = vi.fn();
    const { rerender } = render(<NewsletterComposer templates={[]} recipientCount={1} locked={false} onSend={send} />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'News' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello {{user.name}}' } });
    expect(screen.getByRole('button', { name: /Review recipients/ })).toBeDisabled();
    rerender(<NewsletterComposer templates={[]} recipientCount={1} locked={true} onSend={send} />);
    expect(screen.getByLabelText('Subject')).toBeDisabled(); expect(send).not.toHaveBeenCalled();
  });
});
