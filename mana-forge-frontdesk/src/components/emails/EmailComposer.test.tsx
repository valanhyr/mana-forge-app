import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { EmailComposer } from './EmailComposer';
import { EmailTemplate } from '../../core/domain/email';

const mockTemplate: EmailTemplate = {
  id: 'TPL-01',
  title: 'AI Quota Restored',
  category: 'SUPPORT',
  subject: 'Your AI Quota on Mana Forge has been reset',
  bodyTemplate: 'Dear {{user.name}},\n\nYour limit has been restored.',
  availableMacros: ['user.name'],
};

describe('EmailComposer', () => {
  it('should render template fields and live preview', () => {
    render(<EmailComposer templates={[mockTemplate]} onSend={vi.fn()} />);
    const recipientInput = screen.getByLabelText(/recipient email/i);
    fireEvent.change(recipientInput, { target: { value: 'mishra@manaforge.gg' } });
    expect(screen.getByDisplayValue('mishra@manaforge.gg')).toBeInTheDocument();
  });
});
