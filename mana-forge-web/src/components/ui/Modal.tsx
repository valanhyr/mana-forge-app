import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  fullScreenMobile?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  fullScreenMobile = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex bg-black/70 backdrop-blur-sm
        ${fullScreenMobile ? 'p-0 items-stretch sm:p-4 sm:items-center sm:justify-center' : 'p-4 items-center justify-center'}`}
    >
      <div
        className={`bg-zinc-900 border border-zinc-800 shadow-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200
          ${fullScreenMobile
            ? `rounded-none flex flex-col h-full sm:rounded-2xl sm:h-auto ${maxWidth}`
            : `rounded-2xl ${maxWidth}`}`}
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <div className={`p-6 ${fullScreenMobile ? 'flex-1 overflow-y-auto' : ''}`}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
