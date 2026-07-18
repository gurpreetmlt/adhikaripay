'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function BackgroundEffects() {
  const shouldReduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [coins, setCoins] = useState<Array<{ id: number; left: number; delay: number; scale: number; duration: number }>>([]);

  // Generate coin parameters on mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    if (!shouldReduceMotion) {
      const generatedCoins = Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100, // percentage across screen
        delay: Math.random() * 5,  // stagger delays
        scale: 0.6 + Math.random() * 0.8, // variation in size
        duration: 8 + Math.random() * 6, // float duration
      }));
      setCoins(generatedCoins);
    }
  }, [shouldReduceMotion]);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. Drifting Aurora Blobs */}
      {!shouldReduceMotion ? (
        <>
          {/* Blob 1: Royal Blue Top-Left */}
          <motion.div
            animate={{
              x: [0, 60, -30, 0],
              y: [0, 40, 70, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-[-10%] left-[-10%] w-[35vw] h-[35vw] min-w-[300px] min-h-[300px] rounded-full bg-brand-blue-light/20 dark:bg-brand-blue-dark/25 blur-[80px] md:blur-[120px]"
          />

          {/* Blob 2: Green Center-Right */}
          <motion.div
            animate={{
              x: [0, -50, 40, 0],
              y: [0, 80, -30, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-[30%] right-[-5%] w-[40vw] h-[40vw] min-w-[320px] min-h-[320px] rounded-full bg-brand-green-light/15 dark:bg-brand-green-dark/15 blur-[90px] md:blur-[140px]"
          />

          {/* Blob 3: Royal Blue Bottom-Left */}
          <motion.div
            animate={{
              x: [0, 40, -40, 0],
              y: [0, -60, 40, 0],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-[-10%] left-[10%] w-[30vw] h-[30vw] min-w-[280px] min-h-[280px] rounded-full bg-brand-blue-light/15 dark:bg-brand-blue-light/10 blur-[80px] md:blur-[120px]"
          />
        </>
      ) : (
        <>
          {/* Static fallbacks for reduced-motion */}
          <div className="absolute top-[5%] left-[5%] w-[40vw] h-[40vw] rounded-full bg-brand-blue-light/10 dark:bg-brand-blue-dark/15 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[5%] w-[45vw] h-[45vw] rounded-full bg-brand-green-light/10 dark:bg-brand-green-dark/10 blur-[100px]" />
        </>
      )}

      {/* 2. Faint Grid Overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-80"
        aria-hidden="true"
      />

      {/* 3. Floating "₹" Rupee Coins */}
      {!shouldReduceMotion && (
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          {coins.map((coin) => (
            <motion.div
              key={coin.id}
              initial={{ y: '105vh', opacity: 0, scale: coin.scale }}
              animate={{
                y: '-10vh',
                opacity: [0, 0.4, 0.4, 0],
                rotate: 360,
              }}
              transition={{
                duration: coin.duration,
                repeat: Infinity,
                delay: coin.delay,
                ease: 'linear',
              }}
              style={{
                left: `${coin.left}%`,
                position: 'absolute',
              }}
              className="font-sora font-extrabold text-brand-blue-light/15 dark:text-brand-blue-light/20 flex items-center justify-center select-none"
            >
              ₹
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
