import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { useTranslation } from '../../hooks/useTranslation';
import { CardService } from '../../services/CardService';

interface PrintItem {
  printId: string;
  setName: string;
  images: { small?: string; normal?: string; large?: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cardId: string; // scryfall id
  oracleId?: string;
  onSelect: (printId: string, imageUrl: string) => void;
}

const ImagePickerModal: React.FC<Props> = ({ isOpen, onClose, cardId, oracleId, onSelect }) => {
  const { t } = useTranslation();
  const [prints, setPrints] = useState<PrintItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PrintItem | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // avoid calling setState synchronously inside effect to prevent cascading renders
    setTimeout(() => {
      setLoading(true);
      setPrints([]);
      setSelected(null);
    }, 0);

    CardService.getPrintsByOracleId(cardId, oracleId)
      .then((data) => {
        setPrints(data.prints || []);
      })
      .catch((err) => console.error('Error fetching prints', err))
      .finally(() => setLoading(false));
  }, [isOpen, cardId, oracleId]);

  const handleAccept = () => {
    if (!selected) return;
    const image = selected.images.normal || selected.images.large || selected.images.small || '';
    onSelect(selected.printId, image);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('deck.editor.chooseImage') || 'Choose image'} maxWidth="max-w-none" fullScreenMobile={true} className="w-[90vw] h-[90vh] max-w-none">
      <div className="p-6">
        {loading && <div className="text-sm text-zinc-400">{t('common.loading') || 'Loading...'}</div>}
        {!loading && prints.length === 0 && (
          <div className="text-sm text-zinc-400">{t('deck.editor.noImages') || 'No images found'}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 mt-3">
          {prints.map((p) => {
            const img = p.images.normal || p.images.large || p.images.small || '';
            return (
              <button
                key={p.printId}
                onClick={() => setSelected(p)}
                              className={`rounded-lg overflow-hidden border ${selected?.printId === p.printId ? 'border-orange-500' : 'border-zinc-700'} p-0 bg-zinc-900 min-h-[20rem] flex flex-col`}
              >
                              <div className="flex-1 bg-zinc-800 flex items-center justify-center overflow-hidden rounded-t-lg">
                                <img src={img} alt={p.setName} className="w-full h-[18rem] object-contain rounded-t-lg" />
                              </div>
                              <div className="text-xs text-zinc-300 p-2 text-center">{p.setName}</div>
                            </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300">
            {t('common.cancel')}
          </button>
          <button
            onClick={handleAccept}
            disabled={!selected}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white disabled:opacity-50"
          >
            {t('common.accept')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImagePickerModal;
