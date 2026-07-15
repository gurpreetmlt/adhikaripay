'use client';

import React, { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Launch date is exactly 45 days from July 14, 2026
    const targetDate = new Date('2026-08-28T09:00:00+05:30').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    return mounted ? num.toString().padStart(2, '0') : '00';
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-8 mb-10">
      <p className="font-sora font-bold text-xs uppercase tracking-widest text-brand-blue-light dark:text-brand-green-light text-center mb-4">
        Grand Launch Countdown
      </p>
      
      <div className="grid grid-cols-4 gap-3 md:gap-4 px-2">
        {/* Days */}
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center shadow-lg relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-brand-blue-dark to-brand-blue-light" />
          <div className="font-sora font-extrabold text-2xl sm:text-3xl md:text-4xl text-brand-blue-dark dark:text-neutral-100 transition-colors">
            {formatNumber(timeLeft.days)}
          </div>
          <div className="font-poppins font-medium text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wider">
            Days
          </div>
        </div>

        {/* Hours */}
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center shadow-lg relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-brand-blue-light to-brand-green-dark" />
          <div className="font-sora font-extrabold text-2xl sm:text-3xl md:text-4xl text-brand-blue-dark dark:text-neutral-100 transition-colors">
            {formatNumber(timeLeft.hours)}
          </div>
          <div className="font-poppins font-medium text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wider">
            Hours
          </div>
        </div>

        {/* Minutes */}
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center shadow-lg relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-brand-green-dark to-brand-green-light" />
          <div className="font-sora font-extrabold text-2xl sm:text-3xl md:text-4xl text-brand-blue-dark dark:text-neutral-100 transition-colors">
            {formatNumber(timeLeft.minutes)}
          </div>
          <div className="font-poppins font-medium text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wider">
            Mins
          </div>
        </div>

        {/* Seconds */}
        <div className="glass-card rounded-2xl p-3 md:p-4 text-center shadow-lg relative overflow-hidden group hover:scale-[1.03] transition-transform duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-brand-green-light to-brand-blue-dark" />
          <div className="font-sora font-extrabold text-2xl sm:text-3xl md:text-4xl text-brand-blue-dark dark:text-neutral-100 transition-colors">
            {formatNumber(timeLeft.seconds)}
          </div>
          <div className="font-poppins font-medium text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wider">
            Secs
          </div>
        </div>
      </div>
    </div>
  );
}
