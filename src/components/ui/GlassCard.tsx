'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowing?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', glowing = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={`glass rounded-[2rem] p-6 relative overflow-hidden ${glowing ? 'animate-glow-pulse' : ''} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {glowing && (
        <motion.div
          className="absolute inset-0 rounded-[2rem] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(167,139,250,0.15))',
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
