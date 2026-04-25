"""
Prompt injection defense utilities for the AI engine.

Strategy: structural controls rather than trying to detect all injection strings.
- Hard length limits (attacker can't write a novel into card_name)
- Allowlist validation for known-enum fields (locale, format_name)
- Strip control characters and common prompt-override patterns from free-text fields

This is defence-in-depth: the Groq API also enforces response_format=json_object,
so even if injection occurs the model is constrained to JSON output.
"""

import re
from typing import Optional

# --- Allowlists ---

ALLOWED_LOCALES = {"en", "es", "pt", "fr", "de", "it", "ja", "ko", "ru", "zh"}

ALLOWED_FORMATS = {
    "premodern", "legacy", "vintage", "modern", "pioneer", "standard",
    "pauper", "commander", "oathbreaker", "brawl", "historic", "explorer",
    "alchemy", "timeless", "penny dreadful", "oldschool", "premodern",
}

# Maximum lengths
MAX_CARD_NAME_LEN = 60
MAX_FORMAT_NAME_LEN = 50
MAX_ARCHETYPE_LEN = 60
MAX_ARCHETYPES_COUNT = 50

# Patterns that indicate a prompt injection attempt
_INJECTION_PATTERN = re.compile(
    r"""(
        ignore\s+(all\s+)?(previous|prior|above)   # "ignore previous instructions"
        | forget\s+(all\s+)?(previous|prior|above)
        | \bsystem\s*:                              # "system:"
        | \buser\s*:                                # "user:"
        | \bassistant\s*:                           # "assistant:"
        | <\s*/?\s*(SYS|INST|s)\s*>               # Llama 2/3 control tokens
        | \[/?INST\]                               # Llama 2 instruction markers
        | <<SYS>>                                  # Llama 2 system block
        | \bDAN\b                                  # "Do Anything Now" jailbreak
        | \bprompt\s+injection\b
        | you\s+are\s+now                          # "you are now DAN"
        | act\s+as\s+(if\s+you\s+)?a\b             # "act as a ..."
        | \bdisregard\b
        | \boverride\b
    )""",
    re.IGNORECASE | re.VERBOSE,
)

# Control characters (except normal whitespace)
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _strip_control(value: str) -> str:
    return _CONTROL_CHARS.sub("", value)


def sanitize_card_name(value: str) -> str:
    """Clean a single card name. Returns empty string if value looks like an injection attempt."""
    if not isinstance(value, str):
        return ""
    value = _strip_control(value).strip()
    value = value[:MAX_CARD_NAME_LEN]
    if _INJECTION_PATTERN.search(value):
        return ""
    return value


def sanitize_format_name(value: Optional[str]) -> Optional[str]:
    """Validate format_name against an allowlist; returns None if unknown."""
    if not value:
        return None
    value = _strip_control(str(value)).strip().lower()[:MAX_FORMAT_NAME_LEN]
    return value if value in ALLOWED_FORMATS else None


def sanitize_locale(value: Optional[str]) -> str:
    """Validate locale; returns 'en' as safe default if unrecognised."""
    if not value:
        return "en"
    value = _strip_control(str(value)).strip().lower()[:8]
    return value if value in ALLOWED_LOCALES else "en"


def sanitize_archetype(value: str) -> str:
    """Clean a single archetype name."""
    if not isinstance(value, str):
        return ""
    value = _strip_control(value).strip()[:MAX_ARCHETYPE_LEN]
    if _INJECTION_PATTERN.search(value):
        return ""
    return value


def sanitize_archetypes(values: Optional[list]) -> list:
    """Clean a list of meta archetypes, removing empty/injected entries."""
    if not values:
        return []
    cleaned = [sanitize_archetype(v) for v in values[:MAX_ARCHETYPES_COUNT]]
    return [v for v in cleaned if v]
