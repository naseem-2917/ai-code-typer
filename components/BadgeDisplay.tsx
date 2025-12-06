import React from 'react';
import { Badge } from '../utils/profileUtils';

interface BadgeDisplayProps {
    badges: Badge[];
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badges }) => {
    // Sort earned first
    const sortedBadges = [...badges].sort((a, b) => (a.earned === b.earned ? 0 : a.earned ? -1 : 1));

    return (
        <div className="grid grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-3">
            {sortedBadges.map((badge) => (
                <div
                    key={badge.id}
                    className={`relative group p-3 rounded-xl border transition-all duration-300 ${badge.earned
                        ? `${badge.color} border-transparent shadow-sm`
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60 grayscale'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{badge.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight break-words">{badge.name}</p>
                            <p className="text-[10px] opacity-80 truncate leading-tight">
                                {badge.earned ? 'Unlocked' : 'Locked'}
                            </p>
                        </div>
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 w-max max-w-[200px]">
                        {badge.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};
