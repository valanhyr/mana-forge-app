"""
Format-specific context: legal sets, ban lists, tier archetypes.
Used to inject authoritative knowledge into AI prompts.
"""
from typing import Optional

# ---------------------------------------------------------------------------
# Premodern
# ---------------------------------------------------------------------------
_PREMODERN = {
    "sets": (
        "Premodern uses cards from 4th Edition (July 1995) through Scourge (May 2003). "
        "Legal sets include: Ice Age, Alliances, Homelands, Mirage, Visions, Weatherlight, "
        "Tempest, Stronghold, Exodus, Urza's Saga, Urza's Legacy, Urza's Destiny, "
        "Mercadian Masques, Nemesis, Prophecy, Invasion, Planeshift, Apocalypse, "
        "Odyssey, Torment, Judgment, Onslaught, Legions, Scourge — plus 5th, 6th, 7th, 8th Edition core sets. "
        "NOT legal: any set after Scourge (2003). Fetch lands (Onslaught) ARE legal. "
        "Shock lands (Ravnica 2005) are NOT legal."
    ),
    "banned": [
        "Amulet of Quoz", "Balance", "Brainstorm", "Channel", "Demonic Consultation",
        "Demonic Tutor", "Dream Halls", "Earthcraft", "Entomb", "Frantic Search",
        "Gush", "Hermit Druid", "Illusionary Mask", "Mana Vault", "Memory Jar",
        "Mind Over Matter", "Mind Twist", "Mishra's Workshop", "Mox Diamond",
        "Necropotence", "Oath of Druids", "Skullclamp", "Survival of the Fittest",
        "Tempest Efreet", "Tinker", "Tolarian Academy", "Windfall",
        "Worldgorger Dragon", "Yawgmoth's Bargain", "Yawgmoth's Will",
    ],
    "tier1": [
        "Burn", "Stiflenought", "Goblins", "Parallax Replenish",
        "Enchantress", "Elves", "Devourer Combo", "Landstill",
        "Tide Control", "Madness", "Terrageddon", "Stasis",
        "Reanimator", "Sligh", "Stompy", "White Weenie",
        "The Rock", "Aluren Combo", "Donate Illusions",
    ],
    "requires_sideboard": True,
    "deck_size": 60,
    "singleton": False,
    "notes": "60-card constructed format with 15-card sideboard.",
}

# ---------------------------------------------------------------------------
# Modern
# ---------------------------------------------------------------------------
_MODERN = {
    "sets": (
        "Modern uses sets from 8th Edition (July 2003) onwards. "
        "Fetch lands (Zendikar, Khans), shock lands (Ravnica), and most staples are legal. "
        "NOT legal: sets before 8th Edition."
    ),
    "banned": [
        "Birthing Pod", "Blazing Shoal", "Chrome Mox", "Dark Depths",
        "Deathrite Shaman", "Dig Through Time", "Dread Return", "Eye of Ugin",
        "Gitaxian Probe", "Glimpse of Nature", "Green Sun's Zenith", "Griselbrand",
        "Hogaak, Arisen Necropolis", "Hypergenesis", "Krark-Clan Ironworks",
        "Mental Misstep", "Mox Opal", "Mycosynth Lattice", "Oko, Thief of Crowns",
        "Once Upon a Time", "Ponder", "Punishing Fire", "Rite of Flame",
        "Second Sunrise", "Seething Song", "Sensei's Divining Top",
        "Splinter Twin", "Summer Bloom", "Treasure Cruise", "Umezawa's Jitte",
    ],
    "tier1": [
        "Burn", "Hammer Time", "Living End", "Murktide Regent",
        "Amulet Titan", "Rakdos Scam", "Yawgmoth Combo", "UW Control",
        "Rhinos", "Creativity", "Domain Zoo", "Golgari Yawgmoth",
        "Temur Rhinos", "Crashing Footfalls", "4-Color Omnath",
    ],
    "requires_sideboard": True,
    "deck_size": 60,
    "singleton": False,
    "notes": "60-card constructed format with 15-card sideboard.",
}

# ---------------------------------------------------------------------------
# Legacy
# ---------------------------------------------------------------------------
_LEGACY = {
    "sets": (
        "Legacy is an eternal format — all Magic sets are legal (Alpha through current). "
        "Powerful cards like Brainstorm, Force of Will, Wasteland, Daze, Show and Tell, "
        "Dark Ritual, Swords to Plowshares, and Counterbalance are all legal. "
        "The Power Nine are banned. Dual lands (Underground Sea, Tundra, etc.) are legal and commonly played."
    ),
    "banned": [
        "Ancestral Recall", "Balance", "Black Lotus", "Channel", "Chaos Orb",
        "Contract from Below", "Darkpact", "Demonic Attorney", "Dig Through Time",
        "Falling Star", "Fastbond", "Flash", "Invoke Prejudice", "Library of Alexandria",
        "Memory Jar", "Mental Misstep", "Mind Twist", "Mishra's Workshop",
        "Mox Emerald", "Mox Jet", "Mox Pearl", "Mox Ruby", "Mox Sapphire",
        "Ragavan, Nimble Pilferer", "Shahrazad", "Time Vault", "Time Walk",
        "Timetwister", "Tinker", "Tolarian Academy", "Treasure Cruise",
        "Underworld Breach",
    ],
    "tier1": [
        "UR Delver", "Reanimator", "Show and Tell (Sneak and Show)", "Death and Taxes",
        "Elves", "Lands", "UW Stoneblade", "Doomsday", "Storm (ANT/TES)",
        "8-Cast", "Painter", "Goblins", "Food Chain", "Depths (Marit Lage)",
        "Initiative Stompy", "Cephalid Breakfast",
    ],
    "requires_sideboard": True,
    "deck_size": 60,
    "singleton": False,
    "notes": "60-card eternal format with 15-card sideboard. Very powerful card pool.",
}

# ---------------------------------------------------------------------------
# Pauper
# ---------------------------------------------------------------------------
_PAUPER = {
    "sets": (
        "Pauper uses only cards that have been printed at common rarity on Magic Online "
        "(or tabletop common if the card was never on MTGO). All sets are legal. "
        "A card is legal if it has EVER been printed at common rarity. "
        "No uncommon, rare, or mythic cards are permitted."
    ),
    "banned": [
        "Arcum's Astrolabe", "Atog", "Bonder's Ornament", "Chatterstorm",
        "Cloud of Faeries", "Cloudpost", "Cranial Plating", "Daze",
        "Empty the Warrens", "Expedition Map", "Frantic Search",
        "Gitaxian Probe", "Grapeshot", "High Tide", "Hymn to Tourach",
        "Invigorate", "Peregrine Drake", "Sinkhole", "Temporal Fissure",
        "Treasure Cruise",
    ],
    "tier1": [
        "Burn", "Affinity", "Faeries (Dimir/Mono-U)", "Kuldotha Boros",
        "Golgari Gardens", "Walls Combo", "Izzet Faeries", "Orzhov Blade",
        "Moggwarts (Goblin Storm)", "Caw-Gates", "Dimir Terror", "Elves",
        "Bogles", "Tron", "Cycling",
    ],
    "requires_sideboard": True,
    "deck_size": 60,
    "singleton": False,
    "notes": "60-card format using only common-rarity cards. 15-card sideboard.",
}

# ---------------------------------------------------------------------------
# Commander / EDH
# ---------------------------------------------------------------------------
_COMMANDER = {
    "sets": (
        "Commander (EDH) is an eternal singleton format — all Magic sets are legal. "
        "Decks consist of exactly 100 cards including the commander (a legendary creature or "
        "planeswalker with 'can be your commander'). Only one copy of each card is allowed "
        "except basic lands. The color identity of every card must match the commander's colors. "
        "Starting life total is 40."
    ),
    "banned": [
        "Ancestral Recall", "Balance", "Biorhythm", "Black Lotus", "Braids (Cabal Minion)",
        "Channel", "Chaos Orb", "Coalition Victory", "Contract from Below", "Darkpact",
        "Demonic Attorney", "Emrakul, the Aeons Torn", "Erayo, Soratami Ascendant",
        "Falling Star", "Fastbond", "Flash", "Gifts Ungiven", "Griselbrand",
        "Hermit Druid", "Invoke Prejudice", "Iona, Shield of Emeria",
        "Leovold, Emissary of Trest", "Library of Alexandria", "Limited Resources",
        "Lutri, the Spellchaser", "Mana Crypt", "Memory Jar", "Mind Twist",
        "Mishra's Workshop", "Mox Emerald", "Mox Jet", "Mox Pearl", "Mox Ruby",
        "Mox Sapphire", "Panoptic Mirror", "Primeval Titan", "Prophet of Kruphix",
        "Recurring Nightmare", "Rofellos, Llanowar Emissary", "Shahrazad",
        "Sundering Titan", "Sway of the Stars", "Sylvan Primordial",
        "Time Vault", "Time Walk", "Tinker", "Tolarian Academy", "Trade Secrets",
        "Upheaval", "Worldfire", "Yawgmoth's Bargain",
    ],
    "tier1": [
        "Blue-based Goodstuff", "Combo Control", "Stax", "Reanimator",
        "Elfball", "Ad Nauseam Combo", "Aristocrats", "Enchantress",
        "Dragon Tribal", "Zombie Tribal", "Landfall Ramp", "Equipment Voltron",
        "Spellslinger", "Tokens", "Blink/ETB",
    ],
    "requires_sideboard": False,
    "deck_size": 100,
    "singleton": True,
    "notes": (
        "100-card singleton. The commander is listed first in main_deck with quantity 1. "
        "No sideboard. Color identity of all cards must match the commander."
    ),
}

# ---------------------------------------------------------------------------
# cEDH (Competitive Commander)
# ---------------------------------------------------------------------------
_CEDH = {
    "sets": _COMMANDER["sets"] + (
        " cEDH uses the same rules as Commander but is optimized for maximum competitive power. "
        "Fast mana (Mana Crypt is BANNED since 2024), combo wins on turns 2-4 are common. "
        "Most decks run Blue for counterspells and card draw."
    ),
    "banned": _COMMANDER["banned"],
    "tier1": [
        "Turbo Naus (Ad Nauseam)", "Kinnan Bonder Prodigy", "Tymna/Thrasios Midrange",
        "Rograkh/Silas Artifact Combo", "Najeela Warrior Combo", "Kenrith the Returned King",
        "Kraum/Tymna (Blood Pod)", "Gitrog Monster Combo", "Underworld Breach Storm",
        "Inalla Wizard Combo", "Sisay Legendary Chain", "Zur Enchantress",
        "Shorikai Genesis Engine", "Atraxa Praetors Voice",
    ],
    "requires_sideboard": False,
    "deck_size": 100,
    "singleton": True,
    "notes": (
        "100-card singleton competitive Commander. Same ban list as regular Commander. "
        "The commander is listed first in main_deck with quantity 1. "
        "Fast mana and 2-3 card combo wins are the norm. No sideboard."
    ),
}

# ---------------------------------------------------------------------------
# Duel Commander (French Commander)
# ---------------------------------------------------------------------------
_DUEL_COMMANDER = {
    "sets": (
        "Duel Commander is a 1v1 Commander format with 20 starting life (not 40). "
        "Same singleton rules as Commander but with its own ban list maintained at duelcommander.com. "
        "All sets are legal subject to the Duel Commander ban list. "
        "Many cards legal in regular Commander are banned here due to the 1v1 nature."
    ),
    "banned": [
        "Ancestral Recall", "Back to Basics", "Balance", "Biorhythm", "Black Lotus",
        "Braids (Cabal Minion)", "Channel", "Chaos Orb", "Coalition Victory",
        "Contract from Below", "Cyclonic Rift", "Darkpact", "Demonic Attorney",
        "Dig Through Time", "Emrakul, the Aeons Torn", "Erayo, Soratami Ascendant",
        "Falling Star", "Fastbond", "Flash", "Gifts Ungiven", "Griselbrand",
        "Hermit Druid", "Invoke Prejudice", "Iona, Shield of Emeria",
        "Karakas", "Leovold, Emissary of Trest", "Library of Alexandria",
        "Limited Resources", "Lutri, the Spellchaser", "Mana Crypt", "Mana Drain",
        "Mana Vault", "Memory Jar", "Mind Twist", "Mishra's Workshop",
        "Mox Emerald", "Mox Jet", "Mox Pearl", "Mox Ruby", "Mox Sapphire",
        "Mystical Tutor", "Panoptic Mirror", "Price of Progress", "Primeval Titan",
        "Prophet of Kruphix", "Recurring Nightmare", "Rofellos, Llanowar Emissary",
        "Sensei's Divining Top", "Shahrazad", "Sol Ring", "Strip Mine",
        "Sundering Titan", "Sway of the Stars", "Sylvan Primordial",
        "Time Vault", "Time Walk", "Timetwister", "Tinker", "Tolarian Academy",
        "Trade Secrets", "Treasure Cruise", "Upheaval", "Vampiric Tutor",
        "Worldfire", "Yawgmoth's Bargain",
    ],
    "tier1": [
        "Winota Joiner of Forces", "Kinnan Bonder Prodigy", "Tymna/Kraum Midrange",
        "Narset Enlightened Master", "Kess Dissident Mage", "Golos Tireless Pilgrim",
        "Edgar Markov Vampires", "Edric Spymaster of Trest", "Yuriko Shadow Crept",
        "Aesi Tyrant of Gyre Strait", "Sythis Harvest Hand", "Reyhan/Tymna",
    ],
    "requires_sideboard": True,
    "deck_size": 100,
    "singleton": True,
    "notes": (
        "100-card singleton 1v1 format, 20 starting life. Has its own ban list. "
        "The commander is listed first in main_deck with quantity 1. "
        "15-card sideboard used in competitive events."
    ),
}

# ---------------------------------------------------------------------------
# Pauper Commander
# ---------------------------------------------------------------------------
_PAUPER_COMMANDER = {
    "sets": (
        "Pauper Commander is a singleton Commander variant where the commander must be an uncommon "
        "creature and all 99 other cards must be common rarity. "
        "All sets are legal. Only one copy of each non-basic card is allowed. "
        "The color identity of all cards must match the commander's colors."
    ),
    "banned": [
        "Arcum's Astrolabe", "Atog", "Bonder's Ornament", "Chatterstorm",
        "Cloud of Faeries", "Cloudpost", "Frantic Search", "Gitaxian Probe",
        "Grapeshot", "High Tide", "Invigorate", "Peregrine Drake",
        "Temporal Fissure", "Treasure Cruise",
    ],
    "tier1": [
        "Tortured Existence Reanimator", "Grixis Spellslinger", "Selesnya Auras (Bogles)",
        "Izzet Tempo", "Orzhov Aristocrats", "Simic Landfall", "Rakdos Sacrifice",
        "Mono-Green Stompy", "Dimir Control", "Boros Kuldotha Aggro",
    ],
    "requires_sideboard": False,
    "deck_size": 100,
    "singleton": True,
    "notes": (
        "100-card singleton. Commander must be an uncommon creature; all other cards must be common. "
        "The commander is listed first in main_deck with quantity 1. No sideboard."
    ),
}

# ---------------------------------------------------------------------------
# Format registry
# ---------------------------------------------------------------------------
_FORMATS = {
    "premodern": _PREMODERN,
    "modern": _MODERN,
    "legacy": _LEGACY,
    "pauper": _PAUPER,
    "commander": _COMMANDER,
    "edh": _COMMANDER,
    "cedh": _CEDH,
    "duel commander": _DUEL_COMMANDER,
    "duelcommander": _DUEL_COMMANDER,
    "pauper commander": _PAUPER_COMMANDER,
    "paupercommander": _PAUPER_COMMANDER,
}


def get_format_context(format_name: Optional[str]) -> Optional[dict]:
    if not format_name:
        return None
    return _FORMATS.get(format_name.lower().strip())


def get_ban_list_str(format_name: Optional[str]) -> str:
    ctx = get_format_context(format_name)
    if not ctx or not ctx.get("banned"):
        return ""
    banned = ", ".join(ctx["banned"])
    return (
        f"BANNED CARDS (absolutely forbidden — never include these in any list): {banned}. "
        "Including any banned card makes the deck illegal and your response invalid."
    )


def get_sets_str(format_name: Optional[str]) -> str:
    ctx = get_format_context(format_name)
    return ctx["sets"] if ctx else ""


def get_tier1_archetypes(format_name: Optional[str]) -> list:
    ctx = get_format_context(format_name)
    return ctx["tier1"] if ctx else []


def get_deck_size(format_name: Optional[str]) -> int:
    ctx = get_format_context(format_name)
    return ctx["deck_size"] if ctx else 60


def is_singleton(format_name: Optional[str]) -> bool:
    ctx = get_format_context(format_name)
    return ctx.get("singleton", False) if ctx else False


def get_format_notes(format_name: Optional[str]) -> str:
    ctx = get_format_context(format_name)
    return ctx.get("notes", "") if ctx else ""


def requires_sideboard(format_name: Optional[str]) -> bool:
    ctx = get_format_context(format_name)
    return ctx["requires_sideboard"] if ctx else True

