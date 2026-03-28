import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DropdownInput from "../../components/ui/DropdownInput";
import SearchInput from "../../components/ui/SearchInput";
import DeckList, { type DeckCard } from "../../components/ui/DeckList";
import DeckStats from "../../components/ui/DeckStats";
import { useToast } from "../../services/ToastContext";
import {
  Shield,
  ShieldAlert,
  Settings,
  Upload,
  AlertCircle,
  X,
  Save,
  Brain,
  Loader2,
  Lightbulb,
  Layers,
  Euro,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { type Format } from "../../core/models/Format";
import { FormatService } from "../../services/FormatService";
import { CardService } from "../../services/CardService";
import { DeckService } from "../../services/DeckService";
import Modal from "../../components/ui/Modal";
import TextAreaInput from "../../components/ui/TextAreaInput";
import { useUser } from "../../services/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import SEO from "../../components/ui/SEO";

// Extendemos DeckCard localmente para incluir la imagen hasta que se actualice la definición base
type DeckCardWithImage = DeckCard & { image: string };

type ViewMode = "list" | "spoiler";
type GroupMode = "type" | "none";
type SortMode = "cmc" | "alpha";
type SortDir = "asc" | "desc";

const sortCards = (cards: DeckCardWithImage[], mode: SortMode, dir: SortDir) => {
  const mul = dir === "asc" ? 1 : -1;
  const sorted = [...cards];
  if (mode === "alpha") return sorted.sort((a, b) => mul * (a.name ?? "").localeCompare(b.name ?? ""));
  return sorted.sort((a, b) => mul * ((a.cmc ?? 0) - (b.cmc ?? 0)));
};

const groupByType = (cards: DeckCardWithImage[]) => {
  const groups: Record<string, DeckCardWithImage[]> = {};
  for (const card of cards) {
    if (card.board === "commander") {
      if (!groups["Commander"]) groups["Commander"] = [];
      groups["Commander"].push(card);
      continue;
    }

    let type = "Other";
    if (card.type?.includes("Creature")) type = "Creature";
    else if (card.type?.includes("Planeswalker")) type = "Planeswalker";
    else if (card.type?.includes("Battle")) type = "Battle";
    else if (card.type?.includes("Instant")) type = "Instant";
    else if (card.type?.includes("Sorcery")) type = "Sorcery";
    else if (card.type?.includes("Enchantment")) type = "Enchantment";
    else if (card.type?.includes("Artifact")) type = "Artifact";
    else if (card.type?.includes("Land")) type = "Land";

    if (!groups[type]) groups[type] = [];
    groups[type].push(card);
  }
  return groups;
};

const TYPE_ORDER = ["Commander", "Planeswalker", "Creature", "Battle", "Instant", "Sorcery", "Enchantment", "Artifact", "Land", "Other"];

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
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { deckId } = useParams();
  const [deckName, setDeckName] = useState("");
  const [deckNameTouched, setDeckNameTouched] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [formats, setFormats] = useState<Format[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [deckCards, setDeckCards] = useState<DeckCardWithImage[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const [analysisArchetypes, setAnalysisArchetypes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(true);

  // Layout states (matching DeckViewer features roughly)
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortMode, setSortMode] = useState<SortMode>("cmc");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupMode, setGroupMode] = useState<GroupMode>("type");
  const [showPrices, setShowPrices] = useState(false);

  // Mobile image preview
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewCardName, setPreviewCardName] = useState<string | null>(null);
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});

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
                isGameChanger: cardData.games_changer === true || cardData.game_changer === true,
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

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (val.length >= 3) {
      searchDebounceRef.current = setTimeout(async () => {
        const results = await CardService.autocomplete(val);
        setSuggestions(results);
      }, 300);
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
    targetBoard: "main" | "side" | "commander" | "maybe"
  ) => {
    setDeckCards((prev) => {
      // Create a copy of the deck to mutate
      const newDeck = [...prev];
      
      const sourceIndex = newDeck.findIndex(
        (c) => c.id === card.id && c.board === card.board
      );

      if (sourceIndex === -1) return prev; // Security check

      // 1. Decrement source or remove if it's the last one
      const sourceCard = newDeck[sourceIndex];
      if (sourceCard.quantity > 1) {
        newDeck[sourceIndex] = { ...sourceCard, quantity: sourceCard.quantity - 1 };
      } else {
        newDeck.splice(sourceIndex, 1);
      }

      // 2. Prepare the card for the new board (quantity of 1)
      const movedCard: DeckCardWithImage = {
        ...(card as DeckCardWithImage),
        board: targetBoard,
        quantity: 1,
      };

      // 3. Check if it already exists in the destination to merge
      const existingDestIndex = newDeck.findIndex(
        (c) => c.name === movedCard.name && c.board === movedCard.board
      );

      if (existingDestIndex > -1) {
        newDeck[existingDestIndex] = {
           ...newDeck[existingDestIndex],
           quantity: newDeck[existingDestIndex].quantity + 1
        };
      } else {
        newDeck.push(movedCard);
      }

      return newDeck;
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
          isGameChanger: cardData.games_changer === true || cardData.game_changer === true,
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

    void deckCards
      .filter((c) => c.board === "maybe")
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
      if (mainDeckCount < selectedFormat.config.minMainDeck)
        return false;

      // Validar tamaño máximo si existe
      if (
        selectedFormat.config.maxMainDeck &&
        mainDeckCount > selectedFormat.config.maxMainDeck
      )
        return false;

      // 2. Validar tamaño del Sideboard
      if (sideboardCount > selectedFormat.config.maxSideboard)
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

  // Razones por las que el mazo no es válido (para mostrar al usuario)
  const deckValidationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!deckName.trim()) {
      errors.push(t("deckBuilder.validationNeedName"));
      return errors;
    }
    if (!selectedFormat) {
      errors.push(t("deckBuilder.validationNeedFormat"));
      return errors;
    }

    const mainDeckCount = deckCards
      .filter((c) => c.board === "main" || !c.board)
      .reduce((acc, c) => acc + c.quantity, 0);
    const sideboardCount = deckCards
      .filter((c) => c.board === "side")
      .reduce((acc, c) => acc + c.quantity, 0);
    const commanderCount = deckCards
      .filter((c) => c.board === "commander")
      .reduce((acc, c) => acc + c.quantity, 0);

    if (isCommanderFormat) {
      if (mainDeckCount + commanderCount !== 100)
        errors.push(t("deckBuilder.validationCommander100"));
      if (commanderCount < 1)
        errors.push(t("deckBuilder.validationCommanderNeeded"));
      if (sideboardCount > 0)
        errors.push(t("deckBuilder.validationNoSideboardCommander"));
    } else {
      if (mainDeckCount < selectedFormat.config.minMainDeck)
        errors.push(
          t("deckBuilder.validationMinCards")
            .replace("{min}", String(selectedFormat.config.minMainDeck))
            .replace("{current}", String(mainDeckCount))
        );
      if (
        selectedFormat.config.maxMainDeck &&
        mainDeckCount > selectedFormat.config.maxMainDeck
      )
        errors.push(
          t("deckBuilder.validationMaxCards").replace(
            "{max}",
            String(selectedFormat.config.maxMainDeck)
          )
        );
      if (sideboardCount > selectedFormat.config.maxSideboard)
        errors.push(
          t("deckBuilder.validationMaxSideboard").replace(
            "{max}",
            String(selectedFormat.config.maxSideboard)
          )
        );
    }

    if (deckCards.some((c) => c.isValid === false))
      errors.push(t("deckBuilder.validationIllegalCards"));

    const cardCounts: Record<string, number> = {};
    for (const c of deckCards) {
      if (!c.type.includes("Basic"))
        cardCounts[c.name] = (cardCounts[c.name] || 0) + c.quantity;
    }
    if (Object.values(cardCounts).some((n) => n > selectedFormat.config.maxCopies))
      errors.push(
        t("deckBuilder.validationMaxCopies").replace(
          "{max}",
          String(selectedFormat.config.maxCopies)
        )
      );

    return errors;
  }, [deckName, selectedFormat, deckCards, isCommanderFormat, t]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsFloating(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSaveDeck = async () => {
    if (!user || !selectedFormat) return;
    if (!deckName.trim()) {
      setDeckNameTouched(true);
      return;
    }
    if (!isDeckValid) return;

    const payload = {
      name: deckName,
      formatId: selectedFormat.id,
      userId: user.userId,
      isPrivate: isPrivate,
      cards: deckCards.map((card) => ({
        id: card.id,
        quantity: card.quantity,
        board: (card.board || "main") as any,
      })),
    };

    setIsSaving(true);
    try {
      if (deckId) {
        await DeckService.updateDeck(deckId, payload);
        showToast(t("deckBuilder.deckUpdated"), "success");
      } else {
        await DeckService.saveDeck(payload);
        showToast(t("deckBuilder.deckSaved"), "success");
      }
      navigate("/my-decks");
    } catch (error) {
      console.error("Error al guardar el mazo:", error);
      showToast(t("deckBuilder.saveDeckError"), "error");
    } finally {
      setIsSaving(false);
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
        maybeboard: deckCards
          .filter((c) => c.board === "maybe")
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

  // Filter cards for the main DeckList component (exclude maybeboard to avoid confusion if DeckList doesn't support it)
  const mainDeckCards = deckCards.filter(c => c.board !== "maybe");
  const maybeCards = deckCards.filter(c => c.board === "maybe");
  const sideCards = deckCards.filter(c => c.board === "side");
  const mainBarCount = deckCards.filter(c => c.board === "main" || !c.board).reduce((s, c) => s + c.quantity, 0);
  const sideBarCount = deckCards.filter(c => c.board === "side").reduce((s, c) => s + c.quantity, 0);
  const totalDeckPrice = deckCards.reduce((sum, c) => sum + (c.price ?? 0) * c.quantity, 0);

  const mainTypeGroups = groupByType(mainDeckCards);
  const mainGroups: Record<string, DeckCardWithImage[]> =
    groupMode === "type"
      ? Object.fromEntries(
          Object.entries(mainTypeGroups).map(([type, cards]) => [type, sortCards(cards, sortMode, sortDir)])
        )
      : { All: sortCards(mainDeckCards, sortMode, sortDir) };

  const handleMouseEnterCard = async (cardName: string, imageSrc?: string) => {
    if (cachedImages[cardName]) {
      setPreviewImage(cachedImages[cardName]);
      return;
    }
    if (imageSrc) {
       setCachedImages(prev => ({ ...prev, [cardName]: imageSrc }));
       setPreviewImage(imageSrc);
       return;
    }
    
    try {
      const cardDetails = await CardService.getCardByName(cardName);
      const imageUrl = cardDetails.image_uris?.normal || cardDetails.card_faces?.[0]?.image_uris?.normal;
      if (imageUrl) {
        setCachedImages(prev => ({ ...prev, [cardName]: imageUrl }));
        setPreviewImage(imageUrl);
      }
    } catch (error) {
      console.error("Error fetching card image for preview:", error);
    }
  };

  const handleCardPreview = async (cardName: string) => {
    const cardInDeck = deckCards.find(c => c.name === cardName);
    await handleMouseEnterCard(cardName, cardInDeck?.image);
    setPreviewCardName(cardName);
    setIsPreviewModalOpen(true);
  };

  const handleSuggestedCardPreview = async (cardName: string) => {
    setPreviewImage(null);
    setPreviewCardName(cardName);
    setIsPreviewModalOpen(true);
    await handleMouseEnterCard(cardName);
  };

  const handleAddSuggestionToBoard = async (cardName: string, board: "main" | "side" | "maybe") => {
    try {
      const cardData = await CardService.getCardByName(cardName);
      let isValid = true;
      if (selectedFormat) {
        const formatKey = selectedFormat.scryfallKey;
        isValid = cardData.legalities?.[formatKey] === "legal" || cardData.legalities?.[formatKey] === "restricted";
      }
      const newCard: DeckCardWithImage = {
        id: cardData.id,
        name: cardData.name,
        quantity: 1,
        manaCost: cardData.mana_cost,
        cmc: cardData.cmc,
        type: cardData.type_line?.split("—")[0]?.trim() || "Unknown",
        price: parseFloat(cardData.prices?.eur || "0"),
        inCollection: false,
        isValid: isValid,
        board,
        isGameChanger: cardData.games_changer === true || cardData.game_changer === true,
        image: cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal || "",
      };
      addCardsToDeck([newCard]);
      setIsPreviewModalOpen(false);
      showToast(`${cardData.name} → ${board}`, "success");
    } catch (error) {
      console.error("Error adding suggested card:", error);
      showToast("Error al añadir la carta", "error");
    }
  };

  return (
    <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto mt-8">
      <SEO 
        title={t("seo.deckBuilderTitle")} 
        description={t("seo.deckBuilderDescription")} 
      />
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
              onBlur={() => setDeckNameTouched(true)}
              placeholder={t("deckBuilder.deckNamePlaceholder")}
              className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-all placeholder-zinc-600 ${
                deckNameTouched && !deckName.trim()
                  ? "border-red-500 focus:ring-red-500/50"
                  : "border-zinc-800 focus:ring-orange-500/50"
              }`}
            />
            {deckNameTouched && !deckName.trim() && (
              <p className="mt-1 text-xs text-red-400">{t("deckBuilder.deckNameRequired")}</p>
            )}
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
                    {selectedFormat.config.minMainDeck}
                  </span>
                </span>
                {selectedFormat.config.maxMainDeck && (
                  <span>
                    {t("deckBuilder.maxCardsLabel")}{" "}
                    <span className="text-zinc-300">
                      {selectedFormat.config.maxMainDeck}
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

        {/* Footer Configuración: Privacidad, Analizar y Guardar */}
        <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:mr-auto">
            <button
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all sm:w-auto ${
                isPrivate
                  ? "bg-orange-500/10 border-orange-500 text-orange-500"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {isPrivate ? <Shield size={18} /> : <ShieldAlert size={18} />}
              <span className="font-bold">
                {isPrivate ? t("deckBuilder.private") : t("deckBuilder.public")}
              </span>
            </button>
            <span className="text-xs text-zinc-600">
              {isPrivate
                ? t("deckBuilder.privateDescription")
                : t("deckBuilder.publicDescription")}
            </span>
          </div>

          <button
            onClick={handleAnalyzeDeck}
            disabled={!isDeckValid || isAnalyzing}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all border w-full md:w-auto ${
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

          <button
            onClick={handleSaveDeck}
            disabled={!isDeckValid || isSaving}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all w-full md:w-auto ${
              isDeckValid && !isSaving
                ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 active:scale-95"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {isSaving
              ? t("common.saving")
              : deckId
              ? t("deckBuilder.updateDeck")
              : t("deckBuilder.saveDeck")}
          </button>
        </div>
        {!isDeckValid && deckValidationErrors.length > 0 && (
          <ul className="mt-2 flex flex-col items-end gap-1">
            {deckValidationErrors.map((err, i) => (
              <li key={i} className="flex items-center gap-1 text-xs text-amber-400">
                <AlertCircle size={12} />
                {err}
              </li>
            ))}
          </ul>
        )}
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
            <div className="relative mb-8 max-w-2xl mx-auto flex flex-col gap-4">
              <div className="relative w-full">
                <SearchInput
                  label={t("deckBuilder.addCardsLabel")}
                  placeholder={t("deckBuilder.addCardsPlaceholder")}
                  value={searchQuery}
                  onChange={handleSearchChange}
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

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-all shadow-lg font-bold min-h-[46px]"
                  >
                    <Upload size={20} />
                    {t("deckBuilder.importDeckButton")}
                  </button>

                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition-all shadow-lg font-bold min-h-[46px]"
                  >
                    <Upload size={20} />
                    {t("deckBuilder.importDeckButton")}
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

            {/* Toolbar: Group, Sort, ViewMode, Prices */}
            <div className="flex items-center gap-3 flex-wrap mt-6 mb-4">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                <span className="text-zinc-600 text-xs px-2">{t("deckViewer.group")}</span>
                {(["type", "none"] as GroupMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGroupMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      groupMode === mode
                        ? "bg-orange-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {mode === "type" ? t("deckViewer.groupType") : t("deckViewer.groupNone")}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                <span className="text-zinc-600 text-xs px-2">{t("deckViewer.sort")}</span>
                {(["cmc", "alpha"] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      sortMode === mode
                        ? "bg-orange-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {mode === "cmc" ? t("deckViewer.sortCmc") : t("deckViewer.sortAlpha")}
                  </button>
                ))}
                <div className="w-px h-4 bg-zinc-700 mx-1" />
                <button
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title={sortDir === "asc" ? t("deckViewer.sortAsc") : t("deckViewer.sortDesc")}
                >
                  {sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                </button>
              </div>

              {/* View Mode Toggle moved here */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg ml-auto sm:ml-0">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-orange-500 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {t("deckViewer.viewList")}
                </button>
                <button
                  onClick={() => setViewMode("spoiler")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "spoiler"
                      ? "bg-orange-500 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {t("deckViewer.viewSpoiler")}
                </button>
              </div>

              {/* Price toggle */}
              <button
                onClick={() => setShowPrices(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  showPrices
                    ? "bg-green-500/20 text-green-400 border-green-500/40"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-600"
                }`}
              >
                <Euro size={13} />
                {showPrices ? t("deckViewer.hidePrices") : t("deckViewer.showPrices")}
              </button>
            </div>
            
            {viewMode === "list" ? (
              <DeckList
                cards={mainDeckCards.concat(sideCards)}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveCard}
                onMoveToBoard={handleMoveCard}
                maxSideboardSize={selectedFormat?.config?.maxSideboard}
                minMainDeckSize={
                  isCommanderFormat
                    ? undefined
                    : selectedFormat?.config?.minMainDeck
                }
                isCommanderFormat={isCommanderFormat}
                onCardPreview={handleCardPreview}
                hideToolbar={true}
                externalSortMode={sortMode}
                externalSortDir={sortDir}
                externalGroupMode={groupMode}
                externalShowPrices={showPrices}
              />
            ) : (
                <div className="space-y-12">
                  {/* Spoiler Mode: Main Deck */}
                  <div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
                      <Layers size={22} className="text-orange-500" />
                      {t("common.mainDeck")}
                      <span className="text-zinc-500 font-normal text-sm">({mainBarCount})</span>
                    </h2>
                    
                    {TYPE_ORDER.filter(t => mainGroups[t]).concat(mainGroups["All"] ? ["All"] : []).map(typeName => (
                      <div key={typeName} className={typeName !== "All" ? "mb-8 " : ""}>
                         {typeName !== "All" && (
                            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 pb-1 border-b border-zinc-800 flex justify-between">
                              <span><span className="text-orange-500">{t(`deckViewer.cardTypes.${typeName}` as any) || typeName}</span>
                              <span className="text-zinc-600 font-normal ml-2 text-xs">({mainGroups[typeName].reduce((s, c) => s + c.quantity, 0)})</span></span>
                            </h3>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                              {mainGroups[typeName].map((card, i) => (
                                <div key={i} className="group relative">
                                  {card.image ? (
                                    <img
                                      src={card.image}
                                      alt={card.name}
                                      className={`rounded-lg shadow-lg w-full transition-transform group-hover:scale-105 group-hover:z-10 ${card.isGameChanger ? 'ring-2 ring-orange-500 shadow-orange-500/30' : ''}`}
                                    />
                                  ) : (
                                    <div className="aspect-[2.5/3.5] rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center p-4 text-center">
                                      <Layers size={32} className="text-zinc-700 mb-2" />
                                      <span className="text-xs text-zinc-500 font-medium">{card.name}</span>
                                    </div>
                                  )}
                                  {/* Desktop Hover Overlay (Original Style) */}
                                  <div className="hidden lg:block absolute top-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    ×{card.quantity}
                                  </div>
                                  <div className="hidden lg:flex absolute bottom-1 left-1/2 -translate-x-1/2 items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                      <div className="flex bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden p-0.5">
                                          <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, -1); }} className="px-2 text-zinc-300 hover:text-white hover:bg-zinc-800">-</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }} className="px-2 text-zinc-300 hover:text-white hover:bg-zinc-800">+</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleRemoveCard(card); }} className="px-2 text-red-500 hover:bg-zinc-800"><X size={14}/></button>
                                      </div>
                                  </div>

                                  {/* Footer estático para reemplazar hover y dar soporte a mobile/tablet */}
                                  <div className="mt-2 flex lg:hidden flex-col gap-1.5 w-full bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/80">
                                    <div className="flex items-center justify-between">
                                      {/* Controles de cantidad */}
                                      <div className="flex items-center gap-1 bg-zinc-950 rounded-md px-1 py-0.5 border border-zinc-800">
                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, -1); }} className="text-zinc-500 hover:text-white px-1 font-bold">-</button>
                                        <span className="text-xs font-bold text-zinc-300 w-4 text-center">{card.quantity}</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }} className="text-zinc-500 hover:text-white px-1 font-bold">+</button>
                                      </div>
                                      
                                      {/* Borrar */}
                                      <button onClick={(e) => { e.stopPropagation(); handleRemoveCard(card); }} className="text-red-500/70 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors" title={t("common.delete")}>
                                        <X size={14}/>
                                      </button>
                                    </div>
                                    
                                    {/* Mover carta */}
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleMoveCard(card, "side"); }} 
                                        className="flex-1 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 hover:bg-zinc-800 hover:text-orange-400 py-1 rounded border border-zinc-800 transition-colors"
                                      >
                                        + SIDE
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleMoveCard(card, "maybe"); }} 
                                        className="flex-1 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 hover:bg-zinc-800 hover:text-yellow-400 py-1 rounded border border-zinc-800 transition-colors"
                                      >
                                        + MAYBE
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                      </div>
                    ))}
                  </div>

                  {/* Spoiler Mode: Sideboard */}
                  {sideCards.length > 0 && (
                     <div>
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
                        <Shield size={22} className="text-zinc-500" />
                        {t("common.sideboard")}
                        <span className="text-zinc-500 font-normal text-sm">({sideBarCount})</span>
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 font-mono">
                          {sortCards(sideCards, sortMode, sortDir).map((card, i) => (
                             <div key={i} className="group relative">
                               {card.image ? (
                                 <img
                                   src={card.image}
                                   alt={card.name}
                                   className={`rounded-lg shadow-lg w-full transition-transform group-hover:scale-105 group-hover:z-10 ${card.isGameChanger ? 'ring-2 ring-orange-500 shadow-orange-500/30' : ''}`}
                                 />
                               ) : (
                                 <div className="aspect-[2.5/3.5] rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center p-4 text-center">
                                   <Shield size={32} className="text-zinc-700 mb-2" />
                                   <span className="text-xs text-zinc-500 font-medium">{card.name}</span>
                                 </div>
                               )}
                                {/* Desktop Hover Overlay (Original Style) */}
                                <div className="hidden lg:block absolute top-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  ×{card.quantity}
                                </div>
                                <div className="hidden lg:flex absolute bottom-1 left-1/2 -translate-x-1/2 items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <div className="flex bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden p-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, -1); }} className="px-2 text-zinc-300 hover:text-white hover:bg-zinc-800">-</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }} className="px-2 text-zinc-300 hover:text-white hover:bg-zinc-800">+</button>
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveCard(card); }} className="px-2 text-red-500 hover:bg-zinc-800"><X size={14}/></button>
                                    </div>
                                </div>

                                {/* Footer estático para reemplazar hover y dar soporte a mobile/tablet */}
                                <div className="mt-2 flex lg:hidden flex-col gap-1.5 w-full bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/80">
                                  <div className="flex items-center justify-between">
                                    {/* Controles de cantidad */}
                                    <div className="flex items-center gap-1 bg-zinc-950 rounded-md px-1 py-0.5 border border-zinc-800">
                                      <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, -1); }} className="text-zinc-500 hover:text-white px-1 font-bold">-</button>
                                      <span className="text-xs font-bold text-zinc-300 w-4 text-center">{card.quantity}</span>
                                      <button onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }} className="text-zinc-500 hover:text-white px-1 font-bold">+</button>
                                    </div>
                                    
                                    {/* Borrar */}
                                    <button onClick={(e) => { e.stopPropagation(); handleRemoveCard(card); }} className="text-red-500/70 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors" title={t("common.delete")}>
                                      <X size={14}/>
                                    </button>
                                  </div>
                                  
                                  {/* Mover carta */}
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleMoveCard(card, "main"); }} 
                                      className="flex-1 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 hover:bg-zinc-800 hover:text-orange-400 py-1 rounded border border-zinc-800 transition-colors"
                                    >
                                      + MAIN
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleMoveCard(card, "maybe"); }} 
                                      className="flex-1 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 hover:bg-zinc-800 hover:text-yellow-400 py-1 rounded border border-zinc-800 transition-colors"
                                    >
                                      + MAYBE
                                    </button>
                                  </div>
                                </div>
                             </div>
                           ))}
                      </div>
                     </div>
                  )}
                </div>
            )}

            {/* Maybeboard Section (Manual Render) */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-400 mb-4 flex items-center gap-2">
                <Lightbulb size={18} />
                {t("common.maybeboard")}
                <span className="text-zinc-600 text-sm font-normal">({maybeCards.reduce((acc, c) => acc + c.quantity, 0)})</span>
              </h3>
              
              {maybeCards.length === 0 ? (
                <div className="text-zinc-600 text-sm italic p-4 border border-dashed border-zinc-800 rounded-xl text-center">
                  Arrastra cartas aquí o usa el menú para añadir cartas consideradas.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {maybeCards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 group hover:border-zinc-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-zinc-900 rounded-md px-1.5 py-0.5 border border-zinc-800">
                          <button onClick={() => handleUpdateQuantity(card, -1)} className="text-zinc-500 hover:text-white px-1">-</button>
                          <span className="text-sm font-mono w-4 text-center">{card.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(card, 1)} className="text-zinc-500 hover:text-white px-1">+</button>
                        </div>
                        <span className="text-zinc-300 font-medium">{card.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleMoveCard(card, "main")}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700"
                        >
                          {t("deckList.moveToMain" as any) || "Main"}
                        </button>
                        <button 
                          onClick={() => handleMoveCard(card, "side")}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700"
                        >
                          {t("deckList.moveToSideboard" as any) || "Side"}
                        </button>
                        <button 
                          onClick={() => handleRemoveCard(card)}
                          className="text-red-500 hover:bg-red-900/20 p-1 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con Estadísticas */}
            <DeckStats cards={deckCards} />
          </>
        )}
      </div>

      {/* Sentinel – floats bar until this element scrolls into view */}
      <div ref={sentinelRef} />
      {isFloating && <div className="h-16" />}
      <div className={isFloating ? "fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800/80" : "mt-4 rounded-2xl border border-zinc-800 bg-zinc-900"}>
        <div className="flex items-center gap-4 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {isCommanderFormat ? (
              <div className="flex items-center gap-1.5 text-sm">
                <Layers size={14} className="text-orange-500 flex-shrink-0" />
                <span className="text-white font-bold">{deckCards.filter(c => c.board !== "maybe" && c.board !== "side").reduce((s, c) => s + c.quantity, 0)}</span>
                <span className="text-zinc-500 hidden sm:inline">{t("deckViewer.total")}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-sm">
                  <Layers size={14} className="text-orange-500 flex-shrink-0" />
                  <span className="text-white font-bold">{mainBarCount}</span>
                  <span className="text-zinc-500 hidden sm:inline">{t("common.mainDeck")}</span>
                </div>
                {sideBarCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Shield size={14} className="text-zinc-500 flex-shrink-0" />
                    <span className="text-white font-bold">{sideBarCount}</span>
                    <span className="text-zinc-500 hidden sm:inline">{t("common.sideboard")}</span>
                  </div>
                )}
              </>
            )}
            {totalDeckPrice > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Euro size={14} className="text-green-400 flex-shrink-0" />
                <span className="text-green-400 font-bold">{totalDeckPrice.toFixed(2)} €</span>
              </div>
            )}
          </div>
          <button
            onClick={handleSaveDeck}
            disabled={!isDeckValid || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isDeckValid && !isSaving ? "bg-green-600 hover:bg-green-500 text-white active:scale-95" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"}`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? t("common.saving") : deckId ? t("deckBuilder.updateDeck") : t("deckBuilder.saveDeck")}
          </button>
        </div>
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
        maxWidth="max-w-4xl"
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
            {/* Suggested Changes */}
            {analysisResult.suggested_changes && analysisResult.suggested_changes.length > 0 && (
              <div>
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <span className="text-yellow-400">✦</span>
                  {t("deckBuilder.suggestedChanges" as any) || "Cambios Sugeridos"}
                </h4>
                <div className="space-y-2">
                  {analysisResult.suggested_changes.map((change: any, idx: number) => (
                    <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-red-400/80 line-through text-xs truncate flex-shrink-0 max-w-[40%]">{change.card_out}</span>
                        <span className="text-zinc-500">→</span>
                        <button
                          onClick={() => handleSuggestedCardPreview(change.card_in)}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs underline underline-offset-2 truncate text-left transition-colors"
                          title={`Click to preview ${change.card_in}`}
                        >
                          {change.card_in}
                        </button>
                        {change.quantity && <span className="text-zinc-600 text-[10px] flex-shrink-0">x{change.quantity}</span>}
                      </div>
                      <p className="text-xs text-zinc-500 italic sm:max-w-[50%]">{change.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Lightbox para Móvil/Lista Previews (+ AI Suggested Cards) */}
      {isPreviewModalOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div className="relative max-w-sm w-full animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
            >
              <X size={24} />
            </button>
            {previewImage ? (
              <img
                src={previewImage || undefined}
                alt="Card preview"
                className="w-full rounded-3xl shadow-2xl"
              />
            ) : (
              <div className="w-full aspect-[2.5/3.5] rounded-3xl bg-zinc-900 flex items-center justify-center">
                <Loader2 size={64} className="animate-spin text-orange-500" />
              </div>
            )}
            {/* Add to Deck buttons (shown when previewing an AI suggestion) */}
            {previewCardName && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddSuggestionToBoard(previewCardName, "main")}
                  className="py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-colors shadow-lg"
                >
                  + Main
                </button>
                <button
                  onClick={() => handleAddSuggestionToBoard(previewCardName, "side")}
                  className="py-2 text-xs font-bold rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                >
                  + Side
                </button>
                <button
                  onClick={() => handleAddSuggestionToBoard(previewCardName, "maybe")}
                  className="py-2 text-xs font-bold rounded-xl bg-zinc-700 hover:bg-zinc-600 text-yellow-400 transition-colors"
                >
                  + Maybe
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder;
