import React from 'react';

interface CircularGaugeProps {
    value: number;
    max: number;
    label: string;
    color: 'purple' | 'blue' | 'green';
}

/**
 * Circular Progress Gauge Component
 * 
 * Displays metric in circular progress indicator
 * - Smooth fill animation
 * - Color-coded by metric type
 */
export const CircularGauge: React.FC<CircularGaugeProps> = ({
    value,
    max,
    label,
    color,
}) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 40;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

    const colorClasses = {
        purple: 'stroke-purple-500',
        blue: 'stroke-blue-500',
        green: 'stroke-green-500',
    };

    return (
        <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-200 dark:text-slate-700"
                />

                {/* Progress circle */}
                <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={`${colorClasses[color]} transition-all duration-800 ease-out`}
                    style={{
                        strokeDasharray,
                        strokeDashoffset: 0,
                    }}
                />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(value)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    {label}
                </span>
            </div>
        </div>
    );
};
