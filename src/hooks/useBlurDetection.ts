'use client';

import { useCallback } from 'react';

interface QualityResult {
  isAcceptable: boolean;
  sharpnessScore: number;
  brightnessScore: number;
  issue: 'blur' | 'dark' | 'bright' | null;
}

/**
 * Computes image sharpness using Laplacian variance on grayscale pixel data.
 * Higher variance = sharper image.
 */
function computeLaplacianVariance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);

  // Convert to grayscale
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Apply Laplacian kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
  let sum = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        gray[idx - width] +
        gray[idx - 1] +
        -4 * gray[idx] +
        gray[idx + 1] +
        gray[idx + width];
      sum += laplacian * laplacian;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Computes average brightness (0-255) from pixel data.
 */
function computeBrightness(imageData: ImageData): number {
  const { data } = imageData;
  let sum = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  return sum / pixelCount;
}

// Thresholds tuned for typical phone camera captures
const SHARPNESS_THRESHOLD = 50;
const BRIGHTNESS_MIN = 40;
const BRIGHTNESS_MAX = 220;

export function useBlurDetection() {
  const analyzeImage = useCallback((dataUrl: string): Promise<QualityResult> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Downscale for faster analysis
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ isAcceptable: false, sharpnessScore: 0, brightnessScore: 0, issue: null });
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const sharpnessScore = computeLaplacianVariance(imageData);
        const brightnessScore = computeBrightness(imageData);

        let issue: QualityResult['issue'] = null;
        if (sharpnessScore < SHARPNESS_THRESHOLD) issue = 'blur';
        else if (brightnessScore < BRIGHTNESS_MIN) issue = 'dark';
        else if (brightnessScore > BRIGHTNESS_MAX) issue = 'bright';

        resolve({
          isAcceptable: issue === null,
          sharpnessScore: Math.round(sharpnessScore),
          brightnessScore: Math.round(brightnessScore),
          issue,
        });
      };
      img.src = dataUrl;
    });
  }, []);

  return { analyzeImage };
}
