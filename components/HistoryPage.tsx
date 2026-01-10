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

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'single' | 'all' | 'selected', timestamp?: number } | null>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    const handleDeleteConfirm = () => {
        if (deleteConfirmation?.type === 'single' && deleteConfirmation.timestamp) {
            deletePracticeSession(deleteConfirmation.timestamp);
        } else if (deleteConfirmation?.type === 'all') {
            clearPracticeHistory();
        } else if (deleteConfirmation?.type === 'selected') {
            const timestampsToDelete = Array.from(selectedItems);
            timestampsToDelete.forEach(timestamp => {
                deletePracticeSession(timestamp);
            });
            setSelectedItems(new Set());
            setIsSelectMode(false);
            showAlert(`Deleted ${timestampsToDelete.length} session(s)`, 'info');
        }
        setDeleteConfirmation(null);
    };

    const handleExportData = () => {
        try {
            exportAllData({
                practiceHistory,
                keyErrorStats: context.keyErrorStats,
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

    const sortedHistory = useMemo(() => {
        return [...practiceHistory].sort((a, b) => b.timestamp - a.timestamp);
    }, [practiceHistory]);

    const toggleSelectItem = (timestamp: number) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(timestamp)) {
                newSet.delete(timestamp);
            } else {
                newSet.add(timestamp);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === sortedHistory.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(sortedHistory.map(s => s.timestamp)));
        }
    };

    const exitSelectMode = () => {
        setIsSelectMode(false);
        setSelectedItems(new Set());
    };

    return (
        <div className="flex flex-col h-full p-4 overflow-hidden">
            {/* Title Row - All on one line */}
            <div className="flex-shrink-0 flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => navigateTo('dashboard')}
                        title="Back to Dashboard"
                    >
                        ← Back
                    </Button>
                    <h1 className="text-2xl sm:text-3xl font-bold">Practice History</h1>
                </div>

                {sortedHistory.length > 0 && (
                    <div className="flex items-center gap-2">
                        {isSelectMode ? (
                            <>
                                <Button variant="ghost" onClick={exitSelectMode}>Cancel</Button>
                                <Button variant="secondary" onClick={toggleSelectAll}>
                                    {selectedItems.size === sortedHistory.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setDeleteConfirmation({ type: 'selected' })}
                                    disabled={selectedItems.size === 0}
                                >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    Delete ({selectedItems.size})
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsSelectMode(true)}>Select</Button>
                                <Button variant="destructive" onClick={() => setDeleteConfirmation({ type: 'all' })}>
                                    Clear All
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Table Card - Takes remaining space, only table scrolls */}
            <Card className="flex-1 p-0 overflow-hidden min-h-0">
                {sortedHistory.length > 0 ? (
                    <div className="h-full overflow-y-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            {/* Sticky Table Header */}
                            <thead className="bg-white dark:bg-slate-800 sticky top-0 z-10">
                                <tr>
                                    {isSelectMode && (
                                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.size === sortedHistory.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 text-primary-600 rounded"
                                            />
                                        </th>
                                    )}
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">WPM</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Accuracy</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Duration</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Language</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Lines</th>
                                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Errors</th>
                                    {!isSelectMode && (
                                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            {/* Table Body */}
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {sortedHistory.map((session, index) => (
                                    <tr
                                        key={session.timestamp}
                                        className={`${index % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800' : ''} ${isSelectMode && selectedItems.has(session.timestamp)
                                            ? '!bg-primary-50 dark:!bg-primary-900/20'
                                            : ''
                                            } ${isSelectMode ? 'cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10' : ''}`}
                                        onClick={isSelectMode ? () => toggleSelectItem(session.timestamp) : undefined}
                                    >
                                        {isSelectMode && (
                                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(session.timestamp)}
                                                    onChange={() => toggleSelectItem(session.timestamp)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 text-primary-600 rounded"
                                                />
                                            </td>
                                        )}
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            {formatShortDate(session.timestamp)}
                                            <span className="block text-xs text-gray-700 dark:text-gray-300">
                                                {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 font-medium">
                                            {session.wpm.toFixed(0)}
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.accuracy >= 95 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                session.accuracy >= 90 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {session.accuracy.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 hidden md:table-cell">
                                            {formatDuration(session.duration)}
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                                            {session.language}
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 hidden lg:table-cell">
                                            {session.linesTyped || 0}
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 hidden sm:table-cell">
                                            {session.errors}
                                        </td>
                                        {!isSelectMode && (
                                            <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm font-medium">
                                                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmation({ type: 'single', timestamp: session.timestamp })} title="Delete Session">
                                                    <TrashIcon className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                        <div className="text-center py-12">
                            <p className="text-lg mb-2">No practice history found.</p>
                            <p className="text-sm">Complete some practice sessions to see them listed here.</p>
                            <Button className="mt-4" onClick={() => navigateTo('practice')}>
                                Start Practicing
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                title={
                    deleteConfirmation?.type === 'all'
                        ? "Delete All History"
                        : deleteConfirmation?.type === 'selected'
                            ? `Delete ${selectedItems.size} Session${selectedItems.size > 1 ? 's' : ''}`
                            : "Delete Session"
                }
                message={
                    deleteConfirmation?.type === 'all'
                        ? (
                            <span>
                                Are you sure you want to delete ALL practice history? This action cannot be undone.
                                <br /><br />
                                To prevent data loss, we recommend you <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium" onClick={handleExportData}>Export</span> your data first.
                            </span>
                        )
                        : deleteConfirmation?.type === 'selected'
                            ? `Are you sure you want to delete ${selectedItems.size} selected session${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`
                            : "Are you sure you want to delete this practice session?"
                }
                buttons={[
                    { label: 'Cancel', onClick: () => setDeleteConfirmation(null), variant: 'secondary' },
                    { label: 'Delete', onClick: handleDeleteConfirm, variant: 'primary', className: 'bg-red-600 hover:bg-red-700 text-white' },
                ]}
            />
        </div>
    );
};

export default HistoryPage;
