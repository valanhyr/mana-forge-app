import React from 'react';

type Props = {
  open: boolean;
  message?: string;
};

const LoadingOverlay: React.FC<Props> = ({ open, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center gap-4">
        <svg className="animate-spin h-10 w-10 text-orange-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div className="text-white text-sm">{message || 'Cargando...'}</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
