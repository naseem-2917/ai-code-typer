import React, { useContext, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import { Card } from './ui/Card';
import { Stat } from './ui/Stat';
import { Button } from './ui/Button';

export const ProfilePage: React.FC = () => {
    const { user, logout, syncStatus } = useAuth();
    const appContext = useContext(AppContext);

    if (!appContext) throw new Error("AppContext not found");
    const { practiceHistory } = appContext;

    const stats = useMemo(() => {
        if (practiceHistory.length === 0) {
            return { bestWpm: 0, avgAccuracy: 0, totalSessions: 0 };
        }
        const bestWpm = Math.max(0, ...practiceHistory.map(s => s.wpm));
        const totalAccuracy = practiceHistory.reduce((acc, curr) => acc + curr.accuracy, 0);
        const avgAccuracy = parseFloat((totalAccuracy / practiceHistory.length).toFixed(2));

        return {
            bestWpm,
            avgAccuracy,
            totalSessions: practiceHistory.length
        };
    }, [practiceHistory]);

    const handleLogout = async () => {
        await logout();
        window.location.reload(); // Quick way to reset state and return to guest mode
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Card className="p-8 max-w-md w-full">
                    <h2 className="text-2xl font-bold mb-4">You are not signed in</h2>
                    <p className="text-slate-500 mb-6">Sign in to sync your progress across devices.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8 animate-fade-in-up">
            {/* Profile Header */}
            <Card className="p-8 flex flex-col items-center sm:flex-row sm:items-start gap-6 border-b-4 border-primary-500">
                <div className="relative">
                    <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                        alt={user.displayName || "User"}
                        className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 shadow-lg"
                    />
                    <div className="absolute bottom-0 right-0 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full border border-white dark:border-slate-800 shadow-sm">
                        Pro
                    </div>
                </div>

                <div className="flex-grow text-center sm:text-left space-y-2">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">
                        {user.displayName}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {user.email}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors
                            ${syncStatus === 'synced' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {syncStatus === 'synced' && (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Cloud Synced
                                </>
                            )}
                            {syncStatus === 'syncing' && (
                                <>
                                    <span className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                                    Syncing...
                                </>
                            )}
                            {syncStatus === 'idle' && (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    Sync Idle
                                </>
                            )}
                            {syncStatus === 'error' && (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Sync Error
                                </>
                            )}
                        </span>
                        <span className="text-xs text-slate-400">
                            Member since {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Stat
                    label="Best WPM"
                    value={stats.bestWpm}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                />
                <Stat
                    label="Avg Accuracy"
                    value={`${stats.avgAccuracy}%`}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
                />
                <Stat
                    label="Total Sessions"
                    value={stats.totalSessions}
                    className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20"
                />
            </div>

            {/* Actions */}
            <div className="flex justify-center pt-8">
                <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleLogout}
                    className="w-full sm:w-auto min-w-[200px] shadow-md hover:shadow-xl transition-all"
                >
                    Sign Out
                </Button>
            </div>
        </div>
    );
};
