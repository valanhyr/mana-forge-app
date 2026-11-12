import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FaqQuestion, FaqTopic } from '../../core/models/Faq';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';

interface FaqSectionProps {
  topics: FaqTopic[];
  title: string;
  topicsLabel: string;
}

interface FaqItemProps {
  item: FaqQuestion;
  open: boolean;
  onToggle: () => void;
}

const FaqItem = ({ item, open, onToggle }: FaqItemProps) => {
  const answerId = useId();

  return (
    <div className="border-b border-zinc-800">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={onToggle}
          className={`flex w-full items-center justify-between gap-4 py-5 text-left font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 ${open ? 'text-orange-400' : 'text-zinc-100 hover:text-orange-400'}`}
        >
          <span>{item.question}</span>
          <ChevronDown
            aria-hidden="true"
            size={20}
            className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>
      <div id={answerId} hidden={!open}>
        {open && (
          <p className="pb-5 whitespace-pre-line leading-relaxed text-zinc-400">{item.answer}</p>
        )}
      </div>
    </div>
  );
};

const FaqSection = ({ topics, title, topicsLabel }: FaqSectionProps) => {
  const headingId = useId();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<{ topic: string; question: string } | null>(
    null
  );
  const visibleTopics = topics.filter((topic) => topic.questions.length > 0);
  const activeTopic = visibleTopics.find((topic) => topic.id === selectedTopic) ?? visibleTopics[0];

  if (!activeTopic) return null;

  const renderQuestions = (topic: FaqTopic) =>
    topic.questions.map((item) => {
      const open = openQuestion?.topic === topic.id && openQuestion.question === item.id;
      return (
        <FaqItem
          key={item.id}
          item={item}
          open={open}
          onToggle={() => setOpenQuestion(open ? null : { topic: topic.id, question: item.id })}
        />
      );
    });

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-6 text-3xl font-bold text-white">
        {title}
      </h2>
      {visibleTopics.length === 1 ? (
        <div>{renderQuestions(activeTopic)}</div>
      ) : (
        <Tabs
          value={activeTopic.id}
          onValueChange={(value) => {
            setSelectedTopic(value);
            setOpenQuestion(null);
          }}
        >
          <TabsList variant="underline" aria-label={topicsLabel}>
            {visibleTopics.map((topic) => (
              <TabsTrigger key={topic.id} value={topic.id} variant="underline">
                {topic.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {visibleTopics.map((topic) => (
            <TabsContent key={topic.id} value={topic.id}>
              {renderQuestions(topic)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
};

export default FaqSection;
