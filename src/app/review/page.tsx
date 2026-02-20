'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Check, X, ArrowLeft } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useOnboarding, FieldKey } from '@/providers/OnboardingProvider';

const fields: FieldKey[] = ['name', 'dob', 'pan', 'aadhaar'];

export default function ReviewPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, setField } = useOnboarding();
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (field: FieldKey) => {
    setEditingField(field);
    setEditValue(data[field]);
  };

  const handleSave = () => {
    if (editingField) {
      setField(editingField, editValue);
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const allFilled = fields.every((f) => data[f]);

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-6 min-h-[100dvh] relative z-10">
      {/* Header */}
      <motion.div
        className="text-center mb-8 w-full max-w-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-text-primary">
          {t('review.title')}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {t('review.subtitle')}
        </p>
      </motion.div>

      {/* Field Cards */}
      <div className="w-full max-w-sm flex flex-col gap-3 mb-8">
        {fields.map((fieldKey, i) => {
          const isEditing = editingField === fieldKey;

          return (
            <motion.div
              key={fieldKey}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard className="w-full">
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-glow-teal uppercase tracking-wider">
                          {t('review.editing')} — {t(`onboarding.fields.${fieldKey}`)}
                        </p>
                      </div>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full bg-black/5 border border-card-border rounded-full px-6 py-3 text-text-primary text-base font-medium focus:outline-none focus:ring-2 focus:ring-glow-teal focus:border-transparent min-h-[48px]"
                        autoFocus
                        aria-label={t(`onboarding.fields.${fieldKey}`)}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          className="flex-1"
                          variant="primary"
                        >
                          <Check className="w-4 h-4" />
                          {t('review.save')}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="ghost"
                          className="min-w-[48px]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => handleEdit(fieldKey)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                          {t(`onboarding.fields.${fieldKey}`)}
                        </p>
                        <p className="text-base font-semibold text-text-primary truncate">
                          {data[fieldKey] || '—'}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingField(fieldKey)}
                        className="ml-3 w-12 h-12 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-teal min-h-[48px] min-w-[48px]"
                        aria-label={`Edit ${t(`onboarding.fields.${fieldKey}`)}`}
                      >
                        <Pencil className="w-4 h-4 text-text-secondary" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm mt-auto flex flex-col gap-3">
        <Button
          onClick={() => router.push('/kyc')}
          disabled={!allFilled}
          className="w-full"
        >
          {t('review.proceed')}
        </Button>
        <Button
          onClick={() => router.push('/onboarding')}
          variant="ghost"
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('review.back')}
        </Button>
      </div>
    </div>
  );
}
