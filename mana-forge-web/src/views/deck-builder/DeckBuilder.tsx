import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DropdownInput from "../../components/ui/DropdownInput";
import SearchInput from "../../components/ui/SearchInput";
import DeckList, { type DeckCard } from "../../components/ui/DeckList";
import DeckStats from "../../components/ui/DeckStats";
import {
  Shield,
  ShieldAlert,
  Settings,
  Upload,
  AlertCircle,
  X,
  Save,
  Brain,
} from "lucide-react";
import { type Format } from "../../core/models/Format";
import { FormatService } from "../../services/FormatService";
import { CardService } from "../../services/CardService";
import { DeckService } from "../../services/DeckService";
import Modal from "../../components/ui/Modal";
import TextAreaInput from "../../components/ui/TextAreaInput";
import { useUser } from "../../services/UserContext";
import { useTranslation } from "../../hooks/useTranslation";

// Extendemos DeckCard localmente para incluir la imagen hasta que se actualice la definición base
type DeckCardWithImage = DeckCard & { image: string };

// Mock de base de datos de arquetipos (esto debería venir de tu API/DB en el futuro)
const ARCHETYPES_DB: Record<string, string[]> = {
  premodern: [
    "Burn",
    "Stiflenought",
    "Goblins",
    "Oath",
    "Parallax Replenish",
    "Enchantress",
    "Elves",
    "Devourer Combo",
    "Landstill",
    "Tide Control",
    "Madness",
    "Survival",
    "Terrageddon",
    "Stasis",
    "Reanimator",
  ],
  legacy: [
    "Izzet Delver",
    "Reanimator",
    "Red Prison",
    "Lands",
    "Doomsday",
    "Death and Taxes",
    "Sneak and Show",
    "Storm",
    "Control",
    "Elves",
  ],
  // Añadir otros formatos según sea necesario
};

const DeckBuilder = () => {
  const { user } = useUser();
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { deckId } = useParams();
  const [deckName, setDeckName] = useState("");
  const [selectedFormatId, setSelectedFormatId] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [formats, setFormats] = useState<Format[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [deckCards, setDeckCards] = useState<DeckCardWithImage[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const [analysisArchetypes, setAnalysisArchetypes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Carga de formatos reales desde el servicio (con caché)
  useEffect(() => {
    const fetchFormats = async () => {
      const data = await FormatService.getActiveFormats();
      setFormats(data);
    };
    fetchFormats();
  }, []);

  // Cargar mazo si estamos en modo edición
  useEffect(() => {
    if (deckId && formats.length > 0) {
      const loadDeck = async () => {
        try {
          const deck = await DeckService.getDeckById(deckId);
          setDeckName(deck.name);
          setSelectedFormatId(deck.formatId);
          // Jackson serializa 'isPrivate' como 'private' por defecto
          setIsPrivate((deck as any).private ?? deck.isPrivate ?? false);

          const format = formats.find((f) => f.id === deck.formatId) || null;
          setSelectedFormat(format);

          // Hidratar cartas
          const cardsList = deck.cards || []; // Protección si cards es null
          const cardsPromises = cardsList.map(async (entry: any) => {
            try {
              const cardData = await CardService.getCardById(entry.scryfallId);

              let isValid = true;
              if (format) {
                const formatKey = format.scryfallKey;
                isValid =
                  cardData.legalities?.[formatKey] === "legal" ||
                  cardData.legalities?.[formatKey] === "restricted";
              }

              return {
                id: cardData.id,
                name: cardData.name,
                quantity: entry.quantity,
                manaCost: cardData.mana_cost,
                cmc: cardData.cmc,
                type: cardData.type_line?.split("—")[0]?.trim() || "Unknown",
                price: parseFloat(cardData.prices?.eur || "0"),
                inCollection: false,
                isValid: isValid,
                board: entry.board || "main", // Puede venir "commander" de la DB
                image:
                  cardData.image_uris?.normal ||
                  cardData.card_faces?.[0]?.image_uris?.normal ||
                  "",
              } as DeckCardWithImage;
            } catch (err) {
              console.error(`Error cargando carta ${entry.scryfallId}:`, err);
              return null; // Retornamos null para filtrar después
            }
          });

          const loadedCards = await Promise.all(cardsPromises);
          // Filtramos las cartas que fallaron (null)
          setDeckCards(
            loadedCards.filter((c) => c !== null) as DeckCardWithImage[]
          );
        } catch (error) {
          console.error("Error loading deck:", error);
        }
      };
      loadDeck();
    }
  }, [deckId, formats]);

  // Efecto para cargar arquetipos cuando cambia el formato
  useEffect(() => {
    if (selectedFormat) {
      // Intentamos buscar por clave de scryfall o nombre
      const key = (selectedFormat.scryfallKey || "").toLowerCase();
      // Buscamos si existe en nuestro mock DB
      const foundKey = Object.keys(ARCHETYPES_DB).find((k) => key.includes(k));

      setAnalysisArchetypes(foundKey ? ARCHETYPES_DB[foundKey] : []);
    }
  }, [selectedFormat]);

  const handleFormatChange = (formatId: string) => {
    setSelectedFormatId(formatId);
    // Guardamos el objeto formato completo para tener las restricciones disponibles
    const format = formats.find((f) => f.id === formatId) || null;
    setSelectedFormat(format);
  };

  const isCommanderFormat = useMemo(() => {
    if (!selectedFormat) return false;
    const key = (selectedFormat.scryfallKey || "").toLowerCase();
    return key === "commander" || key === "edh";
  }, [selectedFormat]);

  const formatOptions = formats.map((f) => ({
    value: f.id,
    label: f.name.es || f.name.en || f.scryfallKey,
  }));

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.length >= 3) {
      const results = await CardService.autocomplete(val);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const addCardsToDeck = (cardsToAdd: DeckCardWithImage[]) => {
    setDeckCards((currentDeck) => {
      const newDeck = [...currentDeck];
      cardsToAdd.forEach((newCard) => {
        const existingCardIndex = newDeck.findIndex(
          (c) => c.name === newCard.name && c.board === newCard.board
        );

        if (existingCardIndex > -1) {
          // Actualizamos creando un nuevo objeto para no mutar el estado
          newDeck[existingCardIndex] = {
            ...newDeck[existingCardIndex],
            quantity: newDeck[existingCardIndex].quantity + newCard.quantity,
          };
        } else {
          // Si no existe, la añadimos
          newDeck.push(newCard);
        }
      });
      return newDeck;
    });
  };

  const handleUpdateQuantity = (card: DeckCard, delta: number) => {
    setDeckCards((prev) => {
      return prev.map((c) => {
        if (c.id === card.id && c.board === card.board) {
          const newQuantity = Math.max(1, c.quantity + delta);
          return { ...c, quantity: newQuantity };
        }
        return c;
      });
    });
  };

  const handleMoveCard = (
    card: DeckCard,
    targetBoard: "main" | "side" | "commander"
  ) => {
    setDeckCards((prev) => {
      // 1. Eliminar la carta de su ubicación actual
      const deckWithoutCard = prev.filter(
        (c) => !(c.id === card.id && c.board === card.board)
      );

      // 2. Crear la carta con el nuevo board
      const movedCard: DeckCardWithImage = {
        ...(card as DeckCardWithImage),
        board: targetBoard,
      };

      // 3. Verificar si ya existe en el destino para fusionar
      const existingIndex = deckWithoutCard.findIndex(
        (c) => c.name === movedCard.name && c.board === movedCard.board
      );

      if (existingIndex > -1) {
        deckWithoutCard[existingIndex].quantity += movedCard.quantity;
        return [...deckWithoutCard];
      } else {
        return [...deckWithoutCard, movedCard];
      }
    });
  };

  const handleRemoveCard = (card: DeckCard) => {
    setDeckCards((prev) =>
      prev.filter((c) => !(c.id === card.id && c.board === card.board))
    );
  };

  const handleAddCard = async (cardName: string) => {
    // Limpiar búsqueda
    setSuggestions([]);
    setSearchQuery("");

    try {
      const cardData = await CardService.getCardByName(cardName);

      // Validar legalidad si hay un formato seleccionado
      let isValid = true;
      if (selectedFormat) {
        const formatKey = selectedFormat.scryfallKey;
        // Scryfall devuelve legalities: { standard: "legal", commander: "not_legal", ... }
        isValid =
          cardData.legalities?.[formatKey] === "legal" ||
          cardData.legalities?.[formatKey] === "restricted";
      }

      // Mapear respuesta de Scryfall a DeckCard
      const newCard: DeckCardWithImage = {
        id: cardData.id,
        name: cardData.name,
        quantity: 1,
        manaCost: cardData.mana_cost, // Nota: cartas de doble cara pueden requerir lógica extra aquí
        cmc: cardData.cmc,
        type: cardData.type_line?.split("—")[0]?.trim() || "Unknown",
        price: parseFloat(cardData.prices?.eur || "0"),
        inCollection: false,
        isValid: isValid,
        board: "main", // Por defecto al mazo principal
        image:
          cardData.image_uris?.normal ||
          cardData.card_faces?.[0]?.image_uris?.normal ||
          "",
      };

      addCardsToDeck([newCard]);
    } catch (error) {
      console.error("Error adding card:", error);
    }
  };

  const handleImportDeck = async () => {
    const lines = importText.split("\n").filter((line) => line.trim() !== "");
    const failedLines: string[] = [];
    const cardsToProcess: DeckCardWithImage[] = [];
    let isSideboardSection = false;

    setIsImportModalOpen(false);
    setImportText("");
    setImportErrors([]);

    for (const line of lines) {
      const trimmedLine = line.trim();
      // Detectar "Sideboard" o "Sideboard:" insensible a mayúsculas
      if (trimmedLine.toLowerCase().replace(":", "") === "sideboard") {
        isSideboardSection = true;
        continue;
      }

      const match = trimmedLine.match(/^(\d+)\s+(.+)$/);
      let quantity = 1;
      let cardName = trimmedLine;

      if (match) {
        quantity = parseInt(match[1], 10);
        cardName = match[2].trim();
      }

      try {
        const cardData = await CardService.getCardByName(cardName);

        let isValid = true;
        if (selectedFormat) {
          const formatKey = selectedFormat.scryfallKey;
          isValid =
            cardData.legalities?.[formatKey] === "legal" ||
            cardData.legalities?.[formatKey] === "restricted";
        }

        cardsToProcess.push({
          id: cardData.id,
          name: cardData.name,
          quantity: quantity,
          manaCost: cardData.mana_cost,
          cmc: cardData.cmc,
          type: cardData.type_line?.split("—")[0]?.trim() || "Unknown",
          price: parseFloat(cardData.prices?.eur || "0"),
          inCollection: false,
          isValid: isValid,
          board: isSideboardSection ? "side" : "main",
          image:
            cardData.image_uris?.normal ||
            cardData.card_faces?.[0]?.image_uris?.normal ||
            "",
        });
      } catch (error) {
        failedLines.push(line);
      }
    }

    if (cardsToProcess.length > 0) {
      addCardsToDeck(cardsToProcess);
    }
    setImportErrors(failedLines);
  };

  // Validación del mazo en tiempo real
  const isDeckValid = useMemo(() => {
    if (!deckName.trim() || !selectedFormat) return false;

    // Conteos por zona
    const mainDeckCount = deckCards
      .filter((c) => c.board === "main" || !c.board)
      .reduce((acc, c) => acc + c.quantity, 0);

    const sideboardCount = deckCards
      .filter((c) => c.board === "side")
      .reduce((acc, c) => acc + c.quantity, 0);

    const commanderCount = deckCards
      .filter((c) => c.board === "commander")
      .reduce((acc, c) => acc + c.quantity, 0);

    // Reglas específicas para Commander
    if (isCommanderFormat) {
      // Debe tener exactamente 100 cartas (Main + Commander)
      if (mainDeckCount + commanderCount !== 100) return false;
      // Debe tener al menos 1 comandante (y máximo 2 por Partner, aunque aquí simplificamos a >0)
      if (commanderCount < 1) return false;
      // No debe tener sideboard (aunque técnicamente es opcional en reglas caseras, en estricto es 0)
      if (sideboardCount > 0) return false;
    } else {
      // Reglas estándar
      // 1. Validar tamaño del Main Deck
      if (mainDeckCount < (selectedFormat.config as any).minDeckSize)
        return false;

      // Validar tamaño máximo si existe
      if (
        (selectedFormat.config as any).maxDeckSize &&
        mainDeckCount > (selectedFormat.config as any).maxDeckSize
      )
        return false;

      // 2. Validar tamaño del Sideboard
      if (sideboardCount > (selectedFormat.config as any).maxSideboard)
        return false;
    }

    // 3. Validar legalidad de las cartas
    if (deckCards.some((c) => c.isValid === false)) return false;

    // 4. Validar límite de copias (excluyendo tierras básicas)
    const cardCounts: Record<string, number> = {};
    for (const c of deckCards) {
      // Las tierras básicas suelen tener el tipo "Basic Land" o similar
      if (!c.type.includes("Basic")) {
        cardCounts[c.name] = (cardCounts[c.name] || 0) + c.quantity;
      }
    }

    for (const count of Object.values(cardCounts)) {
      if (count > selectedFormat.config.maxCopies) return false;
    }

    return true;
  }, [deckName, selectedFormat, deckCards, isCommanderFormat]);

  const handleSaveDeck = async () => {
    if (!isDeckValid || !user || !selectedFormat) return;

    const payload = {
      name: deckName,
      formatId: selectedFormat.id,
      userId: user.userId,
      isPrivate: isPrivate,
      cards: deckCards.map((card) => ({
        id: card.id, // Este es el scryfallId
        quantity: card.quantity,
        board: (card.board || "main") as any,
      })),
    };

    try {
      if (deckId) {
        await DeckService.updateDeck(deckId, payload);
        console.log("Mazo actualizado con éxito");
      } else {
        const savedDeck = await DeckService.saveDeck(payload);
        console.log("Mazo guardado con éxito:", savedDeck);
      }
      // TODO: Añadir una notificación de éxito
      navigate("/my-decks"); // Redirigir a la lista de mazos
    } catch (error) {
      console.error("Error al guardar el mazo:", error);
      // TODO: Añadir una notificación de error
    }
  };

  const handleAnalyzeDeck = async () => {
    if (!isDeckValid || !selectedFormat) return;
    setIsAnalyzing(true);

    try {
      const payload = {
        main_deck: deckCards
          .filter((c) => c.board === "main" || !c.board)
          .map((c) => ({ name: c.name, quantity: c.quantity })),
        sideboard: deckCards
          .filter((c) => c.board === "side")
          .map((c) => ({ name: c.name, quantity: c.quantity })),
        format_name: selectedFormat.name.en || selectedFormat.scryfallKey,
        locale: locale,
        meta_archetypes:
          analysisArchetypes.length > 0 ? analysisArchetypes : undefined,
      };

      // La llamada ahora pasa por nuestra API de backend, que actúa como proxy
      const data = await DeckService.analyzeDeck(payload);

      setAnalysisResult(data);
      setIsAnalysisModalOpen(true);
    } catch (error) {
      console.error("Error analizando mazo:", error);
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-orange-500" size={28} />
        <h2 className="text-2xl font-bold text-white">
          {t("deckBuilder.title")}
        </h2>
      </div>

      {/* Panel de Configuración */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">
              {t("deckBuilder.deckNameLabel")}
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder={t("deckBuilder.deckNamePlaceholder")}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder-zinc-600"
            />
          </div>

          {/* Formato */}
          <div>
            <DropdownInput
              label={t("deckBuilder.formatLabel")}
              options={formatOptions}
              value={selectedFormatId}
              onChange={handleFormatChange}
              placeholder={t("deckBuilder.formatPlaceholder")}
            />
            {selectedFormat && (
              <div className="mt-2 text-xs text-zinc-500 flex gap-4 px-1">
                <span>
                  {t("deckBuilder.minCardsLabel")}{" "}
                  <span className="text-zinc-300">
                    {(selectedFormat.config as any).minDeckSize}
                  </span>
                </span>
                {(selectedFormat.config as any).maxDeckSize && (
                  <span>
                    {t("deckBuilder.maxCardsLabel")}{" "}
                    <span className="text-zinc-300">
                      {(selectedFormat.config as any).maxDeckSize}
                    </span>
                  </span>
                )}
                <span>
                  {t("deckBuilder.maxCopiesLabel")}{" "}
                  <span className="text-zinc-300">
                    {selectedFormat.config.maxCopies}
                  </span>
                </span>
                {(selectedFormat.config as any).maxSideboard > 0 && (
                  <span>
                    {t("deckBuilder.sideboardLabel")}{" "}
                    <span className="text-zinc-300">
                      {(selectedFormat.config as any).maxSideboard}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Configuración: Privacidad y Guardar */}
        <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                isPrivate
                  ? "bg-orange-500/10 border-orange-500 text-orange-500"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {isPrivate ? <Shield size={18} /> : <ShieldAlert size={18} />}
              <span className="font-medium">
                {isPrivate ? t("deckBuilder.private") : t("deckBuilder.public")}
              </span>
            </button>
            <span className="text-xs text-zinc-600 hidden sm:inline">
              {isPrivate
                ? t("deckBuilder.privateDescription")
                : t("deckBuilder.publicDescription")}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAnalyzeDeck}
              disabled={!isDeckValid || isAnalyzing}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border ${
                isDeckValid && !isAnalyzing
                  ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 hover:bg-indigo-600/30"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <Brain size={20} className={isAnalyzing ? "animate-pulse" : ""} />
              {isAnalyzing
                ? t("deckBuilder.analyzing")
                : t("deckBuilder.analyzeAI")}
            </button>
          </div>{" "}
          <button
            onClick={handleSaveDeck}
            disabled={!isDeckValid}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              isDeckValid
                ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 active:scale-95"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            <Save size={20} />
            {deckId ? t("deckBuilder.updateDeck") : t("deckBuilder.saveDeck")}
          </button>
        </div>
      </div>

      {/* Área de Construcción */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl min-h-[500px] relative">
        {!selectedFormat ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
            <Settings size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">
              {t("deckBuilder.configureFormatTitle")}
            </p>
            <p className="text-sm opacity-60">
              {t("deckBuilder.configureFormatDescription")}
            </p>
          </div>
        ) : (
          <>
            <div className="relative mb-8 max-w-2xl mx-auto">
              <div className="flex gap-3 items-start">
                <div className="flex-1 relative">
                  <SearchInput
                    label={t("deckBuilder.addCardsLabel")}
                    placeholder={t("deckBuilder.addCardsPlaceholder")}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    hint={t("deckBuilder.addCardsHint")}
                  />

                  {suggestions.length > 0 && (
                    <ul className="absolute top-[85px] left-0 right-0 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-[160px] overflow-y-auto py-1">
                      {suggestions.map((suggestion) => (
                        <li
                          key={suggestion}
                          className="px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 cursor-pointer transition-colors border-b border-zinc-800/50 last:border-0"
                          onClick={() => handleAddCard(suggestion)}
                        >
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="mt-7 p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-all shadow-lg"
                  title={t("deckBuilder.importDeckButton")}
                >
                  <Upload size={24} />
                </button>
              </div>

              {/* Panel de Errores de Importación */}
              {importErrors.length > 0 && (
                <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4 relative animate-in fade-in slide-in-from-top-2">
                  <button
                    onClick={() => setImportErrors([])}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className="text-red-500 shrink-0 mt-0.5"
                      size={20}
                    />
                    <div>
                      <h4 className="text-red-500 font-bold text-sm mb-1">
                        {t("deckBuilder.importErrorTitle", {
                          count: importErrors.length,
                        })}
                      </h4>
                      <ul className="text-red-400/80 text-xs list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                        {importErrors.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DeckList
              cards={deckCards}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveCard}
              onMoveToBoard={handleMoveCard}
              maxSideboardSize={(selectedFormat?.config as any)?.maxSideboard}
              minMainDeckSize={(selectedFormat?.config as any)?.minDeckSize}
              isCommanderFormat={isCommanderFormat}
            />

            {/* Footer con Estadísticas */}
            <DeckStats cards={deckCards} />
          </>
        )}
      </div>

      {/* Modal de Importación */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={t("deckBuilder.importModalTitle")}
      >
        <TextAreaInput
          value={importText}
          onChange={setImportText}
          placeholder={t("deckBuilder.importModalPlaceholder")}
          minHeight="200px"
          hint={t("deckBuilder.importModalHint")}
        />
        <button
          onClick={handleImportDeck}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 mt-4"
        >
          {t("deckBuilder.importButton")}
        </button>
      </Modal>

      {/* Modal de Resultados de Análisis IA */}
      <Modal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        title={t("deckBuilder.analysisModalTitle")}
      >
        {analysisResult && (
          <div className="space-y-6 text-zinc-300 max-h-[70vh] overflow-y-auto pr-2">
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
              <h4 className="text-orange-500 font-bold mb-2">
                {t("deckBuilder.generalSummary")}
              </h4>
              <p className="text-sm">{analysisResult.general_summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-900/10 p-4 rounded-xl border border-green-900/30">
                <h4 className="text-green-500 font-bold mb-2">
                  {t("deckBuilder.strengths")}
                </h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {analysisResult.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-900/10 p-4 rounded-xl border border-red-900/30">
                <h4 className="text-red-500 font-bold mb-2">
                  {t("deckBuilder.weaknesses")}
                </h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {analysisResult.weaknesses.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3">
                {t("deckBuilder.matchups")}
              </h4>
              <div className="space-y-3">
                {analysisResult.matchups.map((match: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-zinc-950 p-4 rounded-lg border border-zinc-800"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-indigo-400">
                        {match.archetype}
                      </span>
                      <div className="text-xs font-mono">
                        <span className="text-zinc-500">
                          {t("deckBuilder.winRate")}{" "}
                        </span>
                        <span
                          className={
                            match.win_rate_post > 50
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {match.win_rate_pre}% ➔ {match.win_rate_post}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 italic mb-2">
                      {match.strategy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DeckBuilder;
