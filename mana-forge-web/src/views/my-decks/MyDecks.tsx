import { useEffect } from "react";
import { useUser } from "../../services/UserContext";
import DeckTable from "../../components/ui/DeckTable";
import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../../hooks/useTranslation";

const MyDecks = () => {
  const navigate = useNavigate();
  const { decks, loadDecks } = useUser();
  const { t } = useTranslation();

  useEffect(() => {
    // Cargar mazos al entrar en la vista (usa caché si ya existen)
    loadDecks();
  }, [loadDecks]);

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">{t("myDecks.title")}</h2>
        <Link
          to="/deck-builder"
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg shadow-orange-900/20"
        >
          <Plus size={20} /> {t("myDecks.createNew")}
        </Link>
      </div>

      <DeckTable
        decks={decks}
        onEdit={(id) => navigate(`/deck-builder/${id}`)}
      />
    </div>
  );
};

export default MyDecks;
