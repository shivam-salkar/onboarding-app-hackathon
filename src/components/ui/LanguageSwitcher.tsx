'use client';

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'mr', label: 'मर' },
];

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  return (
    <div className={`flex items-center gap-3 ${className} p-2 glass rounded-full`}>
      <Globe className="w-5 h-5 text-text-muted ml-2" />
      <div className="flex gap-1 p-1">
        {languages.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`relative px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-teal ${isActive
                  ? 'text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary hover:bg-black/5'
                }`}
              aria-label={`Switch to ${lang.label}`}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-primary rounded-full"
                  layoutId="lang-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">{lang.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
