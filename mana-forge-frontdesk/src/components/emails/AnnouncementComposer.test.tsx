import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnouncementComposer } from './AnnouncementComposer';

describe('Announcement composer', () => {
  it('states that it is not a newsletter and needs recipients plus explicit confirmation', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<AnnouncementComposer templates={[]} recipientCount={0} locked={false} onSend={send} />);
    expect(screen.getByText(/not a newsletter/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Maintenance' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Tonight at 22:00' } });
    expect(screen.getByRole('button', { name: /Review recipients/ })).toBeDisabled();
    rerender(<AnnouncementComposer templates={[]} recipientCount={2} locked={false} onSend={send} />);
    fireEvent.click(screen.getByRole('button', { name: /Review recipients/ }));
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send announcement' }));
    expect(send).toHaveBeenCalledWith({ subject: 'Maintenance', body: 'Tonight at 22:00', templateId: undefined });
  });

  it('blocks unresolved macros, more than 100 recipients and locked drafts', () => {
    const send = vi.fn();
    const { rerender } = render(<AnnouncementComposer templates={[]} recipientCount={1} locked={false} onSend={send} />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Notice' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello {{user.name}}' } });
    expect(screen.getByRole('button', { name: /Review recipients/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } });
    rerender(<AnnouncementComposer templates={[]} recipientCount={101} locked={false} onSend={send} />);
    expect(screen.getByRole('button', { name: /Review recipients/ })).toBeDisabled();
    rerender(<AnnouncementComposer templates={[]} recipientCount={1} locked={true} onSend={send} />);
    expect(screen.getByLabelText('Subject')).toBeDisabled();
    expect(send).not.toHaveBeenCalled();
  });

  it('fills subject and body from a template and sends its id', () => {
    const send = vi.fn().mockResolvedValue(undefined);
    render(<AnnouncementComposer recipientCount={1} locked={false} onSend={send}
      templates={[{ id: 'tpl', title: 'Terms', category: 'ANNOUNCEMENT', subject: 'New terms', bodyTemplate: 'We updated them', availableMacros: [] }]} />);
    fireEvent.change(screen.getByLabelText('Announcement template'), { target: { value: 'tpl' } });
    fireEvent.click(screen.getByRole('button', { name: /Review recipients/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Send announcement' }));
    expect(send).toHaveBeenCalledWith({ subject: 'New terms', body: 'We updated them', templateId: 'tpl' });
  });
});
