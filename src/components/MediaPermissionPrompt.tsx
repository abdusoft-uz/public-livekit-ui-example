"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MediaPermissionPromptProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

/**
 * Component to request microphone and audio permissions from user
 * This ensures we have user interaction before accessing media devices
 */
export function MediaPermissionPrompt({ 
  onPermissionGranted, 
  onPermissionDenied 
}: MediaPermissionPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setIsRequesting(true);
    
    try {
      // Request microphone permission explicitly
      // This will trigger browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      // Permission granted
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gradient-to-br from-black/90 to-black/80 border border-white/20 rounded-2xl p-8 max-w-md mx-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex flex-col items-center text-center gap-6">
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <svg 
                className="w-10 h-10 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                />
              </svg>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Mikrofon va Audio Ruxsati
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Voice chat ishlashi uchun mikrofon va audio ruxsatini berishingiz kerak. 
                Brauzer xavfsizlik maqsadida bu ruxsatni so&apos;raydi.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={handleAllow}
                disabled={isRequesting}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequesting ? 'Kutilmoqda...' : 'Ruxsat berish'}
              </button>
              <button
                onClick={handleDeny}
                disabled={isRequesting}
                className="flex-1 px-6 py-3 rounded-xl bg-white/10 text-white/90 font-medium border border-white/20 hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rad etish
              </button>
            </div>

            <p className="text-xs text-white/40 mt-2">
              Bu ruxsat faqat voice chat uchun ishlatiladi
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

