import { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Portal de toasts */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const STYLES: Record<ToastType, string> = {
  success: "bg-zinc-900 border-green-500/60 text-green-400",
  error:   "bg-zinc-900 border-red-500/60   text-red-400",
  info:    "bg-zinc-900 border-orange-500/60 text-orange-400",
};

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "i",
};

const ToastItem = ({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) => (
  <div
    className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl min-w-[260px] max-w-sm animate-slide-in ${STYLES[toast.type]}`}
    role="alert"
  >
    <span className="text-sm font-bold w-4 text-center shrink-0">{ICONS[toast.type]}</span>
    <p className="text-sm text-zinc-200 flex-1">{toast.message}</p>
    <button
      onClick={() => onDismiss(toast.id)}
      className="text-zinc-500 hover:text-white transition-colors shrink-0 text-xs"
      aria-label="Cerrar"
    >
      ✕
    </button>
  </div>
);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
