
import React from 'react';

export const UwpLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="50" cy="50" r="48" fill="#F1C40F" stroke="#2c3e50" strokeWidth="4"/>
    <path d="M30 35 L50 65 L70 35" stroke="#2c3e50" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30 65 L70 65" stroke="#2c3e50" strokeWidth="8" fill="none" strokeLinecap="round"/>
  </svg>
);

export const SlpLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <polygon points="50,5 61,35 95,35 68,55 78,85 50,65 22,85 32,55 5,35 39,35" fill="#E74C3C"/>
  </svg>
);
