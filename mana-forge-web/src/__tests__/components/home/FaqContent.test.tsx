import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FaqSection from '../../../components/home/FaqSection';
import { FaqService } from '../../../services/FaqService';

describe('FAQ content', () => {
  it('provides translated FAQs covering the actual product workflows', () => {
    const spanish = FaqService.getTopics('es');
    const english = FaqService.getTopics('en');
    expect(spanish.map((topic) => topic.id)).toEqual([
      'general',
      'deck-analysis',
      'decks',
      'account-community',
    ]);
    expect(spanish.flatMap((topic) => topic.questions).map((question) => question.id)).toEqual(
      expect.arrayContaining([
        'what-can-i-do',
        'need-account',
        'try-analysis',
        'list-format',
        'analysis-limits',
        'analysis-results',
        'create-save',
        'import-list',
        'save-validation',
        'explore-clone',
        'create-account',
        'friends-messages',
        'contact-support',
      ])
    );
    expect(english.map((topic) => topic.id)).toEqual(spanish.map((topic) => topic.id));

    for (const [index, topic] of spanish.entries()) {
      expect(topic.title.trim()).not.toBe('');
      expect(english[index].title.trim()).not.toBe('');
      expect(topic.questions.length).toBeGreaterThan(0);
      expect(new Set(topic.questions.map((question) => question.id)).size).toBe(
        topic.questions.length
      );
      expect(english[index].questions.map((question) => question.id)).toEqual(
        topic.questions.map((question) => question.id)
      );
      for (const question of [...topic.questions, ...english[index].questions]) {
        expect(question.question.trim()).not.toBe('');
        expect(question.answer.trim()).not.toBe('');
      }
    }
  });

  it('displays and opens localized FAQs in every topic', async () => {
    const user = userEvent.setup();
    const spanish = FaqService.getTopics('es');
    const english = FaqService.getTopics('en');
    expect(spanish.length).toBeGreaterThan(0);
    expect(english.length).toBeGreaterThan(0);
    const { rerender } = render(
      <FaqSection topics={spanish} title="Preguntas frecuentes" topicsLabel="Temas" />
    );

    expect(screen.getByRole('tablist', { name: 'Temas' })).toBeInTheDocument();
    for (const topic of spanish) {
      await user.click(screen.getByRole('tab', { name: topic.title }));
      const question = screen.getByRole('button', { name: topic.questions[0].question });
      await user.click(question);
      expect(screen.getByText(topic.questions[0].answer)).toBeVisible();
    }

    rerender(<FaqSection topics={english} title="FAQ" topicsLabel="Topics" />);
    for (const topic of english) {
      await user.click(screen.getByRole('tab', { name: topic.title }));
      await user.click(screen.getByRole('button', { name: topic.questions[0].question }));
      expect(screen.getByText(topic.questions[0].answer)).toBeVisible();
    }
  });
});
