'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

interface AiOrbProps {
  isListening: boolean;
  isSpeaking?: boolean;
  isSupported: boolean;
  onToggle: () => void;
}

export function AiOrb({ isListening, isSpeaking = false, isSupported, onToggle }: AiOrbProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Concentric rings (visible when listening or speaking) */}
      <div className="relative">
        {(isListening || isSpeaking) && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`absolute inset-0 rounded-full border-2 ${isSpeaking ? 'border-primary/40' : 'border-glow-teal/30'}`}
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: [0.8, 2.2], opacity: [0.5, 0] }}
                transition={{
                  duration: isSpeaking ? 1.5 : 2,
                  repeat: Infinity,
                  delay: i * (isSpeaking ? 0.3 : 0.5),
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}

        {/* Main Orb */}
        <motion.button
          onClick={onToggle}
          disabled={!isSupported || isSpeaking}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-glow-teal transition-all ${!isSupported ? 'opacity-40 cursor-not-allowed' : isSpeaking ? 'cursor-wait' : 'cursor-pointer'
            }`}
          style={{
            background: isSpeaking
              ? 'radial-gradient(circle, #F37021 0%, #FF8C42 60%, #B45309 100%)'
              : isListening
                ? 'radial-gradient(circle, #2DD4BF 0%, #A78BFA 60%, #7C3AED 100%)'
                : 'radial-gradient(circle, #4B5563 0%, #374151 60%, #1F2937 100%)',
          }}
          animate={
            isSpeaking
              ? { scale: [1, 1.12, 1], boxShadow: ['0 0 30px rgba(243, 112, 33, 0.4)', '0 0 60px rgba(255, 140, 66, 0.5)', '0 0 30px rgba(243, 112, 33, 0.4)'] }
              : isListening
                ? { scale: [1, 1.08, 1], boxShadow: ['0 0 30px rgba(45,212,191,0.4)', '0 0 60px rgba(167,139,250,0.5)', '0 0 30px rgba(45,212,191,0.4)'] }
                : { scale: [1, 1.04, 1] }
          }
          transition={{
            duration: isSpeaking ? 1.5 : (isListening ? 1.5 : 3),
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {/* Waveform bars or Mic */}
          {isSpeaking ? (
            <div className="flex gap-1 h-6 items-center">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-white rounded-full"
                  animate={{ height: [8, 24, 8] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-white rounded-full"
                  animate={{
                    height: [8, 24, 12, 28, 8],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          ) : (
            <Mic className="w-8 h-8 text-white/80" />
          )}
        </motion.button>
      </div>

      {/* Status text */}
      {!isSupported && (
        <p className="text-xs text-red-400 text-center max-w-[200px]">
          Speech recognition not supported. Try Chrome on Android.
        </p>
      )}
    </div>
  );
}
