'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface OnboardingData {
  name: string;
  dob: string;
  pan: string;
  aadhaar: string;
}

export type FieldKey = keyof OnboardingData;

interface OnboardingContextType {
  data: OnboardingData;
  activeField: FieldKey | null;
  setField: (key: FieldKey, value: string) => void;
  setActiveField: (key: FieldKey | null) => void;
  setData: (data: Partial<OnboardingData>) => void;
  isComplete: boolean;
}

const defaultData: OnboardingData = {
  name: '',
  dob: '',
  pan: '',
  aadhaar: '',
};

const OnboardingContext = createContext<OnboardingContextType>({
  data: defaultData,
  activeField: null,
  setField: () => { },
  setActiveField: () => { },
  setData: () => { },
  isComplete: false,
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState] = useState<OnboardingData>(defaultData);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);

  const setField = useCallback((key: FieldKey, value: string) => {
    setDataState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setData = useCallback((partial: Partial<OnboardingData>) => {
    setDataState((prev) => ({ ...prev, ...partial }));
  }, []);

  const isComplete = Boolean(data.name && data.dob && data.pan && data.aadhaar);

  return (
    <OnboardingContext.Provider
      value={{ data, activeField, setField, setActiveField, setData, isComplete }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
