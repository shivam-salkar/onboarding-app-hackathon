'use client';

import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { FieldKey } from '@/providers/OnboardingProvider';

interface FieldCardProps {
  label: string;
  value: string;
  fieldKey: FieldKey;
  isActive: boolean;
  isFilling: boolean;
}

export function FieldCard({ label, value, isActive, isFilling }: FieldCardProps) {
  const hasValue = Boolean(value);

  return (
    <GlassCard glowing={isActive} className="w-full">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            {label}
          </p>
          <div className="flex items-center gap-2">
            {value ? (
              <motion.p
                className="text-lg font-semibold text-text-primary truncate"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {value}
              </motion.p>
            ) : (
              <p className="text-lg text-text-muted/50">
                {isFilling ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      className="inline-block w-2 h-5 bg-glow-teal rounded-sm"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    <span className="text-xs text-glow-teal font-medium tracking-wide animate-pulse">
                      Listening...
                    </span>
                  </span>
                ) : (
                  '—'
                )}
              </p>
            )}
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          {hasValue ? (
            <motion.div
              className="w-8 h-8 rounded-full bg-glow-teal/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="w-4 h-4 text-glow-teal" />
            </motion.div>
          ) : isActive ? (
            <motion.div
              className="w-8 h-8 rounded-full bg-glow-purple/20 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-4 h-4 text-glow-purple" />
            </motion.div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-text-muted/30" />
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
