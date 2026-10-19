import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FlaskConical } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onAccept: () => void;
}

const BetaWelcomeModal = ({ isOpen, onAccept }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await api.patch('/users/me', { betaAccepted: true });
    } catch {
      // non-blocking — beta acceptance is best-effort
    } finally {
      setIsLoading(false);
      navigate('/profile', { replace: true });
      onAccept();
    }
  };

  return (
    <Dialog.Root open={isOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[301] -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-800 rounded-2xl w-[calc(100%-2rem)] max-w-md shadow-2xl p-8 flex flex-col items-center text-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <FlaskConical size={32} className="text-orange-500" aria-hidden="true" />
          </div>
          <Dialog.Title className="text-2xl font-bold text-white">
            {t('beta.welcomeTitle')}
          </Dialog.Title>
          <Dialog.Description className="text-zinc-400 text-sm leading-relaxed">
            {t('beta.welcomeBody')}
          </Dialog.Description>
          <p className="text-xs text-zinc-500 leading-relaxed">{t('beta.infoBody')}</p>
          <button
            onClick={handleAccept}
            disabled={isLoading}
            className="mt-2 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all"
          >
            {t('beta.welcomeAccept')}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BetaWelcomeModal;
