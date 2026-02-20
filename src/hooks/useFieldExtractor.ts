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
    // Allow for leading/trailing spaces in the check
    /^\s*([a-zA-Z\s.]{3,40})\s*$/,
    // Fallback: If no keywords, just take the first 2-3 words if it seems reasonable
    /^\s*([a-zA-Z]{3,}\s+[a-zA-Z]{3,}(?:\s+[a-zA-Z]{3,})?)\s*$/
  ],
  // DOB: dates like DD/MM/YYYY, DD-MM-YYYY, spoken dates
  dob: [
    /(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{2,4})/,
    // Flexible spoken date: "20th January 2000" or "January 20 2000"
    /(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
    /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{2,4})/i,
    // Hindi/Marathi date phrases
    /(?:जन्म तिथि|जन्मतारीख)\s+([\d\s/\-\.]+)/i,
    // Simple year check if they just say "1990"
    /(?:year|saal|varsh)\s+(\d{4})/i
  ],
  // PAN: ABCDE1234F format - Robust for spoken letters (phonetic ambiguity is hard, but we try)
  // Users often say "P as in Papa", so we might need a more general extractor later, but for now:
  pan: [
    // Standard format with optional spaces
    /([A-Z]{5}\s*\d{4}\s*[A-Z])/i,
    // Spoken loose format (phonetic? just chars for now)
    /(?:pan|number)\s*([a-z0-9\s]{10,15})/i,
    // Relaxed check: 5 chars, 4 digits, 1 char anywhere in string
    /([a-z]{5}\s*\d{4}\s*[a-z])/i
  ],
  // Aadhaar: 12 digits (possibly with spaces)
  aadhaar: [
    /(\d{4}\s*\d{4}\s*\d{4})/,
    /(\d{12})/,
    /(?:aadhaar|number)\s*(\d[\d\s]{11,15})/i,
    // Spoken "My aadhaar is X"
    /(?:is|hai|ahe)\s*(\d[\d\s]{11,15})/i
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
    // Clean and normalize the text
    const cleanTranscript = (transcript || '').trim();
    const cleanInterim = (interimTranscript || '').trim();
    
    // Combine but avoid double spaces
    let fullText = cleanTranscript;
    if (cleanInterim) {
      fullText = fullText ? `${fullText} ${cleanInterim}` : cleanInterim;
    }
    
    // Normalize spaces
    fullText = fullText.replace(/\s+/g, ' ').trim();

    if (!fullText || fullText === lastTranscriptRef.current) return;
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
            // Remove common spoken separators like "hyphen", "dash" if speech-to-text captured them as words? 
            // Usually STT just gives text.
            value = value.replace(/[\s-]/g, '').toUpperCase();
            // PAN must be 10 chars
            if (value.length !== 10) continue; 
          } else if (activeField === 'aadhaar') {
            const digits = value.replace(/\D/g, '');
            // Aadhaar must be 12 digits
            if (digits.length !== 12) continue;
            value = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
          } else if (activeField === 'name') {
            // If the value is too short (e.g. just "I"), ignore it
            if (value.length < 3) continue;
            
            // Capitalize First Letter of Each Word
            value = value
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
          } else if (activeField === 'dob') {
              // Try to normalize date if possible, but raw string is okay for now
              // If only year is captured (e.g. "1990"), we might want to ask for full date?
              // For now, accept it.
          }

          // Commit value
          setField(activeField, value);
          
          // Clear transcript for next field
          if (clearTranscript) {
            clearTranscript();
            // Reset our ref so we don't think the empty string is a dup (though it will be empty)
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
    
    // Only switch if actively changing AND we exhausted attempts on current field or it's filled
    if (nextEmpty && nextEmpty !== activeField) {
       // Check if current active field is actually filled in data
       // If activeField is null (initial state), just set it
       if (!activeField || data[activeField]) {
         setActiveField(nextEmpty);
       }
    } else if (!nextEmpty && activeField) {
        // All done
        setActiveField(null);
    }
  }, [transcript, interimTranscript, data, setField, setActiveField, activeField, clearTranscript]);

  const currentPromptField = fieldOrder.find((f) => !data[f]) || 'done';

  return { currentPromptField };
}
