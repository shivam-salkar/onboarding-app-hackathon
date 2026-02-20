"""
Format validators for Aadhaar and PAN numbers.
Government verification is handled by GPT-4o Vision — no external API needed.
"""
import re


PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
AADHAAR_PATTERN = re.compile(r"^\d{12}$")


def validate_pan_format(pan: str) -> bool:
    return bool(PAN_PATTERN.match(pan.replace(" ", "").upper()))


def validate_aadhaar_format(aadhaar: str) -> bool:
    digits = re.sub(r"\D", "", aadhaar)
    return bool(AADHAAR_PATTERN.match(digits))
