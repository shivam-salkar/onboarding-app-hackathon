"""
Document verification router.
Accepts base64 image and returns extracted fields for Aadhaar or PAN.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.ocr import extract_document
from utils.validators import (
    validate_pan_format,
    validate_aadhaar_format,
    verify_pan_surepass,
    verify_aadhaar_surepass,
    verify_aadhaar_otp_surepass,
)

router = APIRouter()


class DocumentRequest(BaseModel):
    image: str  # base64 data URL or raw base64
    government_verify: bool = False  # Set True to call Surepass API


class AadhaarOTPRequest(BaseModel):
    client_id: str
    otp: str


@router.post("/verify-document")
async def verify_document(req: DocumentRequest):
    """
    Extract and validate fields from an Aadhaar or PAN card image.
    
    - Runs EasyOCR (English + Hindi) on the image.
    - Detects document type automatically.
    - Validates format (PAN: ABCDE1234F, Aadhaar: 12 digits).
    - Optionally calls Surepass government API if `government_verify=True`.
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

        if req.government_verify and pan and result["format_valid"]:
            govt_result = await verify_pan_surepass(pan)
            result["government_verification"] = govt_result
            # Merge name from govt if our OCR missed it
            if not result.get("name") and govt_result.get("name"):
                result["name"] = govt_result["name"]

    elif doc_type == "aadhaar":
        aadhaar = extracted.get("aadhaar_number")
        result["format_valid"] = validate_aadhaar_format(aadhaar) if aadhaar else False

        if req.government_verify and aadhaar and result["format_valid"]:
            # Step 1: Generate OTP (returns client_id for step 2)
            govt_result = await verify_aadhaar_surepass(aadhaar)
            result["government_verification"] = govt_result

    else:
        result["format_valid"] = False

    return result


@router.post("/verify-aadhaar-otp")
async def verify_aadhaar_otp(req: AadhaarOTPRequest):
    """
    Step 2 of Aadhaar government verification.
    Submit the OTP received on the Aadhaar-linked mobile number.
    """
    result = await verify_aadhaar_otp_surepass(req.client_id, req.otp)
    return result
