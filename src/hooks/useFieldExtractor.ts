'use client';

import { useEffect, useRef } from 'react';
import { FieldKey, useOnboarding } from '@/providers/OnboardingProvider';

// Regex patterns for field extraction
const patterns = {
  // Name: Allow specific phrases OR just free text if it looks like a name
  name: [
    /(?:my name is|i am|i'm|this is)\s+([a-zA-Z\s]{2,40})/i,
    /(?:mera naam|mera name)\s+([\u0900-\u097F\sa-zA-Z]{2,40})/i, // Hindi
    /(?:माझे नाव|माझं नाव)\s+([\u0900-\u097F\s]{2,40})/i, // Marathi
    // Catch-all for name if nothing else matches and it looks like words
    // Just grab the whole transcript if it's solely characters and spaces (3-40 chars)
    /^([a-zA-Z\s.]{3,40})$/,
  ],
  // DOB: dates like DD/MM/YYYY, DD-MM-YYYY, spoken dates
  dob: [
    /(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{2,4})/,
    // Flexible spoken date: "20th January 2000" or "January 20 2000"
    /(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{2,4})/i,
    // Hindi/Marathi date phrases
    /(?:जन्म तिथि|जन्मतारीख)\s+([\d\s/\-\.]+)/i,
  ],
  // PAN: ABCDE1234F format
  pan: [
    // Standard format with optional spaces
    /([A-Z]{5}\s*\d{4}\s*[A-Z])/i,
    // Spoken loose format (phonetic? just chars for now)
    /(?:pan|number)\s*([a-z0-9\s]{10,15})/i, 
  ],
  // Aadhaar: 12 digits (possibly with spaces)
  aadhaar: [
    /(\d{4}\s*\d{4}\s*\d{4})/,
    /(\d{12})/,
    /(?:aadhaar|number)\s*(\d[\d\s]{11,15})/i,
  ],
};

const fieldOrder: FieldKey[] = ['name', 'dob', 'pan', 'aadhaar'];

export function useFieldExtractor(transcript: string, interimTranscript: string, clearTranscript?: () => void) {
  const { data, setField, setActiveField, activeField } = useOnboarding();
  const lastTranscriptRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout Logic: If activeField is focused for >12s without filling, skip it.
  useEffect(() => {
    if (activeField && !data[activeField]) {
      // Clear any existing timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Start new 12s timeout
      timeoutRef.current = setTimeout(() => {
        setField(activeField, 'Not Recognized');
        if (clearTranscript) {
          clearTranscript();
          lastTranscriptRef.current = '';
        }
      }, 12000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeField, data, setField, clearTranscript]);

  useEffect(() => {
    let fullText = transcript + ' ' + interimTranscript;
    if (fullText === lastTranscriptRef.current) return;
    lastTranscriptRef.current = fullText;

    // Only process the ACTIVE field to avoid confusion
    if (activeField && !data[activeField]) {
      const fieldPatterns = patterns[activeField];
      for (const pattern of fieldPatterns) {
        // Check regex against full text
        const match = fullText.match(pattern);
        if (match && match[1]) {
          let value = match[1].trim();

          // Validation & Formatting
          if (activeField === 'pan') {
            value = value.replace(/[\s-]/g, '').toUpperCase();
            if (value.length !== 10) return; // Strict length check
          } else if (activeField === 'aadhaar') {
            const digits = value.replace(/\D/g, '');
            if (digits.length !== 12) return; // Strict length check
            value = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
          } else if (activeField === 'name') {
            // Capitalize
            value = value
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
          }

          // Commit value
          setField(activeField, value);
          
          // Clear transcript for next field
          if (clearTranscript) {
            clearTranscript();
            lastTranscriptRef.current = '';
          }
          // Clear timeout since we succeeded
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          return;
        }
      }
    }

    // Iterate to find next empty field to set active
    const nextEmpty = fieldOrder.find((f) => !data[f]);
    if (nextEmpty !== activeField) {
      setActiveField(nextEmpty || null);
    }
  }, [transcript, interimTranscript, data, setField, setActiveField, activeField, clearTranscript]);

  const currentPromptField = fieldOrder.find((f) => !data[f]) || 'done';

  return { currentPromptField };
}
