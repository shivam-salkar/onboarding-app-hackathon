"""
Face matching utilities using DeepFace.
Compares selfie photo against the photo on the document (Aadhaar/PAN).
"""
import base64
import io
import os
import tempfile
from typing import Optional
import numpy as np
from PIL import Image


def _pil_to_temp_file(img: Image.Image, suffix=".jpg") -> str:
    """Save PIL image to a temp file and return its path (DeepFace needs file paths)."""
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    img.save(tmp.name, format="JPEG")
    tmp.close()
    return tmp.name


def b64_to_pil(b64: str) -> Image.Image:
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


def compare_faces(selfie_b64: str, document_b64: str) -> dict:
    """
    Compare a selfie image against a document image using DeepFace.
    Returns distance, threshold, verified flag, and confidence %.
    
    Models tried in order (fastest → most accurate):
      1. Facenet512 (best accuracy for Indian faces)
      2. VGG-Face (fallback)
    """
    try:
        from deepface import DeepFace  # lazy import — heavy dependency
    except ImportError:
        return {
            "verified": False,
            "error": "deepface not installed",
            "confidence": 0,
        }

    selfie_img = b64_to_pil(selfie_b64)
    doc_img = b64_to_pil(document_b64)

    selfie_path = _pil_to_temp_file(selfie_img)
    doc_path = _pil_to_temp_file(doc_img)

    try:
        result = DeepFace.verify(
            img1_path=selfie_path,
            img2_path=doc_path,
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False,  # don't raise if face not found
            distance_metric="cosine",
        )

        distance: float = result["distance"]
        threshold: float = result["threshold"]
        verified: bool = result["verified"]

        # Convert distance to a human-readable similarity %
        # cosine distance of 0 = identical, threshold ~0.30 for Facenet512
        similarity_pct = max(0, round((1 - distance / max(threshold * 2, 0.001)) * 100))

        return {
            "verified": verified,
            "distance": round(distance, 4),
            "threshold": round(threshold, 4),
            "confidence": min(similarity_pct, 99),
            "model": "Facenet512",
        }

    except Exception as e:
        # Fallback: try with VGG-Face
        try:
            result = DeepFace.verify(
                img1_path=selfie_path,
                img2_path=doc_path,
                model_name="VGG-Face",
                detector_backend="opencv",
                enforce_detection=False,
                distance_metric="cosine",
            )
            distance = result["distance"]
            threshold = result["threshold"]
            verified = result["verified"]
            similarity_pct = max(0, round((1 - distance / max(threshold * 2, 0.001)) * 100))
            return {
                "verified": verified,
                "distance": round(distance, 4),
                "threshold": round(threshold, 4),
                "confidence": min(similarity_pct, 99),
                "model": "VGG-Face",
            }
        except Exception as e2:
            return {
                "verified": False,
                "error": str(e2),
                "confidence": 0,
            }
    finally:
        # Clean up temp files
        for path in [selfie_path, doc_path]:
            try:
                os.unlink(path)
            except Exception:
                pass
