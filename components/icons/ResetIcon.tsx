import React from 'react';

export const ResetIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none" 
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Standard Reset/Rotate Path */}
    <path d="M23 4v6h-6"/>
    <path d="M1 20v-6h6"/>
    <path d="M3.5 9a9 9 0 0 1 14.8-2.6L23 10"/>
    <path d="M21.5 15a9 9 0 0 1-14.8 2.6L1 14"/>
  </svg>
);