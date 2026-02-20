'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { BankId, themes } from '@/lib/themes';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { VoiceAssistant } from '@/components/ai/VoiceAssistant';
import { VoiceCommand } from '@/hooks/useVoiceCommands';

const bankList: BankId[] = ['icici', 'sbi', 'axis'];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function GatekeeperPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bankId, setBank } = useTheme();
  const [selected, setSelected] = useState<BankId | null>(bankId);

  const handleSelectBank = (id: BankId) => {
    setSelected(id);
    setBank(id);
  };

  const handleBegin = () => {
    if (selected) {
      router.push('/onboarding');
    }
  };

  const voicePromptKey = selected ? 'gatekeeper.voiceSelected' : 'gatekeeper.voicePrompt';

  const voiceCommands: VoiceCommand[] = useMemo(
    () => [
      {
        keywords: ['icici'],
        action: () => handleSelectBank('icici'),
      },
      {
        keywords: ['sbi', 'state bank'],
        action: () => handleSelectBank('sbi'),
      },
      {
        keywords: ['axis'],
        action: () => handleSelectBank('axis'),
      },
      {
        keywords: ['begin', 'start', 'shuru', 'शुरू', 'सुरू'],
        action: () => {
          if (selected) router.push('/onboarding');
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected],
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 min-h-[100dvh] relative z-10">
      {/* Header */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {t('gatekeeper.title')}
        </h1>
        <p className="text-sm text-text-secondary max-w-xs mx-auto">
          {t('gatekeeper.subtitle')}
        </p>
      </motion.div>

      {/* Voice Assistant */}
      <VoiceAssistant
        promptKey={voicePromptKey}
        commands={voiceCommands}
        showTranscript
        size="sm"
        className="mb-6"
      />

      {/* Bank Selection */}
      <motion.div
        className="w-full max-w-sm mb-8"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3 text-center">
          {t('gatekeeper.selectBank')}
        </p>
        <div className="flex flex-col gap-3">
          {bankList.map((id) => {
            const theme = themes[id];
            const isSelected = selected === id;
            return (
              <motion.div key={id} variants={item}>
                <GlassCard
                  onClick={() => handleSelectBank(id)}
                  glowing={isSelected}
                  className={`transition-all duration-300 ${isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden bg-white/80 backdrop-blur-md shadow-lg border border-white/40 ring-1 ring-black/5"
                    >
                      <img
                        src={theme.logo}
                        alt={theme.name}
                        className="w-[85%] h-[85%] object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{theme.name}</p>
                      <div className="flex gap-1.5 mt-1">
                        <div
                          className="w-4 h-4 rounded-full border-2 border-black/10"
                          style={{ background: theme.colors['--primary'] }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border-2 border-black/10"
                          style={{ background: theme.colors['--secondary'] }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border-2 border-black/10"
                          style={{ background: theme.colors['--accent'] }}
                        />
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Language Selection */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3 text-center">
          {t('gatekeeper.selectLanguage')}
        </p>
        <LanguageSwitcher />
      </motion.div>

      {/* Begin Button */}
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Button
          onClick={handleBegin}
          disabled={!selected}
          className="w-full text-lg"
        >
          {t('gatekeeper.begin')}
        </Button>
        <p className="text-xs text-text-muted text-center mt-3">
          {t('gatekeeper.poweredBy')}
        </p>
      </motion.div>
    </div>
  );
}

