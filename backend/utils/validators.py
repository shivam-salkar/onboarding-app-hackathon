"""
Validators for Aadhaar and PAN numbers.
Also includes Surepass API wrapper for government verification (optional).
"""
import re
import os
import httpx
from typing import Optional


PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
AADHAAR_PATTERN = re.compile(r"^\d{12}$")

# Surepass token — set SUREPASS_TOKEN in .env for real government verification
SUREPASS_TOKEN = os.getenv("SUREPASS_TOKEN", "")
SUREPASS_BASE = "https://kyc-api.surepass.io/api/v1"


def validate_pan_format(pan: str) -> bool:
    return bool(PAN_PATTERN.match(pan.replace(" ", "").upper()))


def validate_aadhaar_format(aadhaar: str) -> bool:
    digits = re.sub(r"\D", "", aadhaar)
    return bool(AADHAAR_PATTERN.match(digits))


async def verify_pan_surepass(pan: str) -> dict:
    """
    Verify PAN with Surepass government API.
    Returns name, status, category from the Income Tax dept.
    Requires SUREPASS_TOKEN in .env
    See: https://dashboard.surepass.io/
    """
    if not SUREPASS_TOKEN:
        return {"verified": False, "reason": "SUREPASS_TOKEN not configured", "source": "mock"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUREPASS_BASE}/pan",
            headers={"Authorization": f"Bearer {SUREPASS_TOKEN}"},
            json={"id_number": pan.upper()},
        )
    if resp.status_code == 200:
        data = resp.json().get("data", {})
        return {
            "verified": True,
            "name": data.get("full_name"),
            "category": data.get("category"),
            "pan_status": data.get("pan_status"),
            "source": "surepass",
        }
    return {"verified": False, "reason": resp.text, "source": "surepass"}


async def verify_aadhaar_surepass(aadhaar: str) -> dict:
    """
    Aadhaar OTP-based verification via Surepass.
    Step 1: Send OTP. Step 2: Verify OTP.
    For the hackathon we just do OCR-based extraction (no OTP flow).
    """
    if not SUREPASS_TOKEN:
        return {"verified": False, "reason": "SUREPASS_TOKEN not configured", "source": "mock"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUREPASS_BASE}/aadhaar-v2/generate-otp",
            headers={"Authorization": f"Bearer {SUREPASS_TOKEN}"},
            json={"id_number": re.sub(r"\D", "", aadhaar)},
        )
    if resp.status_code == 200:
        data = resp.json().get("data", {})
        return {
            "verified": False,  # needs OTP step — see /kyc/verify-aadhaar-otp
            "client_id": data.get("client_id"),
            "message": "OTP sent to Aadhaar-linked mobile",
            "source": "surepass",
        }
    return {"verified": False, "reason": resp.text, "source": "surepass"}


async def verify_aadhaar_otp_surepass(client_id: str, otp: str) -> dict:
    """Complete Aadhaar verification with OTP."""
    if not SUREPASS_TOKEN:
        return {"verified": False, "reason": "SUREPASS_TOKEN not configured"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"{SUREPASS_BASE}/aadhaar-v2/submit-otp",
            headers={"Authorization": f"Bearer {SUREPASS_TOKEN}"},
            json={"client_id": client_id, "otp": otp},
        )
    if resp.status_code == 200:
        d = resp.json().get("data", {})
        return {
            "verified": True,
            "name": d.get("full_name"),
            "dob": d.get("dob"),
            "gender": d.get("gender"),
            "address": d.get("address"),
            "photo": d.get("profile_image"),  # base64 photo from UIDAI
            "source": "surepass",
        }
    return {"verified": False, "reason": resp.text, "source": "surepass"}
