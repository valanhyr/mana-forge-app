export interface FaqQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface FaqTopic {
  id: string;
  title: string;
  questions: FaqQuestion[];
}
