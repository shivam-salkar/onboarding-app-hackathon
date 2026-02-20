'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const steps = [
  { path: '/', label: 'Bank' },
  { path: '/onboarding', label: 'Voice' },
  { path: '/review', label: 'Review' },
  { path: '/kyc', label: 'KYC' },
];

export function StepIndicator() {
  const pathname = usePathname();
  const currentIndex = steps.findIndex((s) => s.path === pathname);

  return (
    <div className="flex items-center justify-center gap-1 py-3 px-4" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={4}>
      {steps.map((step, i) => {
        const isActive = i === currentIndex;
        const isCompleted = i < currentIndex;

        return (
          <div key={step.path} className="flex items-center gap-1">
            <div className="relative flex flex-col items-center">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${isActive
                    ? 'bg-primary'
                    : isCompleted
                      ? 'bg-glow-teal'
                      : 'bg-white/15'
                  }`}
                animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={isActive ? { duration: 1.5, repeat: Infinity } : undefined}
              />
              <span
                className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-glow-teal' : 'text-text-muted'
                  }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-[2px] rounded-full mb-4 transition-colors duration-300 ${isCompleted ? 'bg-glow-teal' : 'bg-white/10'
                  }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
