import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Ban,
  Layers,
  Users,
  ArrowRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import ForgeSpinner from '../../components/ui/ForgeSpinner';
import SEO from '../../components/ui/SEO';
import Modal from '../../components/ui/Modal';
import { FormatService } from '../../services/FormatService';
import { CardService } from '../../services/CardService';

// --- CMS Data Structure ---
interface FormatRule {
  id: number;
  text: string;
}

interface FormatSection {
  name: string;
  title: string;
  description: string;
  rules: FormatRule[];
}

interface FormatCMSData {
  slug: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  description: FormatSection;
  rules: FormatSection;
  metadata?: {
    minDeckSize: number;
    maxDeckSize?: number;
    maxCopies: number;
    sideboardSize: number;
  };
}

interface FormatSummary {
  mongoId: string;
  slug: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

const FormatDetail = () => {
  const { t } = useTranslation();
  const { formatName } = useParams<{ formatName: string }>();
  const [data, setData] = useState<FormatCMSData | null>(null);
  const [allFormats, setAllFormats] = useState<FormatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBanlistModalOpen, setIsBanlistModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bannedCards, setBannedCards] = useState<any[]>([]);
  const [loadingBanlist, setLoadingBanlist] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleViewBanlist = async () => {
    setIsBanlistModalOpen(true);
    if (data?.slug && bannedCards.length === 0) {
      setLoadingBanlist(true);
      try {
        const response = await CardService.getBannedcards(data.slug);

        // Manejar si el servicio devuelve Response (fetch) o ya el JSON parseado directamente
        let result = response;
        if (response && typeof response.json === 'function') {
          if (!response.ok) throw new Error('Failed to fetch banlist');
          result = await response.json();
        }

        if (Array.isArray(result)) {
          setBannedCards(result);
        } else {
          setBannedCards(result?.data || result?.cards || []);
        }
      } catch (error) {
        console.error('Error fetching banlist:', error);
      } finally {
        setLoadingBanlist(false);
      }
    }
  };

  const isAllFormats = !formatName || formatName === 'all-formats';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Siempre obtenemos todos los formatos primero para resolver el slug
        const allFormatsResult = await FormatService.getCMSAllFormats();
        let formatsList: FormatSummary[] = [];

        if (Array.isArray(allFormatsResult)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatsList = allFormatsResult as any;
          setAllFormats(formatsList);
        }

        if (isAllFormats) {
          setData(null);
        } else if (formatName) {
          // 2. Buscamos el formato por slug (o mongoId por si acaso) en la lista cargada
          const formatSummary = formatsList.find(
            (f) => f.slug === formatName || f.mongoId === formatName
          );

          if (formatSummary) {
            // 3. Usamos el mongoId para obtener el detalle
            const result = await FormatService.getCMSFormatDetail(formatSummary.mongoId);
            if (result) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setData(result as any);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching format data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formatName, isAllFormats]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <ForgeSpinner className="text-orange-500" size={128} />
      </div>
    );
  }

  if (isAllFormats) {
    return (
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-orange-600 p-2 rounded-lg">
            <Users className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-white">{t('dashboard.exploreFormats')}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allFormats.map((format) => (
            <Link
              to={`/formats/${format.slug}`}
              key={format.mongoId}
              className="group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/50 hover:bg-zinc-800/50 transition-all flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-700 group-hover:border-orange-500/30 transition-colors">
                  <Layers size={24} className="text-orange-500" />
                </div>
                <ArrowRight
                  className="text-zinc-600 group-hover:text-orange-500 transition-colors"
                  size={20}
                />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                {format.title}
              </h3>
              <p className="text-sm text-zinc-400 mb-6 grow leading-relaxed line-clamp-3">
                {format.subtitle}
              </p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center px-4">
        <h2 className="text-3xl font-bold text-white mb-4">{t('formatDetail.notFoundTitle')}</h2>
        <p className="text-zinc-400 mb-8">
          {t('formatDetail.notFoundDescription', {
            formatName: formatName || '',
          })}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
        >
          <ArrowLeft size={20} /> {t('formatDetail.backToHome')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <SEO
        title={data.title}
        description={data.subtitle || data.description?.description}
        ogImage={data.imageUrl}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Thing',
          name: data.title,
          description: data.description?.description,
          image: data.imageUrl,
        }}
      />
      {/* Hero Header */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src={data.imageUrl} alt={data.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-zinc-300 hover:text-white mb-6 transition-colors bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 w-fit"
          >
            <ArrowLeft size={16} /> {t('common.back')}
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight">
            {data.title}
          </h1>
          <p className="text-xl text-orange-400 font-medium max-w-2xl">{data.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {data.description && (
              <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="text-orange-500" size={24} />
                  <h2 className="text-2xl font-bold text-white">
                    {data.description.title || t('common.description')}
                  </h2>
                </div>
                <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed">
                  <p>{data.description.description}</p>
                </div>
              </div>
            )}

            {/* Rules */}
            {data.rules && (
              <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Layers className="text-indigo-500" size={24} />
                  <h2 className="text-2xl font-bold text-white">
                    {data.rules.title || t('formatDetail.mainRules')}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {data.rules.rules?.map((rule, index) => (
                    <li key={rule.id || index} className="flex items-start gap-3 text-zinc-300">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                      <span>{rule.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats / Metadata */}
            {data.metadata && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-zinc-800 pb-2">
                  {t('formatDetail.deckStructure')}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">{t('common.mainDeck')}</span>
                    <span className="text-white font-mono font-bold">
                      {data.metadata.minDeckSize}+
                    </span>
                  </div>
                  {data.metadata.sideboardSize > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">{t('common.sideboard')}</span>
                      <span className="text-white font-mono font-bold">
                        {t('formatDetail.upTo', {
                          count: data.metadata.sideboardSize,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">{t('formatDetail.maxCopies')}</span>
                    <span className="text-white font-mono font-bold">
                      {data.metadata.maxCopies}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Banlist Link (Mock) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Ban className="text-red-500" size={20} />
                <h3 className="text-lg font-bold text-white">{t('formatDetail.bannedCards')}</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-4">
                {t('formatDetail.bannedCardsDescription', {
                  formatTitle: data.title,
                })}
              </p>
              <button
                onClick={handleViewBanlist}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm font-medium border border-zinc-700"
              >
                {t('formatDetail.viewBanlist')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isBanlistModalOpen}
        onClose={() => setIsBanlistModalOpen(false)}
        title={t('formatDetail.bannedCards')}
        maxWidth="max-w-6xl"
      >
        {loadingBanlist ? (
          <div className="flex justify-center p-8">
            <ForgeSpinner size={64} className="text-orange-500" />
          </div>
        ) : (
          <>
            {bannedCards.length > 0 && (
              <div className="flex justify-end px-4 mb-4">
                <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <LayoutGrid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            )}

            {bannedCards.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-h-[70vh] overflow-y-auto p-2">
                  {bannedCards.map((card, idx: number) => (
                    <div key={idx} className="flex flex-col items-center group">
                      <div className="relative rounded-lg overflow-hidden aspect-[2.5/3.5] w-full mb-2 bg-zinc-800">
                        {card.image_uris?.normal ? (
                          <img
                            src={card.image_uris.normal}
                            alt={card.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-500 text-xs p-2 text-center">
                            {card.name}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-center text-zinc-300 font-medium leading-tight">
                        {card.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto p-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {bannedCards.map((card, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                      >
                        <span className="text-zinc-300 font-medium">{card.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="col-span-full text-center text-zinc-400 py-8">
                <p className="mb-4">
                  {t('common.info')}: Banlist visual not available for this format yet.
                </p>
                <a
                  href="https://magic.wizards.com/en/banned-restricted-list"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline"
                >
                  Visit Official Banlist
                </a>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default FormatDetail;
