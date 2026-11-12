import { useState } from 'react';

export const useImagePicker = (
  onChoose: (target: { id: string; board: string } | null, printId: string, imageUrl: string) => void
) => {
  const [target, setTarget] = useState<{ id: string; board: string } | null>(null);

  return {
    target,
    isOpen: target !== null,
    open: (cardId: string, board: string) => setTarget({ id: cardId, board }),
    close: () => setTarget(null),
    select: (printId: string, imageUrl: string) => {
      onChoose(target, printId, imageUrl);
      setTarget(null);
    },
  };
};
