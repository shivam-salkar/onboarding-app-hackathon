'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface VoiceCommand {
  /** Keywords that trigger this command (matched case-insensitively against transcript) */
  keywords: string[];
  /** Action to execute when a keyword is matched */
  action: () => void;
  /** If true, only match if keyword is the entire transcript (after trimming) */
  exact?: boolean;
}

interface UseVoiceCommandsOptions {
  /** Current transcript text from speech recognition */
  transcript: string;
  /** Interim (partial) transcript text */
  interimTranscript: string;
  /** List of voice commands to match */
  commands: VoiceCommand[];
  /** Whether command processing is enabled */
  enabled?: boolean;
  /** Callback after a command is matched */
  onCommandMatched?: (keyword: string) => void;
  /** Debounce time in ms before processing a final transcript (default: 600) */
  debounceMs?: number;
}

export function useVoiceCommands({
  transcript,
  interimTranscript,
  commands,
  enabled = true,
  onCommandMatched,
  debounceMs = 600,
}: UseVoiceCommandsOptions) {
  const lastProcessedRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  const processTranscript = useCallback(
    (text: string) => {
      if (!enabled || !text) return;

      const normalized = text.trim().toLowerCase();
      if (!normalized || normalized === lastProcessedRef.current) return;

      for (const cmd of commandsRef.current) {
        for (const kw of cmd.keywords) {
          const kwLower = kw.toLowerCase();
          if (cmd.exact) {
            if (normalized === kwLower) {
              lastProcessedRef.current = normalized;
              onCommandMatched?.(kw);
              cmd.action();
              return;
            }
          } else {
            if (normalized.includes(kwLower)) {
              lastProcessedRef.current = normalized;
              onCommandMatched?.(kw);
              cmd.action();
              return;
            }
          }
        }
      }
    },
    [enabled, onCommandMatched],
  );

  // Process final transcript with debounce
  useEffect(() => {
    if (!transcript) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      processTranscript(transcript);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [transcript, processTranscript, debounceMs]);

  // Also check interim transcript for faster response on clear commands
  useEffect(() => {
    if (!interimTranscript) return;
    processTranscript(interimTranscript);
  }, [interimTranscript, processTranscript]);

  // Reset processed ref when commands change (e.g. step change)
  const resetProcessed = useCallback(() => {
    lastProcessedRef.current = '';
  }, []);

  return { resetProcessed };
}
