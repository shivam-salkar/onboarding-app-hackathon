"""
OCR utilities using EasyOCR.
Handles extraction from Aadhaar and PAN cards.
"""
import re
import base64
import io
from typing import Optional
from PIL import Image
import numpy as np
import easyocr

# Lazy-loaded reader to avoid blocking startup
_reader: Optional[easyocr.Reader] = None


def get_reader() -> easyocr.Reader:
    """Return a singleton EasyOCR reader (loads model on first call)."""
    global _reader
    if _reader is None:
        # English + Hindi — covers all 3 target langs (Marathi uses Devanagari = Hindi model)
        _reader = easyocr.Reader(["en", "hi"], gpu=False)
    return _reader


def base64_to_image(b64: str) -> np.ndarray:
    """Convert a base64 data-URL or raw base64 string to a numpy array."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    img_bytes = base64.b64decode(b64)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img)


def base64_to_pil(b64: str) -> Image.Image:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


def run_ocr(image: np.ndarray) -> list[str]:
    """Run EasyOCR and return a flat list of detected text lines."""
    reader = get_reader()
    results = reader.readtext(image, detail=0, paragraph=False)
    return [r.strip() for r in results if r.strip()]


# ─── Regex patterns ──────────────────────────────────────────────────────────

PAN_REGEX = re.compile(r"[A-Z]{5}[0-9]{4}[A-Z]")
AADHAAR_REGEX = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
DOB_REGEX = re.compile(
    r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\b"
    r"|\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b",
    re.IGNORECASE,
)
GENDER_REGEX = re.compile(r"\b(male|female|transgender|पुरुष|महिला|स्त्री)\b", re.IGNORECASE)
PINCODE_REGEX = re.compile(r"\b\d{6}\b")


# ─── Aadhaar Extraction ───────────────────────────────────────────────────────

AADHAAR_INDICATORS = [
    "uidai", "aadhaar", "aadhar", "unique identification",
    "government of india", "enrollment", "enrolment",
]

PAN_INDICATORS = [
    "income tax", "permanent account", "pan", "govt. of india",
    "govt of india", "income tax department",
]


def detect_doc_type(lines: list[str]) -> str:
    text = " ".join(lines).lower()
    if any(ind in text for ind in PAN_INDICATORS):
        return "pan"
    if PAN_REGEX.search(text.upper()):
        return "pan"
    if any(ind in text for ind in AADHAAR_INDICATORS):
        return "aadhaar"
    if AADHAAR_REGEX.search(text):
        return "aadhaar"
    return "unknown"


def extract_aadhaar_details(lines: list[str]) -> dict:
    full_text = "\n".join(lines)

    # Aadhaar number
    aadhaar_match = AADHAAR_REGEX.search(full_text)
    aadhaar_number = aadhaar_match.group().replace(" ", "") if aadhaar_match else None
    if aadhaar_number:
        # Format as XXXX XXXX XXXX
        aadhaar_number = f"{aadhaar_number[:4]} {aadhaar_number[4:8]} {aadhaar_number[8:12]}"

    # DOB
    dob = None
    dob_match = DOB_REGEX.search(full_text)
    if dob_match:
        dob = dob_match.group()

    # Gender
    gender = None
    gender_match = GENDER_REGEX.search(full_text)
    if gender_match:
        gender = gender_match.group().lower()
        # Normalize Hindi
        if gender in ("पुरुष",):
            gender = "male"
        elif gender in ("महिला", "स्त्री"):
            gender = "female"

    # Name: On Aadhaar, name is usually printed in Roman/Devanagari
    # Heuristic: first alphabetic-only line that isn't a label
    skip_keywords = {
        "uidai", "government", "india", "aadhaar", "aadhar", "male", "female",
        "dob", "year", "address", "enrollment", "district", "state", "pin",
        "पुरुष", "महिला", "भारत", "आधार",
    }
    name = None
    for line in lines:
        clean = line.strip()
        if (
            3 < len(clean) < 50
            and re.match(r"^[A-Za-z\u0900-\u097F\s\.]+$", clean)
            and not any(kw in clean.lower() for kw in skip_keywords)
            and not re.search(r"\d", clean)
        ):
            name = clean
            break

    # Address: lines after a line containing "address" or "पता" or after the Aadhaar number
    address_lines = []
    capture = False
    for line in lines:
        if re.search(r"\baddress\b|\bपता\b|s/o|w/o|c/o|d/o|house|flat|village|plot", line, re.IGNORECASE):
            capture = True
        if capture:
            address_lines.append(line)
            if len(address_lines) >= 4:
                break
    address = ", ".join(address_lines) if address_lines else None

    # Pincode from address area
    pincode = None
    pincode_match = PINCODE_REGEX.search(full_text)
    if pincode_match:
        pincode = pincode_match.group()

    return {
        "doc_type": "aadhaar",
        "aadhaar_number": aadhaar_number,
        "name": name,
        "dob": dob,
        "gender": gender,
        "address": address,
        "pincode": pincode,
    }


def extract_pan_details(lines: list[str]) -> dict:
    full_text = "\n".join(lines)
    upper_text = full_text.upper()

    # PAN number
    pan_match = PAN_REGEX.search(upper_text)
    pan_number = pan_match.group() if pan_match else None

    # DOB on PAN
    dob = None
    dob_match = DOB_REGEX.search(full_text)
    if dob_match:
        dob = dob_match.group()

    # Name on PAN: appears after the "Name" label
    name = None
    father_name = None
    for i, line in enumerate(lines):
        if re.search(r"\bname\b", line, re.IGNORECASE) and i + 1 < len(lines):
            candidate = lines[i + 1].strip()
            if re.match(r"^[A-Z\s\.]{2,}$", candidate.upper()):
                if name is None:
                    name = candidate
                elif father_name is None:
                    father_name = candidate

    # Fallback: first ALL-CAPS alphabetic line
    if name is None:
        for line in lines:
            clean = line.strip()
            if (
                3 < len(clean) < 50
                and re.match(r"^[A-Z\s\.]+$", clean)
                and "INCOME" not in clean
                and "GOVERNMENT" not in clean
                and "PERMANENT" not in clean
            ):
                name = clean
                break

    return {
        "doc_type": "pan",
        "pan_number": pan_number,
        "name": name,
        "father_name": father_name,
        "dob": dob,
    }


def extract_document(image_b64: str) -> dict:
    """Main entry: detect document type and extract all fields."""
    img = base64_to_image(image_b64)
    lines = run_ocr(img)
    doc_type = detect_doc_type(lines)

    if doc_type == "aadhaar":
        result = extract_aadhaar_details(lines)
    elif doc_type == "pan":
        result = extract_pan_details(lines)
    else:
        result = {"doc_type": "unknown"}

    result["raw_text"] = lines
    result["confidence"] = _estimate_confidence(lines, doc_type)
    return result


def _estimate_confidence(lines: list[str], doc_type: str) -> int:
    """Simple confidence heuristic based on how many key fields were detected."""
    if doc_type == "unknown":
        return 0
    full = " ".join(lines).lower()
    hits = 0
    if doc_type == "aadhaar":
        checks = ["uidai", "aadhaar", r"\d{4}\s?\d{4}\s?\d{4}"]
    else:
        checks = ["income tax", "permanent account", r"[A-Z]{5}\d{4}[A-Z]"]
    for c in checks:
        if re.search(c, full, re.IGNORECASE):
            hits += 1
    return min(60 + hits * 13, 95)
