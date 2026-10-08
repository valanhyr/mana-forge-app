import { EmailTemplate } from '../../../core/domain/email';

export const seedTemplates: EmailTemplate[] = [
  {
    id: 'tpl-quota-reset',
    title: 'AI Quota Reset Notification',
    category: 'SUPPORT',
    subject: 'Your AI Quota on Mana Forge has been reset',
    bodyTemplate: 'Hello {{user.name}},\n\nYour monthly AI query limit has been refreshed. You can now continue analyzing your decks.\n\nBest regards,\nThe Mana Forge Team',
    availableMacros: ['user.name'],
  },
  {
    id: 'tpl-format-legality',
    title: 'Format Legality Clarification',
    category: 'SUPPORT',
    subject: 'Format Legality Inquiry: {{deck.title}}',
    bodyTemplate: 'Hi {{user.name}},\n\nRegarding your deck {{deck.title}}, the cards flagged have been verified against the official {{format}} banned and restricted list.\n\nFeel free to reply if you need further details.\n\nBest,\nThe Mana Forge Team',
    availableMacros: ['user.name', 'deck.title', 'format'],
  },
  {
    id: 'tpl-welcome-onboarding',
    title: 'Welcome to Mana Forge Frontdesk',
    category: 'ONBOARDING',
    subject: 'Welcome to Mana Forge, {{user.name}}!',
    bodyTemplate: 'Hello {{user.name}},\n\nWelcome to Mana Forge! We are thrilled to have you optimize and build decks with our engine.\n\nHappy brewing,\nThe Mana Forge Team',
    availableMacros: ['user.name'],
  },
  {
    id: 'tpl-ticket-resolved',
    title: 'Support Ticket Resolved',
    category: 'SUPPORT',
    subject: 'Ticket #{{ticket.id}} has been resolved',
    bodyTemplate: 'Hello {{user.name}},\n\nYour support ticket #{{ticket.id}} regarding "{{ticket.subject}}" has been marked as resolved.\n\nIf you have any further questions, simply reply to this email.\n\nBest regards,\nThe Mana Forge Team',
    availableMacros: ['user.name', 'ticket.id', 'ticket.subject'],
  },
];
