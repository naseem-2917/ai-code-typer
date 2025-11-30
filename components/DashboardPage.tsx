// FIX: Implemented the DashboardPage component to display user stats.
import React, { useContext, useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Card } from './ui/Card';
import { Stat } from './ui/Stat';
import { Button } from './ui/Button';
import { GoalsModal } from './GoalsModal';
import { PencilIcon } from './icons/PencilIcon';
import { PracticeSetupModal } from './PracticeSetupModal';
import { SnippetLength, SnippetLevel } from '../types';
import { SegmentedControl } from './ui/SegmentedControl';
import { exportAllData, importData } from '../services/dataService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAccessKey } from '../hooks/useAccessKey';
import { ConfirmationModal } from './ui/ConfirmationModal';

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f97316', '#8b5cf6', '#ec4899'];

const formatSessionDuration = (totalSeconds: number) => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '0m 00s';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

// FIX: Updated tooltip to handle timestamp labels and display full session data.
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const sessionData = payload[0].payload;
        const displayLabel = new Date(sessionData.timestamp).toLocaleString([], {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
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
// FIX: Changed component type from React.FC to a plain function to fix type incompatibility with recharts Pie label prop.
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
    } = context;
    
    const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
    const [isTargetedSetupOpen, setIsTargetedSetupOpen] = useState(false);
    const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importConfirmation, setImportConfirmation] = useState<{ fileContent: string } | null>(null);

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


    useAccessKey('2', () => setTimeFilter('24h'), { disabled: isGoalsModalOpen || isTargetedSetupOpen });
    useAccessKey('7', () => setTimeFilter('7d'), { disabled: isGoalsModalOpen || isTargetedSetupOpen });
    useAccessKey('3', () => setTimeFilter('30d'), { disabled: isGoalsModalOpen || isTargetedSetupOpen });
    useAccessKey('a', () => setTimeFilter('all'), { disabled: isGoalsModalOpen || isTargetedSetupOpen });

    const handleExportData = useCallback(() => {
        try {
            exportAllData();
            showAlert('Data exported successfully!', 'info');
        } catch (error) {
            showAlert('Failed to export data.', 'error');
            console.error(error);
        }
    }, [showAlert]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    useAccessKey('E', handleExportData, { disabled: isGoalsModalOpen || isTargetedSetupOpen });
    useAccessKey('I', handleImportClick, { disabled: isGoalsModalOpen || isTargetedSetupOpen });

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
    
    const graphConfig = useMemo(() => {
        const now = new Date();
        const sortedData = filteredHistory.slice().sort((a, b) => a.timestamp - b.timestamp);

        let domain: [number | string, number | string] = [now.getTime() - 24 * 60 * 60 * 1000, now.getTime()];
        let tickFormatter = (value: any) => new Date(value).toLocaleDateString();
        let ticks: number[] | undefined = undefined;
        let xAxisType: 'number' | 'category' = 'number';
        let xDataKey = 'timestamp';
        let chartData: any[] = sortedData;

        switch (timeFilter) {
            case '24h': {
                domain = [now.getTime() - 24 * 60 * 60 * 1000, now.getTime()];
                tickFormatter = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                ticks = Array.from({ length: 7 }, (_, i) => now.getTime() - (i * 4 * 60 * 60 * 1000)).reverse();
                break;
            }
            case '7d': {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 6);
                sevenDaysAgo.setHours(0, 0, 0, 0);
                domain = [sevenDaysAgo.getTime(), now.getTime()];
                tickFormatter = (ts) => new Date(ts).toLocaleDateString([], { month: 'numeric', day: 'numeric' });
                ticks = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(sevenDaysAgo);
                    d.setDate(d.getDate() + i);
                    return d.getTime();
                });
                break;
            }
            case '30d': {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 29);
                thirtyDaysAgo.setHours(0, 0, 0, 0);
                domain = [thirtyDaysAgo.getTime(), now.getTime()];
                tickFormatter = (ts) => new Date(ts).toLocaleDateString([], { month: 'numeric', day: 'numeric' });
                ticks = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(thirtyDaysAgo);
                    d.setDate(d.getDate() + (i * 5));
                    return d.getTime();
                });
                break;
            }
            case 'all':
            default: {
                if (sortedData.length > 0) {
                    // Use index-based x-axis for equal spacing
                    chartData = sortedData.map((item, index) => ({ ...item, index: index + 1 }));
                    xDataKey = 'index';
                    xAxisType = 'number';
                    domain = ['dataMin', 'dataMax'];
                    tickFormatter = (index) => {
                        const item = chartData.find(d => d.index === index);
                        return item ? new Date(item.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) : '';
                    };
                }
                ticks = undefined;
                break;
            }
        }
        
        return { data: chartData, domain, tickFormatter, ticks, xAxisType, xDataKey };

    }, [filteredHistory, timeFilter]);
    
    const overallStats = useMemo(() => {
        if (filteredHistory.length === 0) {
            return { avgWpm: 0, avgAccuracy: 0, totalDuration: 0, sessions: 0, bestWpm: 0, totalLines: 0, totalErrors: 0 };
        }
        const totalWpm = filteredHistory.reduce((acc, curr) => acc + curr.wpm, 0);
        const totalAccuracy = filteredHistory.reduce((acc, curr) => acc + curr.accuracy, 0);
        const totalDuration = filteredHistory.reduce((acc, curr) => acc + curr.duration, 0);
        const bestWpm = Math.max(0, ...filteredHistory.map(s => s.wpm));
        const totalLines = filteredHistory.reduce((acc, curr) => acc + curr.linesTyped, 0);
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

    const errorAnalysis = useMemo(() => {
        if (practiceHistory.length === 0) return [];
        
        return Object.entries(keyErrorStats)
            .map(([key, errors]) => {
                const attempts = keyAttemptStats[key] || errors;
                const numericErrors = Number(errors);
                const numericAttempts = Number(attempts);
                const errorRate = numericAttempts > 0 ? (numericErrors / numericAttempts) * 100 : 0;
                return { key, errors: numericErrors, attempts: numericAttempts, errorRate };
            })
            .filter(item => item.attempts > 2)
            .sort((a, b) => b.errorRate - a.errorRate)
            .slice(0, 5);
    }, [keyErrorStats, keyAttemptStats, practiceHistory]);
    
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

    const handleStartTargetedPractice = (length: SnippetLength, level: SnippetLevel) => {
        setIsTargetedSetupOpen(false);
        const keysToPractice = errorAnalysis.map(k => k.key);
        if(keysToPractice.length > 0) {
            navigateTo('practice');
            startTargetedSession(keysToPractice, { length, level });
        }
    };
    
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
                        onClick={() => navigateTo('practice')}
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
                    >
                        Import Data
                    </Button>
                </div>
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
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <h1 className="text-3xl font-bold">Your Progress Dashboard</h1>
                    <SegmentedControl
                        options={filterOptions}
                        selectedValue={timeFilter}
                        onSelect={(value) => setTimeFilter(value as any)}
                        accessKeyChars={filterAccessKeys}
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
                            <Card className="lg:col-span-2 p-6">
                                <h2 className="text-xl font-semibold mb-4">Historical Performance</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={graphConfig.data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                                        <XAxis
                                            type={graphConfig.xAxisType}
                                            dataKey={graphConfig.xDataKey}
                                            domain={graphConfig.domain}
                                            ticks={graphConfig.ticks}
                                            tickFormatter={graphConfig.tickFormatter}
                                            padding={{ left: 20, right: 20 }}
                                        />
                                        <YAxis yAxisId="left" label={{ value: 'WPM', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} />
                                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Accuracy (%)', angle: -90, position: 'insideRight', style: { textAnchor: 'middle' } }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="wpm" stroke="#10b981" name="WPM" dot={true} />
                                        <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#3b82f6" name="Accuracy" dot={true} />
                                    </LineChart>
                                </ResponsiveContainer>
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
                                                    <span className={`text-sm font-bold ${accuracyGoalAchieved ? 'text-amber-500' : ''}`}>{accuracyGoalAchieved ? 'Goal Achieved!' : `${accuracyProgress.toFixed(0)}%`}</span>
                                                    {accuracyGoalAchieved && accuracyIncreaseAmount > 0 && (
                                                        <Button variant="ghost" size="sm" className="!py-0 !px-2 !h-auto" onClick={() => setGoals(wpmGoal, Math.min(100, accuracyGoal + accuracyIncreaseAmount), timeGoal)} title={`Increase accuracy goal by ${accuracyIncreaseAmount}%`}>
                                                            +{accuracyIncreaseAmount}%
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                                <div className={`h-2.5 rounded-full ${accuracyGoalAchieved ? 'bg-amber-400' : 'bg-primary-500'}`} style={{ width: `${accuracyProgress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Language Focus</h2>
                                    {languageFocus.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie 
                                                    data={languageFocus} 
                                                    dataKey="value" 
                                                    nameKey="name" 
                                                    cx="50%" 
                                                    cy="50%" 
                                                    outerRadius={60}
                                                    fill="#8884d8" 
                                                    labelLine={false}
                                                    label={renderCustomizedLabel}
                                                >
                                                    {languageFocus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => overallStats.totalDuration > 0 ? `${(value / overallStats.totalDuration * 100).toFixed(2)}%` : '0.00%'} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-[200px] flex items-center justify-center text-slate-500">No language data for this period.</div>
                                    )}
                                </Card>
                            </div>
                        </div>

                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-4">Practice History</h2>
                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-slate-100 dark:bg-slate-700 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Language</th>
                                            <th scope="col" className="px-6 py-3">WPM</th>
                                            <th scope="col" className="px-6 py-3">Accuracy</th>
                                            <th scope="col" className="px-6 py-3">Errors</th>
                                            <th scope="col" className="px-6 py-3">Duration</th>
                                            <th scope="col" className="px-6 py-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistory.slice().reverse().map((session, index) => (
                                            <tr key={`${session.timestamp}-${index}`} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/50 text-gray-800 dark:text-gray-300">
                                                <td className="px-6 py-4">{session.language}</td>
                                                <td className="px-6 py-4 font-medium">{session.wpm}</td>
                                                <td className="px-6 py-4">{session.accuracy.toFixed(2)}%</td>
                                                <td className="px-6 py-4">{session.errors}</td>
                                                <td className="px-6 py-4">{formatSessionDuration(session.duration)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{new Date(session.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </>
                )}

                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Targeted Practice Area</h2>
                    {errorAnalysis.length > 0 ? (
                        <>
                            <p className="text-sm text-slate-500 mb-4">Here are your top 5 weakest keys based on error rate. Start a targeted session to improve!</p>
                            <div className="space-y-2">
                                {errorAnalysis.map(({ key, errorRate }) => (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                        <span className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded w-24 text-center">{displayKey(key)}</span>
                                        <div className="w-full mx-4 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                            <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, errorRate * 5)}%` }}></div>
                                        </div>
                                        <span className="font-semibold w-28 text-right">{errorRate.toFixed(1)}% error rate</span>
                                    </div>
                                ))}
                            </div>
                            <Button className="mt-6 w-full" onClick={() => setIsTargetedSetupOpen(true)}>
                                Practice These Keys
                            </Button>
                        </>
                    ) : (
                        <p className="text-slate-500">Not enough data for error analysis. Keep practicing!</p>
                    )}
                </Card>

                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Data Management</h2>
                    <p className="text-sm text-slate-500 mb-4">Save your practice history, goals, and settings to a file, or import them on another device.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handleExportData} accessKeyChar="E">
                            Export Data
                        </Button>
                        <Button variant="secondary" onClick={handleImportClick} accessKeyChar="I">
                            Import Data
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json,application/json"
                            onChange={handleFileImport}
                        />
                    </div>
                </Card>
                
                <GoalsModal
                    isOpen={isGoalsModalOpen}
                    onClose={() => setIsGoalsModalOpen(false)}
                    onSave={(wpm, acc, time) => { setGoals(wpm, acc, time); setIsGoalsModalOpen(false); }}
                    currentWpmGoal={wpmGoal}
                    currentAccuracyGoal={accuracyGoal}
                    currentTimeGoal={timeGoal}
                />
                
                <PracticeSetupModal
                  isOpen={isTargetedSetupOpen}
                  onClose={() => setIsTargetedSetupOpen(false)}
                  onStart={(length, level) => handleStartTargetedPractice(length!, level!)}
                  variant="targeted"
                />
            </div>

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
        </>
    );
};

export default DashboardPage;