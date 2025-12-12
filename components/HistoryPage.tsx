import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { TrashIcon } from './icons/TrashIcon';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { formatShortDate } from '../utils/dateUtils';
import { exportAllData } from '../services/dataService';

const HistoryPage: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { practiceHistory, deletePracticeSession, clearPracticeHistory, navigateTo, showAlert } = context;

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'single' | 'all', timestamp?: number } | null>(null);

    const handleDeleteConfirm = () => {
        if (deleteConfirmation?.type === 'single' && deleteConfirmation.timestamp) {
            deletePracticeSession(deleteConfirmation.timestamp);
        } else if (deleteConfirmation?.type === 'all') {
            clearPracticeHistory();
        }
        setDeleteConfirmation(null);
    };

    const handleExportData = () => {
        try {
            exportAllData({
                practiceHistory,
                keyErrorStats: context.keyErrorStats, // Explicitly accessing context props if destructured above didn't include them, but they are in context
                keyAttemptStats: context.keyAttemptStats
            });
            showAlert('Data exported successfully!', 'info');
        } catch (error) {
            showAlert('Failed to export data.', 'error');
            console.error(error);
        }
    };

    const formatDuration = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    };

    // Sort history by date descending
    const sortedHistory = useMemo(() => {
        return [...practiceHistory].sort((a, b) => b.timestamp - a.timestamp);
    }, [practiceHistory]);

    return (
        <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => navigateTo('dashboard')}
                        title="Back to Dashboard"
                        accessKeyChar="ArrowLeft"
                        accessKeyLabel="←"
                    >
                        ← Back to Dashboard
                    </Button>
                    <h1 className="text-3xl font-bold">Practice History</h1>
                </div>
                {sortedHistory.length > 0 && (
                    <Button variant="destructive" onClick={() => setDeleteConfirmation({ type: 'all' })}>
                        Clear All History
                    </Button>
                )}
            </div>

            <Card className="p-6">
                {sortedHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">WPM</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Accuracy</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Language</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lines</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Errors</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {sortedHistory.map((session, index) => (
                                    <tr key={session.timestamp} className={index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800' : ''}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            {formatShortDate(session.timestamp)}
                                            <span className="block text-xs text-gray-700 dark:text-gray-300">
                                                {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">
                                            {session.wpm.toFixed(0)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.accuracy >= 95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                session.accuracy >= 90 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {session.accuracy.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            {formatDuration(session.duration)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            {session.language}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            {session.linesTyped || 0}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            {session.errors}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmation({ type: 'single', timestamp: session.timestamp })} title="Delete Session">
                                                <TrashIcon className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500">
                        <p className="text-lg mb-2">No practice history found.</p>
                        <p className="text-sm">Complete some practice sessions to see them listed here.</p>
                        <Button className="mt-4" onClick={() => navigateTo('practice')}>
                            Start Practicing
                        </Button>
                    </div>
                )}
            </Card>

            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                title={deleteConfirmation?.type === 'all' ? "Delete All History" : "Delete Session"}
                message={deleteConfirmation?.type === 'all'
                    ? (
                        <span>
                            Are you sure you want to delete ALL practice history? This action cannot be undone.
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
        </div>
    );
};

export default HistoryPage;
