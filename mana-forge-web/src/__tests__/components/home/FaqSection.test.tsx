import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FaqSection from '../../../components/home/FaqSection';
import type { FaqTopic } from '../../../core/models/Faq';

const first: FaqTopic = {
  id: 'one',
  title: 'Topic one',
  questions: [{ id: 'question', question: 'Question one', answer: 'Answer one' }],
};
const second: FaqTopic = {
  id: 'two',
  title: 'Topic two',
  questions: [{ id: 'question', question: 'Question two', answer: 'Answer two' }],
};
const empty: FaqTopic = { id: 'empty', title: 'Empty topic', questions: [] };

describe('FaqSection', () => {
  it('renders nothing for empty data, including topics without questions', () => {
    const { container } = render(<FaqSection topics={[empty]} title="FAQ" topicsLabel="Topics" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a single nonempty topic without tabs and links each button to its answer', async () => {
    const user = userEvent.setup();
    render(<FaqSection topics={[empty, first]} title="FAQ" topicsLabel="Topics" />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    const question = screen.getByRole('button', { name: 'Question one' });
    expect(question.className).toContain('focus-visible:ring');
    const answer = document.getElementById(question.getAttribute('aria-controls')!);
    expect(answer).toHaveAttribute('hidden');
    question.focus();
    await user.keyboard(' ');
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(answer).toHaveTextContent('Answer one');
    expect(answer).toBeVisible();
  });

  it('uses the first available topic if the selected topic is removed', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FaqSection topics={[first, second]} title="FAQ" topicsLabel="Topics" />
    );
    await user.click(screen.getByRole('tab', { name: 'Topic two' }));
    await user.click(screen.getByRole('button', { name: 'Question two' }));
    rerender(<FaqSection topics={[first]} title="FAQ" topicsLabel="Topics" />);
    expect(screen.getByRole('button', { name: 'Question one' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByText('Answer two')).not.toBeInTheDocument();
  });

  it('reports openings, not closing or changing tabs, using stable codes', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<FaqSection topics={[first, second]} title="FAQ" topicsLabel="Topics" onOpen={onOpen} />);

    const firstQuestion = screen.getByRole('button', { name: 'Question one' });
    await user.click(firstQuestion);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('one', 'question');
    await user.click(firstQuestion);
    await user.click(screen.getByRole('tab', { name: 'Topic two' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    screen.getByRole('button', { name: 'Question two' }).focus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenLastCalledWith('two', 'question');
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
