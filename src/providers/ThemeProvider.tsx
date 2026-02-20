'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BankId, themes, BankTheme } from '@/lib/themes';

interface ThemeContextType {
  bankId: BankId | null;
  theme: BankTheme | null;
  setBank: (id: BankId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  bankId: null,
  theme: null,
  setBank: () => { },
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [bankId, setBankId] = useState<BankId | null>(null);

  const setBank = useCallback((id: BankId) => {
    setBankId(id);
  }, []);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    if (!bankId) return;
    const theme = themes[bankId];
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [bankId]);

  const theme = bankId ? themes[bankId] : null;

  return (
    <ThemeContext.Provider value={{ bankId, theme, setBank }}>
      {children}
    </ThemeContext.Provider>
  );
}
