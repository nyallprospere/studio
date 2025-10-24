
import React from 'react';

export const UwpLogo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 100 100" fill="#F1C40F" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M50 0 L60 35 H40 L50 0 Z" />
        <path d="M40 35 H60 L65 50 H35 L40 35 Z" />
        <path d="M35 50 H65 L70 70 H30 L35 50 Z" />
        <path d="M30 70 H70 L75 100 H25 L30 70 Z" />
        <path d="M50 20 L55 35 H45 L50 20 Z" fill="#E67E22" />
    </svg>
);


export const SlpLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}>
    <polygon points="50,5 61,40 98,40 68,62 79,96 50,75 21,96 32,62 2,40 39,40" fill="#E53935"/>
  </svg>
);
