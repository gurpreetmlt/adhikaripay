import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 48 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none`}
    >
      <defs>
        {/* Blue badge gradient */}
        <linearGradient id="blueBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B2A9A" />
          <stop offset="100%" stopColor="#2A5CDD" />
        </linearGradient>

        {/* Green wallet gradient */}
        <linearGradient id="greenWalletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#11A362" />
          <stop offset="100%" stopColor="#24CC82" />
        </linearGradient>

        {/* Wallet shadow */}
        <filter id="walletShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#051240" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Main rounded-square blue badge background */}
      <rect
        width="200"
        height="200"
        rx="54"
        fill="url(#blueBadgeGrad)"
      />

      {/* Faint white card peeking out from the top */}
      <rect
        x="60"
        y="50"
        width="80"
        height="40"
        rx="8"
        fill="white"
        fillOpacity="0.25"
      />

      {/* Green Wallet */}
      <g filter="url(#walletShadow)">
        <rect
          x="35"
          y="75"
          width="130"
          height="90"
          rx="18"
          fill="url(#greenWalletGrad)"
        />
      </g>

      {/* Wallet Clasp/Strap on the right */}
      <rect
        x="130"
        y="102"
        width="35"
        height="36"
        rx="8"
        fill="#0B2A9A"
      />
      {/* Clasp button */}
      <circle
        cx="147.5"
        cy="120"
        r="6"
        fill="white"
      />

      {/* White Rupee (₹) symbol inside the wallet */}
      <text
        x="60"
        y="138"
        fill="white"
        fontSize="68"
        fontWeight="800"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        ₹
      </text>
    </svg>
  );
}
