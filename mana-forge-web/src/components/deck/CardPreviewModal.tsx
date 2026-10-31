import { Loader2, X } from 'lucide-react';

interface CardPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string | null;
  cardName: string | null;
  isFetching: boolean;
  onAdd: (cardName: string, board: 'main' | 'side' | 'maybe') => void;
}

const CardPreviewModal = ({
  isOpen,
  onClose,
  image,
  cardName,
  isFetching,
  onAdd,
}: CardPreviewModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-sm w-full animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
        >
          <X size={24} />
        </button>
        <div className="relative w-full">
          {image ? (
            <img src={image} alt="Card preview" className="w-full rounded-3xl shadow-2xl" />
          ) : (
            <div className="w-full aspect-[2.5/3.5] rounded-3xl bg-zinc-900 flex items-center justify-center">
              <Loader2 size={64} className="animate-spin text-orange-500" />
            </div>
          )}

          {isFetching && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 rounded-3xl w-full h-full flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white" />
              </div>
            </div>
          )}
        </div>
        {cardName && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={() => onAdd(cardName, 'main')}
              className="py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-lg"
            >
              + Main
            </button>
            <button
              onClick={() => onAdd(cardName, 'side')}
              className="py-2 text-xs font-bold rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
            >
              + Side
            </button>
            <button
              onClick={() => onAdd(cardName, 'maybe')}
              className="py-2 text-xs font-bold rounded-xl bg-zinc-700 hover:bg-zinc-600 text-yellow-400 transition-colors"
            >
              + Maybe
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPreviewModal;
