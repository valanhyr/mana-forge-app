import { describe, it, expect } from 'vitest';
import { interpolateTemplate } from './email';

it('does not interpolate inherited object properties as template values', () => {
  expect(interpolateTemplate('{{constructor}} {{__proto__}}', {})).toBe('{{constructor}} {{__proto__}}');
});

describe('interpolateTemplate', () => {
  it('should replace dynamic placeholders with variable values', () => {
    const template = 'Hello {{user.name}}, your deck {{deck.title}} has been reviewed.';
    const variables = { 'user.name': 'Urza', 'deck.title': 'Mono Blue Control' };
    const result = interpolateTemplate(template, variables);
    expect(result).toBe('Hello Urza, your deck Mono Blue Control has been reviewed.');
  });

  it('should retain unknown placeholders unchanged', () => {
    const template = 'Ticket {{ticket.id}} status: {{unknown.field}}';
    const variables = { 'ticket.id': 'TCK-101' };
    const result = interpolateTemplate(template, variables);
    expect(result).toBe('Ticket TCK-101 status: {{unknown.field}}');
  });
});
