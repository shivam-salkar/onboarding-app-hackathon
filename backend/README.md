# KYC Verification Backend

Python + FastAPI backend for real Aadhaar/PAN OCR extraction and selfie face-matching.

## Architecture

```
/api/backend/full-verify   ← Next.js proxy → Python FastAPI
                                              ↓
                                    EasyOCR (Aadhaar + PAN)
                                    DeepFace (Selfie vs Doc)
                                    Surepass (Govt API, optional)
```

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Backend runs at: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/kyc/verify-document` | Extract Aadhaar or PAN fields from a card image |
| POST | `/kyc/verify-face` | Compare selfie vs document photo (DeepFace) |
| POST | `/kyc/full-verify` | Full pipeline: Aadhaar OCR + PAN OCR + Face Match |
| POST | `/kyc/verify-aadhaar-otp` | Step 2 of govt Aadhaar OTP verification (Surepass) |

## What gets extracted

### Aadhaar
- Aadhaar number (12-digit, formatted)
- Full name
- Date of birth
- Gender
- Address
- Pincode

### PAN  
- PAN number (ABCDE1234F format)
- Full name
- Father's name
- Date of birth

### Face Match
- Verified (bool)
- Confidence % (0–99)
- Distance + threshold (Facenet512 cosine)

## External API: Surepass (Optional)

For **real government PAN verification** (name from Income Tax Dept):

1. Sign up at https://dashboard.surepass.io/ — free tier available
2. Copy your API token
3. Set `SUREPASS_TOKEN=your_token` in `backend/.env`
4. Call `/kyc/verify-document` with `"government_verify": true`

For Aadhaar, the Surepass flow is OTP-based (requires user's Aadhaar-linked phone). Without the token, OCR extraction still works well.

## Deployment

### Railway (recommended, 1-click)
```bash
railway login
railway init
railway up
```
Set env vars in Railway dashboard and update `BACKEND_URL` in Vercel.

### Docker
```bash
docker build -t kyc-backend .
docker run -p 8000:8000 --env-file .env kyc-backend
```

### Render
Add a new **Web Service**, point to the `backend/` directory, set build command to `pip install -r requirements.txt`, start command to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
