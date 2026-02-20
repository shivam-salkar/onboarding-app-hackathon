"""
Document verification router.
Accepts base64 image and returns extracted fields for Aadhaar or PAN.
OCR is handled by GPT-4o Vision — no local models or external KYC APIs needed.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.ocr import extract_document
from utils.validators import validate_pan_format, validate_aadhaar_format

router = APIRouter()


class DocumentRequest(BaseModel):
    image: str  # base64 data URL or raw base64


@router.post("/verify-document")
async def verify_document(req: DocumentRequest):
    """
    Extract and validate fields from an Aadhaar or PAN card image.

    - Sends the image to GPT-4o Vision for intelligent OCR.
    - Detects document type automatically.
    - Validates format (PAN: ABCDE1234F pattern, Aadhaar: 12 digits).
    - Returns all extracted fields with a confidence score.
    """
    try:
        extracted = extract_document(req.image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")

    doc_type = extracted.get("doc_type", "unknown")
    result = {**extracted}

    if doc_type == "pan":
        pan = extracted.get("pan_number")
        result["format_valid"] = validate_pan_format(pan) if pan else False
    elif doc_type == "aadhaar":
        aadhaar = extracted.get("aadhaar_number")
        result["format_valid"] = validate_aadhaar_format(aadhaar) if aadhaar else False
    else:
        result["format_valid"] = False

    return result

