import React from 'react';

interface StatProps {
  label: string;
  value: string | number;
}

export const Stat: React.FC<StatProps> = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">{value}</span>
  </div>
);
