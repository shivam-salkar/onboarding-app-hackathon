'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { AiOrb } from '@/components/ai/AiOrb';
import { FieldCard } from '@/components/ui/FieldCard';
import { Button } from '@/components/ui/Button';
import { useOnboarding, FieldKey } from '@/providers/OnboardingProvider';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useFieldExtractor } from '@/hooks/useFieldExtractor';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useEffect } from 'react';

const fields: FieldKey[] = ['name', 'dob', 'pan', 'aadhaar'];

export default function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data, activeField, isComplete } = useOnboarding();
  const { transcript, interimTranscript, isListening, isSupported, start, stop, clearTranscript } =
    useSpeechRecognition(i18n.language);
  const { currentPromptField } = useFieldExtractor(transcript, interimTranscript, clearTranscript);
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  const handleToggle = () => {
    // If AI is speaking, user cannot interrupt or start listening
    if (isSpeaking) {
      return;
    }

    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  const handleReview = () => {
    stopSpeaking();
    router.push('/review');
  };

  const promptKey =
    currentPromptField === 'done'
      ? 'onboarding.aiPrompts.done'
      : `onboarding.aiPrompts.${currentPromptField}`;

  // Speak AI prompt when it changes
  useEffect(() => {
    const textToSpeak = t(promptKey);

    if (textToSpeak) {
      // Ensure we stop listening before AI speaks to prevent feedback loop/recording AI
      if (isListening) {
        stop();
      }
      speak(textToSpeak);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptKey, i18n.language, speak, t]);

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-6 min-h-[100dvh] relative z-10">
      {/* Header */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-text-primary">
          {t('onboarding.title')}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {t('onboarding.subtitle')}
        </p>
      </motion.div>

      {/* AI Orb */}
      <motion.div
        className="mb-4"
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
        className="glass rounded-[2rem] px-6 py-4 mb-4 max-w-sm text-center shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 justify-center mb-1">
          <MessageCircle className="w-3.5 h-3.5 text-glow-teal" />
          <span className="text-[10px] font-medium text-glow-teal uppercase tracking-wider">
            AI Agent
          </span>
        </div>
        <p className="text-sm text-text-primary font-medium">
          {t(promptKey)}
        </p>
      </motion.div>

      {/* Listening status */}
      <motion.p
        className={`text-xs font-medium mb-6 ${isListening ? 'text-glow-teal' : 'text-text-muted'}`}
        animate={isListening ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
        transition={isListening ? { duration: 1.5, repeat: Infinity } : undefined}
      >
        {isListening ? t('onboarding.listening') : t('onboarding.tapToSpeak')}
      </motion.p>

      {/* Field Cards Stack */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
        {fields.map((fieldKey, i) => (
          <motion.div
            key={fieldKey}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <FieldCard
              fieldKey={fieldKey}
              label={t(`onboarding.fields.${fieldKey}`)}
              value={data[fieldKey]}
              isActive={activeField === fieldKey}
              isFilling={isListening && activeField === fieldKey}
            />
          </motion.div>
        ))}
      </div>

      {/* Live Transcript */}
      {(transcript || interimTranscript) && (
        <motion.div
          className="w-full max-w-sm glass rounded-[2rem] p-6 mb-8 text-center"
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

      {/* Review Button */}
      <div className="w-full max-w-sm mt-auto">
        <Button
          onClick={handleReview}
          disabled={!isComplete}
          className="w-full"
        >
          {t('onboarding.review')}
        </Button>
      </div>
    </div>
  );
}
