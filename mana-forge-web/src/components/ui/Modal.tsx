import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  fullScreenMobile?: boolean;
  className?: string;
  closeLabel?: string;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  fullScreenMobile = false,
  className = '',
  closeLabel = 'Close',
}: ModalProps) => (
  <Dialog.Root open={isOpen} onOpenChange={open => !open && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
      <Dialog.Content
        aria-describedby={undefined}
        className={`fixed z-[101] bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col p-6 ${
          fullScreenMobile
            ? 'inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-full'
            : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full rounded-2xl'
        } ${maxWidth} ${className}`}
      >
        <Dialog.Title className="text-lg font-bold text-white pr-8">{title}</Dialog.Title>
        <Dialog.Close
          aria-label={closeLabel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg"
        >
          <X size={20} aria-hidden="true" />
        </Dialog.Close>
        <div className="mt-4 flex-1 overflow-y-auto max-h-[80vh]">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default Modal;
