import { PracticeStats } from '../types';
import { format } from 'date-fns';

// --- Level System ---
export const LEVELS = [
    { name: 'Novice', minTests: 0, color: 'text-gray-500' },
    { name: 'Script Kiddie', minTests: 10, color: 'text-green-500' },
    { name: 'Hacker', minTests: 50, color: 'text-blue-500' },
    { name: 'Elite Typer', minTests: 100, color: 'text-purple-500' },
    { name: 'Grandmaster', minTests: 250, color: 'text-amber-500' }, // Extended per user request implication
];

export const calculateLevel = (totalTests: number) => {
    let currentLevel = LEVELS[0];
    let nextLevel = LEVELS[1];

    for (let i = 0; i < LEVELS.length; i++) {
        if (totalTests >= LEVELS[i].minTests) {
            currentLevel = LEVELS[i];
            nextLevel = LEVELS[i + 1] || null;
        } else {
            break;
        }
    }

    let progress = 0;
    if (nextLevel) {
        const range = nextLevel.minTests - currentLevel.minTests;
        const gained = totalTests - currentLevel.minTests;
        progress = Math.min(100, Math.max(0, (gained / range) * 100));
    } else {
        progress = 100; // Max level reached
    }

    return { currentLevel, nextLevel, progress };
};

// --- Badges System ---
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    color: string;
}

export const getAllBadges = (history: PracticeStats[]): Badge[] => {
    const totalTests = history.length;
    const maxWpm = Math.max(0, ...history.map(s => s.wpm));
    const avgAccuracy = history.length > 0 ? history.reduce((a, b) => a + b.accuracy, 0) / history.length : 0;
    const totalDuration = history.reduce((a, b) => a + b.duration, 0); // seconds

    const badges: Badge[] = [
        {
            id: 'first_step',
            name: 'First Step',
            description: 'Complete your first practice session.',
            icon: '🌱',
            earned: totalTests >= 1,
            color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        },
        {
            id: 'speedster',
            name: 'Speedster',
            description: 'Reach 60 WPM in a single session.',
            icon: '⚡',
            earned: maxWpm >= 60,
            color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        },
        {
            id: 'sniper',
            name: 'Sniper',
            description: 'Maintain an average accuracy of 98% or higher.',
            icon: '🎯',
            earned: history.length >= 5 && avgAccuracy >= 98,
            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
        {
            id: 'dedicated',
            name: 'Dedicated',
            description: 'Complete 50 practice sessions.',
            icon: '🎓',
            earned: totalTests >= 50,
            color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        {
            id: 'marathon',
            name: 'Marathon Runner',
            description: 'Practice for over 2 hours total.',
            icon: '🏃',
            earned: totalDuration >= 7200, // 2 hours in seconds
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        },
        {
            id: 'century',
            name: 'Centurion',
            description: 'Reach 100 WPM in a session.',
            icon: '🔥',
            earned: maxWpm >= 100,
            color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        }
    ];

    return badges;
};

// --- Weakest Keys ---
export const getWeakestKeys = (keyErrorStats: Record<string, number>, keyAttemptStats: Record<string, number>) => {
    const errorRates = Object.entries(keyErrorStats).map(([key, errors]) => {
        const attempts = keyAttemptStats[key] || errors;
        const rate = attempts > 0 ? (errors / attempts) * 100 : 0;
        return { key, rate, errors, attempts };
    });

    // Filter for statistically significant keys (at least 5 errors) and sort by rate
    return errorRates
        .filter(k => k.errors >= 3) // Lower threshold slightly for visibility
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 3);
};

// --- Heatmap Data ---
export const getHeatmapData = (history: PracticeStats[]) => {
    const dateMap: Record<string, number> = {};

    history.forEach(session => {
        if (!session.timestamp) return;
        try {
            const date = new Date(session.timestamp);
            if (isNaN(date.getTime())) return;
            const dateStr = format(date, 'yyyy-MM-dd');
            dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
        } catch (e) {
            console.error("Invalid date for session", session);
        }
    });

    // react-activity-calendar expects { date, count, level }
    // We map counts to levels 0-4
    return Object.entries(dateMap).map(([date, count]) => {
        let level = 0;
        if (count === 0) level = 0;
        else if (count <= 2) level = 1;
        else if (count <= 5) level = 2;
        else if (count <= 10) level = 3;
        else level = 4;

        return { date, count, level };
    });
};

// --- Performance Graph Data ---
export const getPerformanceData = (history: PracticeStats[]) => {
    // Take last 20 sessions for trend line
    return history
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-20)
        .map(session => {
            try {
                const date = new Date(session.timestamp);
                return {
                    date: isNaN(date.getTime()) ? 'Unknown' : format(date, 'MMM dd'),
                    wpm: session.wpm,
                    accuracy: session.accuracy
                };
            } catch (e) {
                return { date: 'Err', wpm: session.wpm, accuracy: session.accuracy };
            }
        });
};
