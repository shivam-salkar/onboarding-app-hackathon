'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const baseClasses =
    'min-h-[56px] min-w-[56px] px-8 py-3 rounded-full font-bold text-base transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-teal focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 tracking-wide';

  const variantClasses = {
    primary: 'bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/25',
    secondary:
      'glass text-text-primary hover:bg-white/10 border border-card-border',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
