'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { AiOrb } from '@/components/ai/AiOrb';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useVoiceCommands, VoiceCommand } from '@/hooks/useVoiceCommands';

interface VoiceAssistantProps {
  /** i18n key for the current AI prompt to display and speak */
  promptKey: string;
  /** Voice commands for the current context */
  commands?: VoiceCommand[];
  /** Whether voice commands are enabled (default: true) */
  commandsEnabled?: boolean;
  /** Callback when a command is matched */
  onCommandMatched?: (keyword: string) => void;
  /** Whether to show the transcript panel */
  showTranscript?: boolean;
  /** Whether to auto-speak the prompt when it changes */
  autoSpeak?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function VoiceAssistant({
  promptKey,
  commands = [],
  commandsEnabled = true,
  onCommandMatched,
  showTranscript = false,
  autoSpeak = true,
  className = '',
  size = 'md',
}: VoiceAssistantProps) {
  const { t, i18n } = useTranslation();
  const { transcript, interimTranscript, isListening, isSupported, start, stop, clearTranscript } =
    useSpeechRecognition(i18n.language);
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();
  const lastSpokenRef = useRef<string>('');

  const { resetProcessed } = useVoiceCommands({
    transcript,
    interimTranscript,
    commands,
    enabled: commandsEnabled && isListening,
    onCommandMatched: useCallback(
      (kw: string) => {
        // Stop listening after command is matched, then clear
        stop();
        clearTranscript();
        onCommandMatched?.(kw);
      },
      [stop, clearTranscript, onCommandMatched],
    ),
  });

  const handleToggle = useCallback(() => {
    if (isSpeaking) return;
    if (isListening) {
      stop();
    } else {
      clearTranscript();
      resetProcessed();
      start();
    }
  }, [isSpeaking, isListening, stop, start, clearTranscript, resetProcessed]);

  // Auto-speak the prompt when it changes
  useEffect(() => {
    if (!autoSpeak) return;
    const textToSpeak = t(promptKey);
    if (!textToSpeak || textToSpeak === lastSpokenRef.current) return;
    lastSpokenRef.current = textToSpeak;

    // Stop listening before speaking to avoid feedback
    if (isListening) {
      stop();
    }
    speak(textToSpeak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptKey, i18n.language, speak, t, autoSpeak]);

  // Reset processed commands when prompt changes (context change)
  useEffect(() => {
    resetProcessed();
    clearTranscript();
  }, [promptKey, resetProcessed, clearTranscript]);

  const orbSize = size === 'sm' ? 'scale-75' : '';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* AI Orb */}
      <motion.div
        className={`mb-3 ${orbSize}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <AiOrb
          isListening={isListening}
          isSpeaking={isSpeaking}
          isSupported={isSupported}
          onToggle={handleToggle}
        />
      </motion.div>

      {/* AI Prompt Bubble */}
      <motion.div
        className="glass rounded-[2rem] px-5 py-3 mb-3 max-w-sm text-center shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 justify-center mb-1">
          <MessageCircle className="w-3 h-3 text-glow-teal" />
          <span className="text-[10px] font-medium text-glow-teal uppercase tracking-wider">
            AI Agent
          </span>
        </div>
        <p className="text-sm text-text-primary font-medium">{t(promptKey)}</p>
      </motion.div>

      {/* Listening status */}
      <motion.p
        className={`text-xs font-medium mb-4 ${isListening ? 'text-glow-teal' : 'text-text-muted'}`}
        animate={isListening ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
        transition={isListening ? { duration: 1.5, repeat: Infinity } : undefined}
      >
        {isListening ? t('onboarding.listening') : t('onboarding.tapToSpeak')}
      </motion.p>

      {/* Live Transcript */}
      {showTranscript && (transcript || interimTranscript) && (
        <motion.div
          className="w-full max-w-sm glass rounded-[2rem] p-4 mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">
            {t('onboarding.transcript')}
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="text-glow-teal">{interimTranscript}</span>
            )}
          </p>
        </motion.div>
      )}
    </div>
  );
}
