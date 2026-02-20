'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sun, CreditCard, Wifi, MessageSquare, Check, PartyPopper } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const stepIcons = [Sun, CreditCard, Wifi, MessageSquare];
const stepKeys = ['lighting', 'document', 'internet', 'speak'] as const;

export default function KycPage() {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showComplete, setShowComplete] = useState(false);

  const allChecked = stepKeys.every((key) => checked[key]);

  const toggleCheck = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-6 min-h-[100dvh] relative z-10">
      {/* Header */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-text-primary">
          {t('kyc.title')}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {t('kyc.subtitle')}
        </p>
      </motion.div>

      {/* Camera Illustration */}
      <motion.div
        className="relative mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <div className="relative">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{ scale: [0.8, 1.8], opacity: [0.4, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <Camera className="w-10 h-10 text-primary" />
          </div>
        </div>
      </motion.div>

      {/* Step progress */}
      <motion.p
        className="text-xs text-text-muted mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {t('kyc.step', { current: 4, total: 4 })}
      </motion.p>

      {/* Checklist Cards */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-8">
        {stepKeys.map((key, i) => {
          const Icon = stepIcons[i];
          const isChecked = checked[key];

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <GlassCard
                onClick={() => toggleCheck(key)}
                className={`transition-all duration-300 ${isChecked ? 'ring-1 ring-glow-teal/50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${isChecked ? 'bg-glow-teal/20' : 'bg-black/5'
                      }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-300 ${isChecked ? 'text-glow-teal' : 'text-text-muted'
                        }`}
                    />
                  </div>
                  <p
                    className={`flex-1 text-sm font-medium transition-colors duration-300 ${isChecked ? 'text-text-primary' : 'text-text-secondary'
                      }`}
                  >
                    {t(`kyc.steps.${key}`)}
                  </p>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isChecked
                      ? 'bg-glow-teal border-glow-teal'
                      : 'border-black/20 bg-transparent'
                      }`}
                  >
                    {isChecked && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Start Button */}
      <div className="w-full max-w-sm mt-auto">
        <Button
          onClick={() => setShowComplete(true)}
          disabled={!allChecked}
          className="w-full"
        >
          {t('kyc.start')}
        </Button>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowComplete(false)}
            />
            <motion.div
              className="glass rounded-[2rem] p-10 max-w-sm w-full relative z-10 text-center shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-glow-teal/20 flex items-center justify-center mx-auto mb-4"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <PartyPopper className="w-8 h-8 text-glow-teal" />
              </motion.div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                {t('kyc.complete')}
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                {t('kyc.completeMsg')}
              </p>
              <Button
                onClick={() => setShowComplete(false)}
                className="w-full"
              >
                {t('kyc.close')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
