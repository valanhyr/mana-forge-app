import { Link } from 'react-router-dom';
import { Sword, Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      {/* Número 404 decorativo */}
      <div className="relative mb-8 select-none">
        <span className="text-[10rem] font-black text-zinc-800 leading-none">404</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-orange-600/10 border border-orange-600/20 rounded-2xl p-4">
            <Sword size={48} className="text-orange-500" />
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">{t('notFound.title')}</h1>
      <p className="text-zinc-400 max-w-sm mb-10">{t('notFound.description')}</p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95"
        >
          <Home size={18} />
          {t('notFound.goHome')}
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-xl transition-all"
        >
          <ArrowLeft size={18} />
          {t('notFound.goBack')}
        </button>
      </div>
    </div>
  );
}
