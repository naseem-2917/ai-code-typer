import React from 'react';

export const AccessKeyLabel: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black text-white dark:bg-white dark:text-black border border-white dark:border-black rounded-[2px] px-1.5 py-0 text-[10px] leading-tight font-sans font-bold z-50 shadow-sm pointer-events-none uppercase tracking-tighter min-w-[16px] text-center">
      {label}
    </div>
  );
};
