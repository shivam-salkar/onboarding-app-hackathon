"""
Document OCR using GPT-4o Vision.
Sends the card image to GPT-4o and asks it to extract structured fields.
Handles Aadhaar, PAN, and any other Indian identity documents in any language.
"""
import re
import base64
import io
import os
import json
from PIL import Image
from openai import OpenAI

_client: OpenAI | None = None

AADHAAR_PROMPT = """You are an expert at reading Indian Aadhaar identity cards.
Extract all text visible on this Aadhaar card and return a JSON object with these fields:
- doc_type: always "aadhaar"
- name: Full name as printed (Roman script preferred)
- aadhaar_number: The 12-digit Aadhaar number (format: "XXXX XXXX XXXX")
- dob: Date of birth (e.g. "01/01/1990")
- gender: "male", "female", or "other"
- address: Full address if visible
- pincode: 6-digit pin code if visible

Return ONLY a valid JSON object. Use null for missing fields."""

PAN_PROMPT = """You are an expert at reading Indian PAN (Permanent Account Number) cards.
Extract all text visible on this PAN card and return a JSON object with these fields:
- doc_type: always "pan"
- name: Full name of the card holder (all caps, Roman script)
- father_name: Father's name as printed
- pan_number: The 10-character PAN (e.g. "ABCDE1234F")
- dob: Date of birth (e.g. "01/01/1990")

Return ONLY a valid JSON object. Use null for missing fields."""

GENERIC_PROMPT = """You are an expert at reading Indian identity documents.
Determine if this image is an Aadhaar card or PAN card, then extract all visible fields:
- doc_type: "aadhaar", "pan", or "unknown"
- name: Full name
- aadhaar_number: 12-digit number (if Aadhaar, format: "XXXX XXXX XXXX")
- pan_number: 10-char PAN (if PAN card, e.g. "ABCDE1234F")
- father_name: Father's name (if PAN)
- dob: Date of birth
- gender: male/female/other (if visible)
- address: Full address (if Aadhaar)
- pincode: 6-digit pin (if visible)

Return ONLY a valid JSON object. Use null for missing fields."""



def get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY not set")
        _client = OpenAI(api_key=api_key)
    return _client


def _optimize_image(b64: str, max_size: int = 1024) -> str:
    """Resize to max_size on its longest edge and re-encode as JPEG to save tokens."""
    if "," in b64:
        prefix, raw = b64.split(",", 1)
    else:
        prefix, raw = "data:image/jpeg;base64", b64

    img = Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
    w, h = img.size
    if max(w, h) > max_size:
        ratio = max_size / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def _call_gpt4o(image_b64: str, prompt: str) -> dict:
    """Send image + prompt to GPT-4o and parse the returned JSON."""
    client = get_client()
    optimized = _optimize_image(image_b64)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": optimized, "detail": "high"},
                    },
                ],
            }
        ],
        max_tokens=500,
        temperature=0,
    )

    raw = (response.choices[0].message.content or "").strip()
    # Strip markdown fences GPT sometimes wraps around JSON
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"doc_type": "unknown", "error": "failed to parse GPT-4o response"}


def extract_document(image_b64: str) -> dict:
    """
    Main entry — extract all fields from an Aadhaar or PAN card using GPT-4o Vision.
    A generic call first determines doc type; then a specialized prompt is used for
    higher accuracy.
    """
    # First pass: detect doc type
    result = _call_gpt4o(image_b64, GENERIC_PROMPT)
    doc_type = result.get("doc_type", "unknown")

    # Second pass with specialized prompt for better field accuracy
    if doc_type == "aadhaar":
        result = _call_gpt4o(image_b64, AADHAAR_PROMPT)
    elif doc_type == "pan":
        result = _call_gpt4o(image_b64, PAN_PROMPT)

    # Normalize Aadhaar number spacing
    aadhaar_raw = result.get("aadhaar_number")
    if aadhaar_raw:
        digits = re.sub(r"\D", "", str(aadhaar_raw))
        if len(digits) == 12:
            result["aadhaar_number"] = f"{digits[:4]} {digits[4:8]} {digits[8:12]}"

    # Normalize PAN to uppercase, no spaces
    pan_raw = result.get("pan_number")
    if pan_raw:
        result["pan_number"] = re.sub(r"\s", "", str(pan_raw)).upper()

    result["confidence"] = _estimate_confidence(result)
    result["raw_text"] = []  # GPT doesn't return raw lines; kept for schema compat
    return result


def _estimate_confidence(data: dict) -> int:
    doc_type = data.get("doc_type", "unknown")
    if doc_type == "unknown":
        return 0
    fields = ["name", "aadhaar_number", "dob", "gender"] if doc_type == "aadhaar" else ["name", "pan_number", "dob"]
    filled = sum(1 for f in fields if data.get(f))
    return min(60 + int((filled / len(fields)) * 35), 95)
