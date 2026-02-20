'use client';

import { ThemeProvider } from '@/providers/ThemeProvider';
import { I18nProvider } from '@/providers/I18nProvider';
import { OnboardingProvider } from '@/providers/OnboardingProvider';
import { StepIndicator } from '@/components/layout/StepIndicator';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <OnboardingProvider>
          <div className="flex flex-col min-h-[100dvh] relative">
            <StepIndicator />
            {children}
          </div>
        </OnboardingProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
