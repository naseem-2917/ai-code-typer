import React, { useContext, useEffect, useRef, useCallback, useState } from 'react';
import { AppContext } from '../context/AppContext';
import useTypingGame from '../hooks/useTypingGame';
import CodeSnippet from './CodeSnippet';
import StatsDisplay from './StatsDisplay';
import SkeletonLoader from './SkeletonLoader';
import { Card } from './ui/Card';
import Keyboard from './Keyboard';
import { Button } from './ui/Button';
import { ResultsModal } from './ResultsModal';
import { TargetedResultsModal } from './TargetedResultsModal';
import { PracticeSetupModal } from './PracticeSetupModal';
import { ResetIcon } from './icons/ResetIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { HandGuideIcon } from './icons/HandGuideIcon';
import { Dropdown, DropdownItem, DropdownRef } from './ui/Dropdown';
import { BlockIcon } from './icons/BlockIcon';
import { WarningIcon } from './icons/WarningIcon';
import { PausedSessionData, FinishedSessionData, SnippetLength, SnippetLevel, ContentType } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { FileCodeIcon } from './icons/FileCodeIcon';

const blockOnErrorOptions = [
    { label: 'Off', value: 0 },
    { label: 'After 1 Error', value: 1 },
    { label: 'After 2 Errors', value: 2 },
    { label: 'After 3 Errors', value: 3 },
];

const PracticeQueueSidebar: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) return null;
    const { practiceQueue, currentQueueIndex } = context;

    const activeItemRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const activeItem = activeItemRef.current;

        if (scrollContainer && activeItem) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const itemRect = activeItem.getBoundingClientRect();
            const itemCenterRelativeToContainer = (itemRect.top - containerRect.top) + (itemRect.height / 2);
            const containerCenter = containerRect.height / 2;
            const desiredScrollTop = scrollContainer.scrollTop + itemCenterRelativeToContainer - containerCenter;

            scrollContainer.scrollTo({
                top: desiredScrollTop,
                behavior: 'smooth',
            });
        }
    }, [currentQueueIndex]);


    if (practiceQueue.length <= 1) return null;

    return (
        <Card ref={scrollContainerRef} className="w-64 flex-shrink-0 hidden lg:block flex flex-col h-full overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-semibold sticky top-0 bg-white dark:bg-slate-800 z-10 p-4 pb-3">Practice Queue</h3>
            <div className="space-y-2 px-4 pb-4">
                {practiceQueue.map((item, index) => (
                    <div
                        key={index}
                        ref={index === currentQueueIndex ? activeItemRef : null}
                        className={`flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${index === currentQueueIndex
                            ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                            : 'text-slate-600 dark:text-slate-400'
                            }`}
                    >
                        {index < currentQueueIndex ? (
                            <CheckIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
                        ) : (
                            <FileCodeIcon className="w-5 h-5 flex-shrink-0" />
                        )}
                        <span className="truncate font-medium">{item.name}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const PracticePage: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AppContext not found");

    const {
        snippet, isLoadingSnippet, snippetError, selectedLanguage, fetchNewSnippet,
        showKeyboard, showHandGuide, toggleHandGuide, addPracticeResult,
        startCustomSession, navigateTo, isCustomSession, currentTargetedKeys,
                <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
        <Button variant="secondary" onClick={() => { resetGame(); openSetupModal(); }} title="New Snippet (Alt+N)" accessKeyChar="N" disabled={isSetupModalOpen}>New Snippet</Button>
        <Button variant="secondary" size="icon" onClick={game.isPaused ? game.resumeGame : game.pauseGame} title={game.isPaused ? "Resume (or start typing)" : "Pause (Alt+S)"} accessKeyChar='S' disabled={isSetupModalOpen}>
            {game.isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
        </Button>
        <Button variant="secondary" size="icon" onClick={resetGame} title="Reset (Alt+R)" accessKeyChar="R" disabled={isSetupModalOpen}>
            <ResetIcon className="w-5 h-5" />
        </Button>
        <Button variant="secondary" onClick={handleEndSession} title="End Session (Alt+E)" accessKeyChar="E" disabled={isSetupModalOpen}>End Session</Button>
    </div>
        <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
            <Dropdown
                ref={blockOnErrorRef}
                trigger={
                    <Button variant="ghost" accessKeyChar="B" disabled={isSetupModalOpen}>
                        <BlockIcon className="w-5 h-5 mr-2" /> Block on Error
                    </Button>
                }
            >
                {blockOnErrorOptions.map(({ label, value }) => (
                    <DropdownItem
                        key={value}
                        onClick={() => { setBlockOnErrorThreshold(value); requestFocusOnCode(); }}
                        isActive={blockOnErrorThreshold === value}
                    >
                        {label}
                    </DropdownItem>
                ))}
            </Dropdown>
            <Button variant="ghost" onClick={() => { toggleHandGuide(); requestFocusOnCode(); }} title="Toggle Hand Guide (Alt+G)" accessKeyChar="G" disabled={isSetupModalOpen}>
                <HandGuideIcon className="w-5 h-5 mr-2" /> Hand Guide
            </Button>
        </div>
            </div >

{
    showKeyboard && (
        <div className="flex-shrink-0">
            <Keyboard nextKey={nextChar} />
        </div>
    )
            }

            <ResultsModal
                isOpen={isResultsModalOpen}
                onClose={resetGame}
                onPracticeSame={handlePracticeSame}
                onNewSnippet={handleSetupNew}
                onViewProgress={() => { setIsResultsModalOpen(false); navigateTo('dashboard'); }}
                isCustomSession={isCustomSession}
                lastPracticeAction={lastPracticeAction}
                stats={lastStats}
                isEarlyExit={isSessionEndedEarly}
                isMultiFileSession={isMultiFileSession}
                onNextSnippet={handleNextSnippet}
            />

            <TargetedResultsModal
                isOpen={isTargetedResultsModalOpen}
                onClose={() => { setIsTargetedResultsModalOpen(false); navigateTo('dashboard'); }}
                onPracticeAgain={() => {
                    setIsTargetedResultsModalOpen(false);
                    startTargetedSession(currentTargetedKeys, { length: context.snippetLength, level: context.snippetLevel });
                }}
                onReturnToDashboard={() => { setIsTargetedResultsModalOpen(false); navigateTo('dashboard'); }}
                stats={lastStats}
                sessionErrorMap={lastStats.errorMap}
                sessionAttemptMap={lastStats.attemptMap}
            />

            <PracticeSetupModal
                isOpen={isSetupModalOpen}
                onClose={closeSetupModal}
                onStart={handleStartFromSetup}
                variant="default"
            />
        </div >
    );
};

export default PracticePage;