import React, { useContext, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Card } from './ui/Card';
import { Stat } from './ui/Stat';
import { Button } from './ui/Button';
import { GoalsModal } from './GoalsModal';
import { PencilIcon } from './icons/PencilIcon';

import { SnippetLength, SnippetLevel, PracticeMode, ContentType } from '../types';
import { SegmentedControl } from './ui/SegmentedControl';
import { exportAllData, importData } from '../services/dataService';
import { PerformanceChart } from './PerformanceChart';
import { useAccessKey } from '../hooks/useAccessKey';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { TrashIcon } from './icons/TrashIcon';
import { Modal } from './ui/Modal';
import { formatDate, formatDateTime, formatShortDate } from '../utils/dateUtils';

import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    Tooltip
} from 'recharts';

const COLORS = ['#a855f7', '#6366f1', '#ec4899', '#f97316', '#06b6d4', '#10b981'];

const formatSessionDuration = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0m 00s';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const sessionData = payload[0].payload;
        const displayLabel = formatDateTime(sessionData.timestamp);
        return (
            <div className="p-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-md text-sm">
                <p className="label font-semibold">{`${displayLabel}`}</p>
                <p className="text-primary-500">{`WPM: ${sessionData.wpm}`}</p>
                <p className="text-blue-500">{`Accuracy: ${sessionData.accuracy.toFixed(2)}%`}</p>
                <p className="text-red-500">{`Errors: ${sessionData.errors}`}</p>
                <p className="text-slate-500 dark:text-slate-400">{`Duration: ${formatSessionDuration(sessionData.duration)}`}</p>
            </div>
        );
    }
    return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, fill, percent, name }: any) => {
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    if (percent < 0.02) {
        return null;
    }

    return (
        <g>
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill="#64748b" className="dark:fill-slate-400 text-xs" dy={-6}>
                {name}
            </text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={10} textAnchor={textAnchor} fill="#1e293b" className="dark:fill-slate-200 font-bold text-sm">
                {`${(percent * 100).toFixed(2)}%`}
            </text>
        </g>
    );
};

const displayKey = (key: string): string => {
    switch (key) {
        case ' ':
            return 'Space (␣)';
        case '\n':
            return 'Enter (↵)';
        case '\t':
            return 'Tab (⇥)';
        default:
            return key;
    }
};


const DashboardPage: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const {
        practiceHistory,
        keyErrorStats,
        keyAttemptStats,
        wpmGoal,
        accuracyGoal,
        timeGoal,
        dailyPracticeTime,
        setGoals,
        navigateTo,
        startTargetedSession,
        showAlert,
        reloadDataFromStorage,
        deletePracticeSession,
        clearPracticeHistory,
        openSetupModal,
        fetchNewSnippet,
        startCustomSession,
        closeSetupModal,
        isSetupModalOpen,
    } = context;

    const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    // Targeted practice now starts directly, no modal needed
    const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importConfirmation, setImportConfirmation] = useState<{ fileContent: string } | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'single' | 'all', timestamp?: number } | null>(null);

    const [focusedButtonIndex, setFocusedButtonIndex] = useState(0);
    const startButtonRef = useRef<HTMLButtonElement>(null);
    const importButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (practiceHistory.length === 0) {
            startButtonRef.current?.focus();
        }
    }, [practiceHistory.length]);

    useEffect(() => {
        if (practiceHistory.length > 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                setFocusedButtonIndex(prev => (prev === 0 ? 1 : 0));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [practiceHistory.length]);

    useEffect(() => {
        if (practiceHistory.length > 0) return;

        if (focusedButtonIndex === 0) {
            startButtonRef.current?.focus();
        } else {
            importButtonRef.current?.focus();
        }
    }, [focusedButtonIndex, practiceHistory.length]);


    useAccessKey('2', () => setTimeFilter('24h'), { disabled: isGoalsModalOpen || isSetupModalOpen });
    useAccessKey('7', () => setTimeFilter('7d'), { disabled: isGoalsModalOpen || isSetupModalOpen });
    useAccessKey('3', () => setTimeFilter('30d'), { disabled: isGoalsModalOpen || isSetupModalOpen });
    useAccessKey('a', () => setTimeFilter('all'), { disabled: isGoalsModalOpen || isSetupModalOpen });

    const handleExportData = useCallback(() => {
        try {
            exportAllData({
                practiceHistory,
                keyErrorStats,
                keyAttemptStats
            });
            showAlert('Data exported successfully!', 'info');
        } catch (error) {
            showAlert('Failed to export data.', 'error');
            console.error(error);
        }
    }, [showAlert, practiceHistory, keyErrorStats, keyAttemptStats]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    useAccessKey('E', handleExportData, { disabled: isGoalsModalOpen || isSetupModalOpen });
    useAccessKey('I', handleImportClick, { disabled: isGoalsModalOpen || isSetupModalOpen });



    const finishImport = (fileContent: string, mode: 'merge' | 'replace') => {
        try {
            importData(fileContent, mode);
            reloadDataFromStorage(); // This forces the app state to update from localStorage
            showAlert('Data imported successfully. Please refresh the page to see changes.', 'info', 8000);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            showAlert(`Import failed: ${message}`, 'error');
            console.error(error);
        }
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileContent = e.target?.result as string;
            if (!fileContent) {
                showAlert('File is empty or could not be read.', 'error');
                return;
            }

            const existingHistory = localStorage.getItem('practiceHistory');
            const hasExistingHistory = existingHistory && JSON.parse(existingHistory).length > 0;

            if (hasExistingHistory) {
                setImportConfirmation({ fileContent });
            } else {
                // If there's no history, just replace/add.
                finishImport(fileContent, 'replace');
            }

            // Reset file input to allow re-uploading the same file
            if (event.target) {
                event.target.value = '';
            }
        };
        reader.onerror = () => {
            showAlert('Error reading the selected file.', 'error');
            if (event.target) {
                event.target.value = '';
            }
        };

        reader.readAsText(file);
    };

    const handleImportConfirm = (mode: 'merge' | 'replace') => {
        if (importConfirmation) {
            finishImport(importConfirmation.fileContent, mode);
        }
        setImportConfirmation(null); // Close the modal
    };

    const handleDeleteClick = (timestamp: number) => {
        setDeleteConfirmation({ type: 'single', timestamp });
    };

    const handleDeleteAllClick = () => {
        setDeleteConfirmation({ type: 'all' });
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirmation?.type === 'single' && deleteConfirmation.timestamp) {
            deletePracticeSession(deleteConfirmation.timestamp);
            showAlert('Session deleted.', 'info');
            setDeleteConfirmation(null);
        } else if (deleteConfirmation?.type === 'all') {
            localStorage.clear();
            window.location.reload();
        }
    };


    const filteredHistory = useMemo(() => {
        const now = Date.now();
        if (timeFilter === '24h') {
            return practiceHistory.filter(p => now - p.timestamp < 24 * 60 * 60 * 1000);
        }
        if (timeFilter === '7d') {
            return practiceHistory.filter(p => now - p.timestamp < 7 * 24 * 60 * 60 * 1000);
        }
        if (timeFilter === '30d') {
            return practiceHistory.filter(p => now - p.timestamp < 30 * 24 * 60 * 60 * 1000);
        }
        return practiceHistory;
    }, [practiceHistory, timeFilter]);

    const overallStats = useMemo(() => {
        if (filteredHistory.length === 0) {
            return { avgWpm: 0, avgAccuracy: 0, totalDuration: 0, sessions: 0, bestWpm: 0, totalLines: 0, totalErrors: 0 };
        }
        const totalWpm = filteredHistory.reduce((acc, curr) => acc + curr.wpm, 0);
        const totalAccuracy = filteredHistory.reduce((acc, curr) => acc + curr.accuracy, 0);
        const totalDuration = filteredHistory.reduce((acc, curr) => acc + curr.duration, 0);
        const bestWpm = Math.max(0, ...filteredHistory.map(s => s.wpm));
        // FIX: Ensure linesTyped is handled safely (default to 0 if undefined)
        const totalLines = filteredHistory.reduce((acc, curr) => acc + (curr.linesTyped || 0), 0);
        const totalErrors = filteredHistory.reduce((acc, curr) => acc + curr.errors, 0);

        return {
            avgWpm: Math.round(totalWpm / filteredHistory.length),
            avgAccuracy: parseFloat((totalAccuracy / filteredHistory.length).toFixed(2)),
            totalDuration,
            sessions: filteredHistory.length,
            bestWpm,
            totalLines,
            totalErrors,
        };
    }, [filteredHistory]);

    const sortedErrorStats = useMemo(() => {
        if (practiceHistory.length === 0) return [];

        return Object.entries(keyErrorStats)
            .map(([key, errors]) => {
                const attempts = keyAttemptStats[key] || errors;
                const numericErrors = Number(errors);
                const numericAttempts = Number(attempts);
                const errorRate = numericAttempts > 0 ? (numericErrors / numericAttempts) * 100 : 0;
                return { key, errors: numericErrors, attempts: numericAttempts, errorRate };
            })
            .filter(item => item.errors > 0)
            .sort((a, b) => b.errorRate - a.errorRate);
    }, [keyErrorStats, keyAttemptStats, practiceHistory]);

    const errorAnalysis = useMemo(() => sortedErrorStats.slice(0, 5), [sortedErrorStats]);

    const languageFocus = useMemo(() => {
        if (filteredHistory.length === 0) return [];
        const focusMap: Record<string, number> = {};
        filteredHistory.forEach(session => {
            focusMap[session.language] = (focusMap[session.language] || 0) + session.duration;
        });
        return Object.entries(focusMap).map(([name, value]) => ({ name, value }));
    }, [filteredHistory]);

    const formatDuration = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const handleStartTargetedPractice = () => {
        const keysToPractice = errorAnalysis.map(k => k.key);
        if (keysToPractice.length > 0) {
            navigateTo('practice');
            // Default to medium length and medium difficulty for quick practice
            startTargetedSession(keysToPractice, { length: 'medium', level: 'medium' });
        }
    };

    const graphConfig = useMemo(() => {
        const now = new Date();
        const sortedData = filteredHistory.slice().sort((a, b) => a.timestamp - b.timestamp);
        let chartData = sortedData;

        let xAxisType: 'number' | 'category' = 'number';
        let xDataKey = 'timestamp';
        let domain: [number | string, number | string] = ['auto', 'auto'];
        let ticks: number[] | undefined = undefined;
        let tickFormatter: (value: any, index: number) => string = (value: any) => formatShortDate(value);

        // Helper for smart date formatting (show year only on change)
        const smartTickFormatter = (timestamp: number, index: number, ticksArray: number[]) => {
            if (!timestamp) return '';
            const date = new Date(timestamp);
            const dayMonth = `${date.getDate()}/${date.getMonth() + 1}`;

            // Always show year for the very first tick if it's not the current year
            if (index === 0) {
                const currentYear = new Date().getFullYear();
                if (date.getFullYear() !== currentYear) {
                    return formatShortDate(timestamp);
                }
                return dayMonth;
            }

            // Check if year changed from previous tick
            // We need access to the previous tick. 
            // In Recharts, if ticks are explicitly provided, we can use the ticks array from closure if available, 
            // but Recharts tickFormatter passes index of the tick being rendered.
            // If ticks are generated (like in 7d/30d), we have them. 

            const prevTimestamp = ticksArray[index - 1];
            if (prevTimestamp) {
                const prevDate = new Date(prevTimestamp);
                if (prevDate.getFullYear() !== date.getFullYear()) {
                    return formatShortDate(timestamp);
                }
            }

            return dayMonth;
        };

        const createSmartFormatter = (generatedTicks: number[]) => {
            return (value: any, index: number) => smartTickFormatter(value, index, generatedTicks);
        };

        switch (timeFilter) {
            case '24h':
                domain = [now.getTime() - 24 * 60 * 60 * 1000, now.getTime()];
                tickFormatter = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                ticks = Array.from({ length: 7 }, (_, i) => now.getTime() - (i * 4 * 60 * 60 * 1000)).reverse();
                break;
            case '7d': {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                domain = [sevenDaysAgo.getTime(), now.getTime()];

                ticks = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(sevenDaysAgo);
                    d.setDate(d.getDate() + i);
                    return d.getTime();
                });
                tickFormatter = createSmartFormatter(ticks);
                break;
            }
            case '30d': {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 29);
                thirtyDaysAgo.setHours(0, 0, 0, 0);
                domain = [thirtyDaysAgo.getTime(), now.getTime()];

                ticks = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(thirtyDaysAgo);
                    d.setDate(d.getDate() + (i * 5));
                    return d.getTime();
                });
                tickFormatter = createSmartFormatter(ticks);
                break;
            }
            case 'all': {
                domain = ['auto', 'auto'];
                // For 'all', we don't have explicit ticks upfront easily, relies on data points.
                // But we can approximate or just use simple formatShortDate as fallback or category logic.
                // Using simple d/m for now to meet "no year" preference unless critical. 
                // However, without explicit ticks array, 'index' refers to data index if category?
                // If xAxisType is category, ticks are the data points.
                xAxisType = 'category';
                tickFormatter = (value, index) => {
                    // For category axis, we can check previous data point from sortedData
                    if (index > 0 && sortedData[index - 1]) {
                        const prevDate = new Date(sortedData[index - 1].timestamp);
                        const currDate = new Date(value);
                        if (prevDate.getFullYear() !== currDate.getFullYear()) {
                            return formatShortDate(value);
                        }
                    }
                    const d = new Date(value);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                };
                break;
            }
        }
        return { data: chartData, xAxisType, xDataKey, domain, ticks, tickFormatter };
    }, [filteredHistory, timeFilter]);

    const wpmProgress = wpmGoal > 0 ? Math.min(100, (overallStats.avgWpm / wpmGoal) * 100) : 0;
    const accuracyProgress = accuracyGoal > 0 ? Math.min(100, (overallStats.avgAccuracy / accuracyGoal) * 100) : 0;
    const timeGoalInSeconds = timeGoal * 60;
    const timeProgress = timeGoalInSeconds > 0 ? Math.min(100, (dailyPracticeTime / timeGoalInSeconds) * 100) : 0;

    const wpmGoalAchieved = overallStats.avgWpm > wpmGoal;
    const accuracyGoalAchieved = overallStats.avgAccuracy >= accuracyGoal; // Unchanged as per spec
    const timeGoalAchieved = dailyPracticeTime > timeGoalInSeconds;

    // Dynamic WPM Goal Suggestion
    let wpmIncreaseAmount = 0;
    let newWpmGoal = 0;
    if (wpmGoalAchieved) {
        newWpmGoal = Math.floor(overallStats.avgWpm / 10) * 10 + 10;
        wpmIncreaseAmount = newWpmGoal - wpmGoal;
    }

    // Dynamic Time Goal Suggestion
    let timeIncreaseAmount = 0;
    let newTimeGoal = 0;
    if (timeGoalAchieved) {
        const dailyPracticeMinutes = dailyPracticeTime / 60;
        newTimeGoal = Math.floor(dailyPracticeMinutes / 5) * 5 + 5;
        timeIncreaseAmount = newTimeGoal - timeGoal;
    }

    const accuracyIncreaseAmount = Math.min(5, 100 - accuracyGoal);

    if (practiceHistory.length === 0) {
        return (
            <div className="text-center p-8 h-full flex flex-col justify-center items-center">
                <h2 className="text-2xl font-bold mb-4">Your Dashboard</h2>
                <p className="text-slate-500 mb-6">You haven't completed any practice sessions yet. Start a new session or import your previous data.</p>
                <div className="flex gap-4">
                    <Button
                        ref={startButtonRef}
                        variant={focusedButtonIndex === 0 ? 'primary' : 'secondary'}
                        onClick={() => {
                            openSetupModal();
                        }}
                        onFocus={() => setFocusedButtonIndex(0)}
                        onMouseEnter={() => setFocusedButtonIndex(0)}
                        accessKeyChar="Enter"
                        accessKeyLabel="↵"
                    >
                        Start Practicing
                    </Button>
                    <Button
                        ref={importButtonRef}
                        variant={focusedButtonIndex === 1 ? 'primary' : 'secondary'}
                        onClick={handleImportClick}
                        onFocus={() => setFocusedButtonIndex(1)}
                        onMouseEnter={() => setFocusedButtonIndex(1)}
                        accessKeyChar="I"
                        title="Import Data (Alt+I)"
                    >
                        Import Data
                    </Button>
                </div>
                {/* Hidden file input for import functionality */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json,application/json"
                    onChange={handleFileImport}
                />
            </div>
        );
    }

    const filterOptions = [
        { label: 'Last 24 Hrs', value: '24h' },
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' },
        { label: 'All Time', value: 'all' },
    ];
    const filterAccessKeys = ['2', '7', '3', 'A'];

    return (
        <>
            <div className="space-y-8 h-full overflow-y-auto custom-scrollbar p-4">
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <h1 className="text-3xl font-bold">Your Progress Dashboard</h1>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleImportClick} title="Import Data (Alt+I)" accessKeyChar="I">
                                Import
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExportData} title="Export Data (Alt+E)" accessKeyChar="E">
                                Export
                            </Button>
                        </div>
                    </div>
                    <SegmentedControl
                        options={filterOptions}
                        selectedValue={timeFilter}
                        onSelect={(value) => setTimeFilter(value as any)}
                        accessKeyChars={filterAccessKeys}
                        disabled={isSetupModalOpen}
                    />
                </div>

                {filteredHistory.length === 0 ? (
                    <Card className="p-8 text-center text-slate-500">
                        No practice sessions found for the selected time period.
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <Stat label="Average WPM" value={overallStats.avgWpm} />
                            <Stat label="Average Accuracy" value={`${overallStats.avgAccuracy}%`} />
                            <Stat label="Best WPM" value={overallStats.bestWpm} />
                            <Stat label="Total Practice Time" value={formatDuration(overallStats.totalDuration)} />
                            <Stat label="Total Lines Typed" value={overallStats.totalLines} />
                            <Stat label="Total Errors" value={overallStats.totalErrors} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            <Card className="lg:col-span-2 p-6 flex flex-col justify-center min-h-[450px]">
                                <h2 className="text-xl font-semibold mb-4">Historical Performance</h2>
                                <PerformanceChart
                                    data={graphConfig.data}
                                    xDataKey={graphConfig.xDataKey}
                                    xAxisConfig={{
                                        type: graphConfig.xAxisType,
                                        domain: graphConfig.domain,
                                        ticks: graphConfig.ticks,
                                        tickFormatter: graphConfig.tickFormatter
                                    }}
                                />
                            </Card>

                            <div className="space-y-8">
                                <Card className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold">Your Goals</h2>
                                        <Button variant="ghost" size="icon" onClick={() => setIsGoalsModalOpen(true)}>
                                            <PencilIcon className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-medium">Daily Time: {formatSessionDuration(dailyPracticeTime)} / {timeGoal}m</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${dailyPracticeTime >= timeGoalInSeconds ? 'text-amber-500' : ''}`}>{dailyPracticeTime >= timeGoalInSeconds ? 'Goal Achieved!' : `${timeProgress.toFixed(0)}%`}</span>
                                                    {timeGoalAchieved && timeIncreaseAmount > 0 && (
                                                        <Button variant="ghost" size="sm" className="!py-0 !px-2 !h-auto" onClick={() => setGoals(wpmGoal, accuracyGoal, newTimeGoal)} title={`Increase daily time goal to ${newTimeGoal} minutes`}>
                                                            +{timeIncreaseAmount} min
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                                <div className={`h-2.5 rounded-full ${dailyPracticeTime >= timeGoalInSeconds ? 'bg-amber-400' : 'bg-primary-500'}`} style={{ width: `${timeProgress}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-medium">WPM: {overallStats.avgWpm} / {wpmGoal}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${overallStats.avgWpm >= wpmGoal ? 'text-amber-500' : ''}`}>{overallStats.avgWpm >= wpmGoal ? 'Goal Achieved!' : `${wpmProgress.toFixed(0)}%`}</span>
                                                    {wpmGoalAchieved && wpmIncreaseAmount > 0 && (
                                                        <Button variant="ghost" size="sm" className="!py-0 !px-2 !h-auto" onClick={() => setGoals(newWpmGoal, accuracyGoal, timeGoal)} title={`Increase WPM goal to ${newWpmGoal}`}>
                                                            +{wpmIncreaseAmount} WPM
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                                <div className={`h-2.5 rounded-full ${overallStats.avgWpm >= wpmGoal ? 'bg-amber-400' : 'bg-primary-500'}`} style={{ width: `${wpmProgress}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-sm font-medium">Accuracy: {overallStats.avgAccuracy}% / {accuracyGoal}%</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-bold ${overallStats.avgAccuracy >= accuracyGoal ? 'text-amber-500' : ''}`}>{overallStats.avgAccuracy >= accuracyGoal ? 'Goal Achieved!' : `${accuracyProgress.toFixed(0)}%`}</span>
                                                    {accuracyGoalAchieved && accuracyIncreaseAmount > 0 && (
                                                        <Button variant="ghost" size="sm" className="!py-0 !px-2 !h-auto" onClick={() => setGoals(wpmGoal, accuracyGoal + accuracyIncreaseAmount, timeGoal)} title={`Increase Accuracy goal to ${accuracyGoal + accuracyIncreaseAmount}%`}>
                                                            +{accuracyIncreaseAmount}%
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                                <div className={`h-2.5 rounded-full ${overallStats.avgAccuracy >= accuracyGoal ? 'bg-amber-400' : 'bg-primary-500'}`} style={{ width: `${accuracyProgress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold">Language Focus</h2>
                                    </div>
                                    {languageFocus.length > 0 ? (
                                        <div className="flex justify-center w-full">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={languageFocus}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        nameKey="name"
                                                        label={renderCustomizedLabel}
                                                    >
                                                        {languageFocus.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => formatDuration(value as number)} />
                                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <p className="text-center text-slate-500">No language data available for this period.</p>
                                    )}
                                </Card>


                            </div>
                        </div>



                        <Card className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Error Analysis</h2>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setIsErrorModalOpen(true)}>
                                        View All
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={handleStartTargetedPractice} disabled={errorAnalysis.length === 0} title="Practice your weakest keys immediately">
                                        Practice Errors
                                    </Button>
                                </div>
                            </div>
                            {errorAnalysis.length > 0 ? (
                                <div className="space-y-4">
                                    {errorAnalysis.map((error, index) => (
                                        <div key={index} className="space-y-1">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                                                    {displayKey(error.key)}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-400 text-xs">
                                                    {error.errors} Errors / {error.attempts} Attempts ({error.errorRate.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-red-500 h-1.5 rounded-full"
                                                    style={{ width: `${Math.min(100, error.errorRate)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                    {sortedErrorStats.length > 5 && (
                                        <p className="text-xs text-center text-slate-500 mt-2">
                                            + {sortedErrorStats.length - 5} other keys needing practice
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500">No significant errors found for this period.</p>
                            )}
                        </Card>

                        <Card className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Recent Sessions</h2>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => navigateTo('history')}>
                                        View All
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmation({ type: 'all' })}>
                                        Clear All History
                                    </Button>
                                </div>
                            </div>
                            {filteredHistory.length > 0 ? (
                                <div className="w-full">
                                    <table className="w-full divide-y divide-slate-200 dark:divide-slate-700 table-fixed">
                                        <thead>
                                            <tr>
                                                <th className="w-1/4 px-2 sm:px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="w-1/6 px-2 sm:px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">WPM</th>
                                                <th className="w-1/6 px-2 sm:px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acc</th>
                                                <th className="hidden lg:table-cell w-1/6 px-2 sm:px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                                                <th className="hidden xl:table-cell w-1/6 px-2 sm:px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Language</th>
                                                <th className="hidden md:table-cell w-1/6 px-2 sm:px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Errors</th>
                                                <th className="w-16 px-2 sm:px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {filteredHistory
                                                .sort((a, b) => b.timestamp - a.timestamp)
                                                .slice(0, 5)
                                                .map((session, index) => (
                                                    <tr key={session.id} className={index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800' : ''}>
                                                        <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                                            {formatShortDate(session.date)}
                                                        </td>
                                                        <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{session.wpm.toFixed(0)}</td>
                                                        <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{session.accuracy.toFixed(1)}%</td>
                                                        <td className="hidden lg:table-cell px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{formatSessionDuration(session.duration)}</td>
                                                        <td className="hidden xl:table-cell px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{session.language}</td>
                                                        <td className="hidden md:table-cell px-2 sm:px-4 py-2 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{session.errors}</td>
                                                        <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-center text-sm font-medium">
                                                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmation({ type: 'single', timestamp: session.timestamp })}>
                                                                <TrashIcon className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}

                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center text-slate-500">No recent sessions for this period.</p>
                            )}
                        </Card>
                    </>
                )}
            </div >



            <GoalsModal
                isOpen={isGoalsModalOpen}
                onClose={() => setIsGoalsModalOpen(false)}
                onSave={(wpm, acc, time) => { setGoals(wpm, acc, time); setIsGoalsModalOpen(false); }}
                currentWpmGoal={wpmGoal}
                currentAccuracyGoal={accuracyGoal}
                currentTimeGoal={timeGoal}
            />

            <Modal
                isOpen={isErrorModalOpen}
                onClose={() => setIsErrorModalOpen(false)}
                title="All Error Stats"
            >
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {sortedErrorStats.length > 0 ? (
                        <div className="space-y-3">
                            {sortedErrorStats.map((error, index) => (
                                <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-lg text-lg font-semibold text-slate-800 dark:text-slate-200">
                                                {displayKey(error.key)}
                                            </span>
                                            <span className="text-red-600 dark:text-red-400 font-bold text-base">
                                                {error.errorRate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                        <div className="text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">Errors:</span> {error.errors}
                                        </div>
                                        <div className="text-slate-600 dark:text-slate-400">
                                            <span className="font-medium">Attempts:</span> {error.attempts}
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, error.errorRate)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-8">No error data available.</p>
                    )}
                </div>
                <div className="mt-6 flex justify-center">
                    <Button variant="secondary" onClick={() => setIsErrorModalOpen(false)} accessKeyChar="C" autoFocus>
                        Close
                    </Button>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!importConfirmation}
                onClose={() => setImportConfirmation(null)}
                title="Import Data"
                message="You have existing practice history. How would you like to import the new data?"
                buttons={[
                    { label: 'Merge', onClick: () => handleImportConfirm('merge'), variant: 'primary' },
                    { label: 'Replace', onClick: () => handleImportConfirm('replace'), variant: 'secondary' },
                ]}
            />

            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                title={deleteConfirmation?.type === 'all' ? "Delete All History" : "Delete Session"}
                message={deleteConfirmation?.type === 'all'
                    ? (
                        <span>
                            Are you sure you want to delete ALL practice history? This action cannot be undone and will reset the website to a fresh state.
                            <br /><br />
                            To prevent data loss, we recommend you <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium" onClick={handleExportData}>Export</span> your data first.
                        </span>
                    )
                    : "Are you sure you want to delete this practice session?"}
                buttons={[
                    { label: 'Cancel', onClick: () => setDeleteConfirmation(null), variant: 'secondary' },
                    { label: 'Delete', onClick: handleDeleteConfirm, variant: 'primary', className: 'bg-red-600 hover:bg-red-700 text-white' },
                ]}
            />
            {/* Hidden file input for import functionality - always rendered */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json,application/json"
                onChange={handleFileImport}
            />
        </>
    );
};

export default DashboardPage;
