import React from 'react';

export const AccessKeyLabel: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div className="absolute -top-2 -left-1 bg-slate-100 dark:bg-slate-700 border border-slate-400 dark:border-slate-500 rounded-sm px-1.5 py-0.5 text-xs font-sans font-bold z-20 shadow-md pointer-events-none">
      {label}
    </div>
  );
};
