import { Link } from "react-router-dom";
import { Sword, Github, Twitter, Linkedin } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12">
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
            <p className="text-zinc-500 text-sm leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-bold mb-4">{t("footer.product")}</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link
                  to="/deck-builder"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t("deckBuilder.title")}
                </Link>
              </li>
              <li>
                <Link
                  to="/my-decks"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t("myDecks.title")}
                </Link>
              </li>
              <li>
                <Link
                  to="/formats"
                  className="hover:text-orange-500 transition-colors"
                >
                  {t("dashboard.exploreFormats")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links (Mocks) */}
          <div>
            <h4 className="text-white font-bold mb-4">
              {t("footer.resources")}
            </h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  {t("footer.documentation")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  {t("footer.api")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  {t("footer.status")}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links (Mocks) */}
          <div>
            <h4 className="text-white font-bold mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  {t("footer.privacy")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  {t("footer.terms")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-500 transition-colors">
                  {t("footer.cookies")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-sm">
            © {currentYear} ManaForge. {t("footer.rightsReserved")}
          </p>
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
