"""
PII Redaction Service
Detects and tokenizes sensitive personal information before it reaches the AI.
Handles Indian-specific PII formats: Aadhaar, PAN, phone numbers, etc.
"""
import re

# ──────────────────────────────────────────────
#  Internal counter (per-request, reset each call)
# ──────────────────────────────────────────────
def _next_token(category: str, counter: dict) -> str:
    counter[category] = counter.get(category, 0) + 1
    return f"[{category}_{counter[category]}]"


# ──────────────────────────────────────────────
#  PII Patterns  (Indian context + universal)
# ──────────────────────────────────────────────
PII_PATTERNS = [
    # Aadhaar: 12 digits optionally separated by spaces/dashes
    ("AADHAAR", r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b"),

    # PAN Card: ABCDE1234F format
    ("PAN", r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"),

    # Voter ID: ABC1234567
    ("VOTER_ID", r"\b[A-Z]{3}[0-9]{7}\b"),

    # Passport: A1234567
    ("PASSPORT", r"\b[A-PR-WYa-pr-wy][1-9]\d{7}\b"),

    # IFSC Code: SBIN0001234
    ("IFSC", r"\b[A-Z]{4}0[A-Z0-9]{6}\b"),

    # Indian phone: +91, 0 prefix, or plain 10-digit starting with 6-9
    ("PHONE", r"(\+91[\s\-]?|0)?[6-9]\d{9}\b"),

    # Email address
    ("EMAIL", r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),

    # Bank account numbers (9–18 digits, standalone)
    ("BANK_ACC", r"(?<!\d)\d{9,18}(?!\d)"),

    # GST number: 22AAAAA0000A1Z5
    ("GST", r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b"),

    # UPI ID: name@bank
    ("UPI", r"\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b"),

    # Date of birth patterns: DD/MM/YYYY or DD-MM-YYYY
    ("DOB", r"\b(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](19|20)\d{2}\b"),

    # Pincode: 6-digit Indian PIN
    ("PINCODE", r"\b[1-9][0-9]{5}\b"),
]


def redact_pii(text: str) -> tuple[str, dict]:
    """
    Scan text and replace PII with anonymous tokens.
    Returns (redacted_text, token_map) where token_map maps token → original value.
    The token_map is sent back to the client (browser) only; server never stores it.
    """
    counter: dict = {}
    token_map: dict = {}

    for category, pattern in PII_PATTERNS:
        def replace_match(m, cat=category, internal_cnt=counter):
            token = _next_token(cat, internal_cnt)
            token_map[token] = m.group(0)
            return token

        text = re.sub(pattern, replace_match, text)

    return text, token_map


def get_redaction_summary(token_map: dict) -> dict:
    """Return a count of each PII type found (for UI display)."""
    summary: dict = {}
    for token in token_map:
        # Token format: [CATEGORY_N]
        category = token.strip("[]").rsplit("_", 1)[0]
        summary[category] = summary.get(category, 0) + 1
    return summary
