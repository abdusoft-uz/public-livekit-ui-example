"use client";

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface MediaPermissionPromptProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

/**
 * Asks the user for microphone permission.
 * A user interaction is required before the browser shows its own permission prompt.
 */
export function MediaPermissionPrompt({
  onPermissionGranted,
  onPermissionDenied
}: MediaPermissionPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Show the prompt after a short delay
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      // Triggers the browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      // Stop the stream immediately: we only needed the permission
      stream.getTracks().forEach((track) => track.stop());
      setIsVisible(false);
      onPermissionGranted();
    } catch (error) {
      console.error('Media permission denied:', error);
      setIsVisible(false);
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeny = () => {
    setIsVisible(false);
    onPermissionDenied();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mic-permission-title"
        aria-describedby="mic-permission-desc"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-br from-[#10192f]/95 to-[#0a0f1f]/95 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30 sm:h-20 sm:w-20">
            <svg className="h-8 w-8 text-white sm:h-10 sm:w-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>

          <div>
            <h2 id="mic-permission-title" className="mb-2 text-xl font-bold text-white sm:text-2xl">
              Mikrofonga ruxsat bering
            </h2>
            <p id="mic-permission-desc" className="text-sm leading-relaxed text-white/70">
              Ovozli suhbat ishlashi uchun mikrofon kerak. Tugmani bosganingizdan so&#8216;ng brauzer ruxsat so&#8216;raydi.
            </p>
          </div>

          <ul className="w-full space-y-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs text-white/60">
            <li className="flex items-start gap-2"><span className="mt-0.5 text-green-300" aria-hidden>&#10003;</span>Ovoz faqat suhbat davomida uzatiladi</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 text-green-300" aria-hidden>&#10003;</span>Mikrofonni istalgan payt o&#8216;chirib qo&#8216;yishingiz mumkin</li>
          </ul>

          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDeny}
              disabled={isRequesting}
              className="flex-1 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-medium text-white/90 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hozir emas
            </button>
            <button
              type="button"
              onClick={handleAllow}
              disabled={isRequesting}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-blue-500/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRequesting ? 'Kutilmoqda...' : 'Ruxsat berish'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
