import { useEffect } from "react";
import { useUser } from "../../services/UserContext";
import DeckTable from "../../components/ui/DeckTable";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

const MyDecks = () => {
  const { decks, loadDecks } = useUser();

  useEffect(() => {
    // Cargar mazos al entrar en la vista (usa caché si ya existen)
    loadDecks();
  }, [loadDecks]);

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Mis Mazos</h2>
        <Link
          to="/"
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg shadow-orange-900/20"
        >
          <Plus size={20} /> Nuevo Mazo
        </Link>
      </div>

      <DeckTable decks={decks} />
    </div>
  );
};

export default MyDecks;
