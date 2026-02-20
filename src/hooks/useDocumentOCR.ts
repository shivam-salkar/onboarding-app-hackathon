'use client';

import { useState, useCallback } from 'react';

export type DocType = 'pan' | 'aadhaar' | 'unknown';

export interface OCRResult {
  rawText: string;
  docType: DocType;
  extractedId: string | null;
  extractedName: string | null;
  confidence: number;
}

const PAN_REGEX = /[A-Z]{5}[0-9]{4}[A-Z]/;
const AADHAAR_REGEX = /\d{4}\s?\d{4}\s?\d{4}/;

function detectDocType(text: string): DocType {
  const upper = text.toUpperCase();

  // PAN card indicators
  const panIndicators = ['INCOME TAX', 'PERMANENT ACCOUNT', 'PAN', 'GOVT. OF INDIA', 'GOVT OF INDIA'];
  const hasPanIndicator = panIndicators.some((k) => upper.includes(k));
  const hasPanNumber = PAN_REGEX.test(upper);

  if (hasPanIndicator || hasPanNumber) return 'pan';

  // Aadhaar card indicators
  const aadhaarIndicators = ['UIDAI', 'AADHAAR', 'AADHAR', 'UNIQUE IDENTIFICATION', 'GOVERNMENT OF INDIA', 'ENROLMENT'];
  const hasAadhaarIndicator = aadhaarIndicators.some((k) => upper.includes(k));
  const hasAadhaarNumber = AADHAAR_REGEX.test(text);

  if (hasAadhaarIndicator || hasAadhaarNumber) return 'aadhaar';

  return 'unknown';
}

function extractPanNumber(text: string): string | null {
  const match = text.toUpperCase().match(PAN_REGEX);
  return match ? match[0] : null;
}

function extractAadhaarNumber(text: string): string | null {
  const match = text.match(AADHAAR_REGEX);
  return match ? match[0].replace(/\s/g, '') : null;
}

function extractName(text: string, docType: DocType): string | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  if (docType === 'pan') {
    // On PAN cards, name usually appears after "Name" label
    for (let i = 0; i < lines.length; i++) {
      if (/name/i.test(lines[i]) && i + 1 < lines.length) {
        const candidate = lines[i + 1].trim();
        if (candidate.length > 2 && /^[A-Z\s]+$/i.test(candidate)) {
          return candidate;
        }
      }
    }
  }

  if (docType === 'aadhaar') {
    // Aadhaar: look for lines that are purely alphabetic names
    for (const line of lines) {
      if (/^[A-Za-z\s]{3,}$/.test(line) && !/uidai|government|india|male|female|enrolment/i.test(line)) {
        return line;
      }
    }
  }

  return null;
}

export function useDocumentOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const recognizeDocument = useCallback(async (imageDataUrl: string): Promise<OCRResult> => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Dynamic import so tesseract WASM is only loaded when needed
      const Tesseract = await import('tesseract.js');

      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const rawText = result.data.text;
      const confidence = result.data.confidence;
      const docType = detectDocType(rawText);

      let extractedId: string | null = null;
      if (docType === 'pan') extractedId = extractPanNumber(rawText);
      if (docType === 'aadhaar') extractedId = extractAadhaarNumber(rawText);

      const extractedName = extractName(rawText, docType);

      return { rawText, docType, extractedId, extractedName, confidence };
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  }, []);

  return { recognizeDocument, isProcessing, progress };
}
