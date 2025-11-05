import React from 'react';

export const ResetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none" // Hum fill ko 'none' rakhenge, aur stroke ko 'currentColor'
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Naya path tumhare image jaisa loop aur arrow head banaega */}
    <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
    <path d="M2.5 16a9 9 0 0 1 13.9-9.87l5.1-4.13"/>
    <path d="M21.5 8a9 9 0 0 1-13.9 9.87l-5.1 4.13"/>
  </svg>
);