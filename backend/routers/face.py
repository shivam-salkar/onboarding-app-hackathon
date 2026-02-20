"""
Face matching router.
Compares a selfie with the photo on a document (Aadhaar/PAN).
Uses DeepFace locally — no API key required.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from utils.face import compare_faces

router = APIRouter()


class FaceMatchRequest(BaseModel):
    selfie: str        # base64 data URL or raw base64
    document: str      # base64 data URL or raw base64


@router.post("/verify-face")
def verify_face(req: FaceMatchRequest):
    """
    Compare a selfie photo to the photo on an Aadhaar/PAN card.
    
    - Uses DeepFace with the Facenet512 model (best accuracy for Indian faces).
    - Returns: verified (bool), distance, threshold, confidence (0–99%).
    - `enforce_detection=False` so it still runs even if the face is small/blurry.
    
    Recommended confidence threshold: >= 60% for a match.
    """
    result = compare_faces(req.selfie, req.document)
    return result
