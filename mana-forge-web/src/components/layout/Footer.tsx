import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sword, Github, Twitter, Linkedin, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

type AccordionSection = 'product' | 'resources' | 'legal';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [openSection, setOpenSection] = useState<AccordionSection | null>(null);

  const toggle = (section: AccordionSection) =>
    setOpenSection((prev) => (prev === section ? null : section));

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-auto">
      <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Description */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 group mb-4">
              <div className="bg-orange-600 p-1.5 rounded-lg group-hover:bg-orange-500 transition-colors">
                <Sword className="text-white" size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter text-white">
                MANA<span className="text-orange-500">FORGE</span>
              </span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed">{t('footer.description')}</p>
          </div>

          {/* Product Links */}
          <div className="border-t border-zinc-800 md:border-none">
            <button
              className="flex w-full items-center justify-between py-3 md:py-0 md:cursor-default text-white font-bold"
              onClick={() => toggle('product')}
              aria-expanded={openSection === 'product'}
            >
              {t('footer.product')}
              <ChevronDown
                size={18}
                className={`md:hidden transition-transform duration-200 ${openSection === 'product' ? 'rotate-180' : ''}`}
              />
            </button>
            <ul
              className={`space-y-2 text-sm text-zinc-400 overflow-hidden transition-all duration-300 md:!max-h-none md:!opacity-100 md:mb-0 ${
                openSection === 'product'
                  ? 'max-h-40 opacity-100 mb-3'
                  : 'max-h-0 opacity-0 md:max-h-none'
              }`}
            >
              <li>
                <Link to="/explorer" className="hover:text-orange-500 transition-colors">
                  {t('nav.explorer')}
                </Link>
              </li>
              <li>
                <Link to="/formats/all-formats" className="hover:text-orange-500 transition-colors">
                  {t('dashboard.exploreFormats')}
                </Link>
              </li>
              <li>
                <Link to="/?daily-deck=true" className="hover:text-orange-500 transition-colors">
                  {t('dashboard.aiDeckOfTheDay')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="border-t border-zinc-800 md:border-none">
            <button
              className="flex w-full items-center justify-between py-3 md:py-0 md:cursor-default text-white font-bold"
              onClick={() => toggle('resources')}
              aria-expanded={openSection === 'resources'}
            >
              {t('footer.resources')}
              <ChevronDown
                size={18}
                className={`md:hidden transition-transform duration-200 ${openSection === 'resources' ? 'rotate-180' : ''}`}
              />
            </button>
            <ul
              className={`space-y-2 text-sm text-zinc-400 overflow-hidden transition-all duration-300 md:!max-h-none md:!opacity-100 md:mb-0 ${
                openSection === 'resources'
                  ? 'max-h-40 opacity-100 mb-3'
                  : 'max-h-0 opacity-0 md:max-h-none'
              }`}
            >
              <li>
                <a
                  href="https://scryfall.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t('footer.scryfall')}
                </a>
              </li>
              <li>
                <a
                  href="https://www.moxfield.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t('footer.moxfield')}
                </a>
              </li>
              <li>
                <a
                  href="https://magic.wizards.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t('footer.magicOfficial')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="border-t border-zinc-800 md:border-none">
            <button
              className="flex w-full items-center justify-between py-3 md:py-0 md:cursor-default text-white font-bold"
              onClick={() => toggle('legal')}
              aria-expanded={openSection === 'legal'}
            >
              {t('footer.legal')}
              <ChevronDown
                size={18}
                className={`md:hidden transition-transform duration-200 ${openSection === 'legal' ? 'rotate-180' : ''}`}
              />
            </button>
            <ul
              className={`space-y-2 text-sm text-zinc-400 overflow-hidden transition-all duration-300 md:!max-h-none md:!opacity-100 md:mb-0 ${
                openSection === 'legal'
                  ? 'max-h-40 opacity-100 mb-3'
                  : 'max-h-0 opacity-0 md:max-h-none'
              }`}
            >
              <li>
                <Link
                  to="/legal/privacy-policy"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/terms-and-conditions"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/legal/cookie-policy" className="hover:text-orange-500 transition-colors">
                  {t('footer.cookies')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="border-t border-zinc-800 pt-6 mb-6">
          <p className="text-zinc-600 text-xs leading-relaxed">
            {t('footer.legalDisclaimer').replace('{year}', String(currentYear))}{' '}
            <a
              href="https://company.wizards.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-400 underline transition-colors"
            >
              company.wizards.com
            </a>
            .
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-center items-center gap-6">
          <p className="text-zinc-600 text-sm">
            © {currentYear} ManaForge. {t('footer.rightsReserved')}
          </p>
          {/* <p className="text-zinc-600 text-sm">
            {t("footer.builtBy")}
            <a
              href="https://sputnikdigitals.com"
              target="_blank"
              className="text-orange-500 hover:text-orange-400 transition-colors"
            >
              Sputnik Digitals
            </a>
          </p> */}
          <div className="flex gap-4 text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">
              <Github size={20} />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Linkedin size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
