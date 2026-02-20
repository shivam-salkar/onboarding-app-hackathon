from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from routers import document, face, kyc


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 KYC Backend starting up...")
    yield
    print("🛑 KYC Backend shutting down...")


app = FastAPI(
    title="KYC Verification Backend",
    description="AI-powered KYC backend: OCR extraction for Aadhaar/PAN + face matching selfie vs document.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document.router, prefix="/kyc", tags=["Document OCR"])
app.include_router(face.router, prefix="/kyc", tags=["Face Matching"])
app.include_router(kyc.router, prefix="/kyc", tags=["Full KYC Pipeline"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "kyc-backend"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
