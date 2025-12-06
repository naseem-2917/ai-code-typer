import React, { useContext, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { Card } from './ui/Card';
import { Stat } from './ui/Stat';
import { Button } from './ui/Button';
import { ActivityHeatmap } from './ActivityHeatmap';
import { PerformanceChart } from './PerformanceChart';
import { BadgeDisplay } from './BadgeDisplay';
import {
    calculateLevel,
    getAllBadges,
    getWeakestKeys,
    getHeatmapData,
    getPerformanceData,
    LEVELS
} from '../utils/profileUtils';
import { PencilIcon } from './icons/PencilIcon';
import { EditProfileModal } from './EditProfileModal';

export const ProfilePage: React.FC = () => {
    const { user, logout, syncStatus } = useAuth();
    const appContext = useContext(AppContext);
    const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);

    if (!appContext) throw new Error("AppContext not found");
    const { practiceHistory, keyErrorStats, keyAttemptStats, navigateTo } = appContext;

    // --- Analytics Calculations ---
    const stats = useMemo(() => {
        if (practiceHistory.length === 0) {
            return { bestWpm: 0, avgAccuracy: 0, totalSessions: 0, totalDuration: 0 };
        }
        const bestWpm = Math.max(0, ...practiceHistory.map(s => s.wpm));
        const totalAccuracy = practiceHistory.reduce((acc, curr) => acc + curr.accuracy, 0);
        const avgAccuracy = parseFloat((totalAccuracy / practiceHistory.length).toFixed(2));
        const totalDuration = practiceHistory.reduce((acc, curr) => acc + curr.duration, 0);

        return {
            bestWpm,
            avgAccuracy,
            totalSessions: practiceHistory.length, // Used for level
            totalDuration
        };
    }, [practiceHistory]);

    // Format Duration
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Calculate Level
    const levelData = useMemo(() => calculateLevel(stats.totalSessions), [stats.totalSessions]);

    // Calculate Data for Visuals
    const heatmapData = useMemo(() => getHeatmapData(practiceHistory), [practiceHistory]);
    const performanceData = useMemo(() => getPerformanceData(practiceHistory), [practiceHistory]);
    const badges = useMemo(() => getAllBadges(practiceHistory), [practiceHistory]);
    const weakestKeys = useMemo(() => getWeakestKeys(keyErrorStats, keyAttemptStats), [keyErrorStats, keyAttemptStats]);

    const handleLogout = async () => {
        await logout();
        window.location.reload();
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Card className="p-8 max-w-md w-full">
                    <h2 className="text-2xl font-bold mb-4">You are not signed in</h2>
                    <p className="text-slate-500 mb-6">Sign in to sync your progress across devices and unlock your developer profile.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6 animate-fade-in-up pb-20">
            {/* Header Section */}
            <Card className="p-6 md:p-8 relative overflow-hidden dark:bg-slate-800/80 backdrop-blur-md border-b-4 border-primary-500">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start z-10 relative">
                    <div className="relative group">
                        <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                            alt={user.displayName || "User"}
                            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-100 dark:border-slate-700 shadow-xl object-cover"
                        />
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-white dark:border-slate-800 shadow-sm">
                            Lvl {LEVELS.indexOf(levelData.currentLevel)}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-3 w-full">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                                    {user.displayName}
                                </h1>
                                <p className={`font-mono text-sm md:text-base ${levelData.currentLevel.color} font-bold mt-1 tracking-wide uppercase`}>
                                    {levelData.currentLevel.name}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditProfileOpen(true)}>
                                <PencilIcon className="w-4 h-4" />
                                Edit Profile
                            </Button>
                        </div>

                        {/* Level Progress */}
                        <div className="space-y-2 max-w-xl">
                            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <span>Progress to {levelData.nextLevel ? levelData.nextLevel.name : 'Max Level'}</span>
                                <span>{levelData.progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
                                    style={{ width: `${levelData.progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                {levelData.nextLevel
                                    ? `${levelData.nextLevel.minTests - stats.totalSessions} more sessions to level up`
                                    : 'You are at the top of the food chain!'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Decorative Background Blob */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
            </Card>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Row */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Stat
                        label="Highest WPM"
                        value={stats.bestWpm}
                        className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border-l-4 border-emerald-500"
                    />
                    <Stat
                        label="Total Time Coding"
                        value={formatDuration(stats.totalDuration)}
                        className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/10 dark:to-blue-900/10 border-l-4 border-indigo-500"
                    />
                    <Stat
                        label="Global Percentile"
                        // Placeholder logic for percentile
                        value={`${stats.bestWpm > 80 ? 'Top 5%' : stats.bestWpm > 50 ? 'Top 20%' : 'Top 50%'}`}
                        className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10 border-l-4 border-purple-500"
                    />
                </div>

                {/* Activity Heatmap */}
                <Card className="md:col-span-3 p-6 dark:bg-slate-800/50 backdrop-blur-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="text-xl">📅</span> Coding Activity
                    </h3>
                    <ActivityHeatmap data={heatmapData} />
                </Card>

                {/* Performance Chart - Takes 2 cols on large screens */}
                <Card className="md:col-span-2 p-6 dark:bg-slate-800/50 backdrop-blur-sm min-h-[350px]">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <span className="text-xl">📈</span> Recent Performance
                    </h3>
                    <PerformanceChart data={performanceData} />
                </Card>

                {/* Right Column: Weakest Keys & Badges */}
                <div className="space-y-6">
                    {/* Weakest Keys */}
                    <Card className="p-6 dark:bg-slate-800/50 backdrop-blur-sm">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="text-xl">⚠️</span> Needs Improvement
                        </h3>
                        {weakestKeys.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex justify-around">
                                    {weakestKeys.map((k, i) => (
                                        <div key={k.key} className="flex flex-col items-center gap-1 group cursor-help relative">
                                            <div className="w-12 h-12 flex items-center justify-center bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg text-xl font-mono font-bold text-red-600 dark:text-red-400 shadow-sm">
                                                {k.key === ' ' ? '␣' : k.key === '\n' ? '↵' : k.key === '\t' ? '⇥' : k.key}
                                            </div>
                                            <span className="text-xs font-semibold text-red-500">{k.rate.toFixed(1)}% err</span>

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                {k.key === ' ' ? 'Space' : k.key === '\n' ? 'Enter' : k.key === '\t' ? 'Tab' : k.key}: {k.errors} errors / {k.attempts} attempts
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full mt-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                        const keysToPractice = weakestKeys.map(k => k.key);
                                        navigateTo('practice');
                                        appContext.startTargetedSession(keysToPractice, { length: 'medium', level: 'medium' });
                                    }}
                                >
                                    Start Targeted Practice →
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500 text-sm">
                                <p>No significant weak keys found.</p>
                                <p className="text-xs opacity-70">Keep practicing!</p>
                            </div>
                        )}
                    </Card>

                    {/* Badges Preview */}
                    <Card className="p-6 dark:bg-slate-800/50 backdrop-blur-sm">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="text-xl">🏆</span> Badges
                            <span className="text-xs font-normal text-slate-500 ml-auto bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                {badges.filter(b => b.earned).length} / {badges.length}
                            </span>
                        </h3>
                        <BadgeDisplay badges={badges} />
                    </Card>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-center pt-8 border-t border-slate-200 dark:border-slate-800">
                <Button variant="ghost" className="text-slate-500 hover:text-red-500 dark:hover:text-red-400" onClick={handleLogout}>
                    Sign Out of Account
                </Button>
            </div>


            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
            />
        </div >
    );
};
