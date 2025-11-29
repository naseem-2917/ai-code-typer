import React, { useContext, useEffect, useRef, useCallback, useState } from 'react';
import { AppContext } from '../context/AppContext';
import useTypingGame from '../hooks/useTypingGame';
import { CodeEditor } from './CodeEditor';
import StatsDisplay from './StatsDisplay';
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
import { PausedSessionData, FinishedSessionData, SnippetLength, SnippetLevel, ContentType, PracticeMode } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { FileCodeIcon } from './icons/FileCodeIcon';
import { XIcon } from './icons/XIcon';

const blockOnErrorOptions = [
    { label: 'Off', value: 0 },
    { label: 'After 1 Error', value: 1 },
    { label: 'After 2 Errors', value: 2 },
    { label: 'After 3 Errors', value: 3 },
];

const ShortcutLabel: React.FC<{ label: string, char: string, isVisible: boolean }> = ({ label, char, isVisible }) => {
    if (!isVisible) return <span>{label}</span>;

    const index = label.toLowerCase().indexOf(char.toLowerCase());
    if (index === -1) return <span>{label} <span className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded ml-1">{char.toUpperCase()}</span></span>;

    return (
        <span>
            {label.slice(0, index)}
            <span className="underline decoration-2 decoration-primary-500 font-bold">{label.slice(index, index + 1)}</span>
            {label.slice(index + 1)}
        </span>
    );
};

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
        setCurrentTargetedKeys, setLastPracticeAction, lastPracticeAction, startTargetedSession,
        blockOnErrorThreshold, setBlockOnErrorThreshold,
        setRequestFocusOnCodeCallback, requestFocusOnCode,
        practiceQueue, currentQueueIndex, loadNextSnippetInQueue,
        isSetupModalOpen, openSetupModal, closeSetupModal, isInitialSetupComplete,
        getPreviousPage,
        isMultiFileSession,
        sessionResetKey,
        isAccessKeyMenuVisible
    } = context;

    const handleStartFromSetup = useCallback(async (length: SnippetLength | null, level: SnippetLevel | null, customCode?: string | null, mode?: PracticeMode, contentTypes?: ContentType[]) => {
        if (customCode) {
            startCustomSession(customCode, mode);
            closeSetupModal();
        } else {
            await fetchNewSnippet({ length: length || undefined, level: level || undefined, mode: mode || undefined, contentTypes: contentTypes || undefined });
            closeSetupModal();
        }
        setTimeout(() => requestFocusOnCode(), 100);
    }, [startCustomSession, closeSetupModal, fetchNewSnippet, requestFocusOnCode]);

    const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
    const [isTargetedResultsModalOpen, setIsTargetedResultsModalOpen] = useState(false);
    const [lastStats, setLastStats] = useState({ wpm: 0, accuracy: 0, errors: 0, duration: 0, errorMap: {}, attemptMap: {} });
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isSessionEndedEarly, setIsSessionEndedEarly] = useState(false);
    const [sessionToRestore, setSessionToRestore] = useState<PausedSessionData | null>(null);

    const gameContainerRef = useRef<HTMLDivElement>(null);
    const blockOnErrorRef = useRef<DropdownRef>(null);
    const hasRestoredOnMount = useRef(false);

    const onPauseCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);
    const onResumeCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);

    const game = useTypingGame(snippet, blockOnErrorThreshold, {
        onPause: onPauseCallback,
        onResume: onResumeCallback
    });

    const nextChar = snippet[game.currentIndex] || '';

    // Force game reset when sessionResetKey changes
    useEffect(() => {
        game.reset();
    }, [sessionResetKey, game]);

    // Restore session state on mount
    useEffect(() => {
        const sessionResultJSON = localStorage.getItem('sessionResultToShow');
        if (sessionResultJSON) {
            hasRestoredOnMount.current = true;
            localStorage.removeItem('sessionResultToShow');
            try {
                const finishedSession = JSON.parse(sessionResultJSON) as FinishedSessionData;
                setLastStats(finishedSession.stats);
                setIsSessionEndedEarly(finishedSession.isEarlyExit);
                setLastPracticeAction(finishedSession.lastPracticeAction);
                if (finishedSession.currentTargetedKeys && finishedSession.currentTargetedKeys.length > 0) {
                    setCurrentTargetedKeys(finishedSession.currentTargetedKeys);
                    setIsTargetedResultsModalOpen(true);
                } else {
                    setIsResultsModalOpen(true);
                }
            } catch (e) { console.error("Failed to parse session result", e); }
            return;
        }

        if (!hasRestoredOnMount.current && !isInitialSetupComplete && !isLoadingSnippet && !snippetError) {
            openSetupModal();
        }
    }, [isInitialSetupComplete, isLoadingSnippet, openSetupModal, snippetError]);

    // Apply restored game state
    useEffect(() => {
        if (sessionToRestore && snippet === sessionToRestore.context.snippet) {
            game.restoreState(sessionToRestore.game);
            setSessionToRestore(null);
        }
    }, [sessionToRestore, snippet, game]);

    // Save session state on unmount
    useEffect(() => {
        return () => {
            if (!game.isFinished && game.typedText.length > 0) {
                const continuedSession: PausedSessionData = {
                    game: game.getSavableState(),
                    context: {
                        snippet,
                        selectedLanguage,
                        isCustomSession,
                        currentTargetedKeys,
                        practiceQueue,
                        currentQueueIndex,
                    },
                    timestamp: Date.now(),
                };
                localStorage.setItem('continuedSession', JSON.stringify(continuedSession));
            } else if (game.isFinished && hasSubmitted) {
                const sessionResult: FinishedSessionData = {
                    stats: lastStats,
                    isEarlyExit: isSessionEndedEarly,
                    isCustomSession,
                    lastPracticeAction,
                    isMultiFileSession: practiceQueue.length > 1 && currentQueueIndex < practiceQueue.length - 1,
                    currentTargetedKeys,
                };
                localStorage.setItem('sessionResultToShow', JSON.stringify(sessionResult));
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [game, hasSubmitted, lastStats, isSessionEndedEarly, lastPracticeAction, isCustomSession, snippet, selectedLanguage, currentTargetedKeys, practiceQueue, currentQueueIndex]);


    useEffect(() => {
        const focusCode = () => {
            // Focus is handled by CodeEditor internally or via its ref if exposed, 
            // but here we rely on CodeEditor's auto-focus prop or internal logic.
            // However, we can trigger a re-render or state change if needed.
            // For now, CodeEditor auto-focuses when not paused/loading.
        };
        setRequestFocusOnCodeCallback(focusCode);
        return () => setRequestFocusOnCodeCallback(null);
    }, [setRequestFocusOnCodeCallback]);

    useEffect(() => {
        if (game.isFinished && !hasSubmitted) {
            setHasSubmitted(true);

            const linesTyped = (snippet.match(/\n/g) || []).length + 1;
            const stats = {
                wpm: game.wpm,
                accuracy: game.accuracy,
                errors: game.errors,
                language: selectedLanguage.name,
                timestamp: Date.now(),
                duration: game.duration,
                linesTyped,
                errorMap: game.errorMap,
                attemptMap: game.attemptMap,
            };
            addPracticeResult(stats as any);
            setLastStats(stats as any);

            if (currentTargetedKeys.length > 0) {
                setIsTargetedResultsModalOpen(true);
            } else {
                setIsResultsModalOpen(true);
            }
        }
    }, [
        game.isFinished,
        game.wpm,
        game.accuracy,
        game.errors,
        game.duration,
        game.errorMap,
        game.attemptMap,
        hasSubmitted,
        addPracticeResult,
        snippet,
        selectedLanguage.name,
        currentTargetedKeys,
    ]);

    useEffect(() => {
        setHasSubmitted(false);
    }, [snippet]);

    const resetGame = useCallback(() => {
        game.reset();
        setIsResultsModalOpen(false);
        setIsTargetedResultsModalOpen(false);
        setHasSubmitted(false);
        setIsSessionEndedEarly(false);
        requestFocusOnCode();
    }, [game, requestFocusOnCode]);

    const togglePause = useCallback(() => {
        if (game.isPaused) {
            game.resumeGame();
        } else {
            game.pauseGame();
        }
        requestFocusOnCode();
    }, [game, requestFocusOnCode]);

    const handleEndSession = useCallback(() => {
        if (game.isFinished || hasSubmitted) return;

        game.pauseGame();

        setTimeout(() => {
            if (game.typedText.length > 1) {
                setHasSubmitted(true);
                const currentSnippetLines = (snippet.match(/\n/g) || []).length + 1;
                const typedLinesRatio = game.currentIndex / snippet.length;
                const linesTyped = Math.round(currentSnippetLines * typedLinesRatio);

                const stats = {
                    wpm: game.wpm,
                    accuracy: game.accuracy,
                    errors: game.errors,
                    language: selectedLanguage.name,
                    timestamp: Date.now(),
                    duration: game.duration,
                    linesTyped,
                    errorMap: game.errorMap,
                    attemptMap: game.attemptMap,
                };
                addPracticeResult(stats as any);
                setLastStats(stats as any);

                setIsSessionEndedEarly(false);
                setIsResultsModalOpen(true);
            } else {
                setLastStats({ wpm: 0, accuracy: 0, errors: 0, duration: 0, errorMap: {}, attemptMap: {} });
                setIsSessionEndedEarly(true);
                setIsResultsModalOpen(true);
            }
        }, 0);
    }, [game, hasSubmitted, snippet, selectedLanguage, addPracticeResult]);

    const handleSetupNew = useCallback(() => {
        resetGame();
        openSetupModal();
    }, [resetGame, openSetupModal]);

    const handlePracticeSame = useCallback(() => {
        game.reset();
    }, [game]);

    const handleNextSnippet = useCallback(() => {
        game.reset();
        if (practiceQueue.length > 0 && currentQueueIndex < practiceQueue.length - 1) {
            loadNextSnippetInQueue();
        } else {
            fetchNewSnippet({
                length: 'medium',
                level: 'medium',
                mode: 'code'
            });
        }
        setIsResultsModalOpen(false);
        setIsTargetedResultsModalOpen(false);
    }, [game, practiceQueue.length, currentQueueIndex, loadNextSnippetInQueue, fetchNewSnippet]);


    // Shortcuts Handler
    useEffect(() => {
        const handleShortcuts = (e: KeyboardEvent) => {
            if (isResultsModalOpen || isTargetedResultsModalOpen || isSetupModalOpen) return;

            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        handleSetupNew();
                        break;
                    case 'e':
                        e.preventDefault();
                        handleEndSession();
                        break;
                    case 'r':
                        e.preventDefault();
                        resetGame();
                        break;
                    case 'p':
                        e.preventDefault();
                        togglePause();
                        break;
                    case 'g':
                        e.preventDefault();
                        toggleHandGuide();
                        break;
                    case 'b':
                        e.preventDefault();
                        // Cycle block on error options
                        const currentIndex = blockOnErrorOptions.findIndex(o => o.value === blockOnErrorThreshold);
                        const nextIndex = (currentIndex + 1) % blockOnErrorOptions.length;
                        setBlockOnErrorThreshold(blockOnErrorOptions[nextIndex].value);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [isResultsModalOpen, isTargetedResultsModalOpen, isSetupModalOpen, handleSetupNew, handleEndSession, resetGame, togglePause, toggleHandGuide, blockOnErrorThreshold, setBlockOnErrorThreshold]);


    // Typing Handler for special keys (Backspace, Tab, etc.) that might not be caught by input change
    // or to prevent default behavior for certain keys.
    useEffect(() => {
        const handleTypingInput = (e: KeyboardEvent) => {
            if (isResultsModalOpen || isTargetedResultsModalOpen || isSetupModalOpen || e.altKey || e.ctrlKey || e.metaKey) return;
            if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) return;

            // We allow the CodeEditor's textarea to handle the input event for characters,
            // but we still need to intercept special keys or prevent default if needed.
            // Actually, if we use onValueChange, we don't need to intercept characters here.
            // But we DO need to intercept Backspace if we want to handle it via game logic (e.g. block on error).
            
            // For now, let's keep the global listener for robustness, but we might need to coordinate with CodeEditor.
            // If CodeEditor is focused, it will receive the event.
        };
        // window.addEventListener('keydown', handleTypingInput);
        // return () => window.removeEventListener('keydown', handleTypingInput);
    }, [game, isResultsModalOpen, isTargetedResultsModalOpen, isSetupModalOpen]);

    const handleEditorValueChange = (newValue: string) => {
        // Calculate the difference between newValue and game.typedText
        const currentText = game.typedText;
        
        if (newValue.length > currentText.length) {
            // Character added
            const char = newValue.slice(currentText.length);
            // Handle multiple chars (paste)
            for (const c of char) {
                game.handleKeyDown(c);
            }
        } else if (newValue.length < currentText.length) {
            // Character removed (Backspace)
            // game.handleKeyDown('Backspace'); // useTypingGame might not support 'Backspace' string in handleKeyDown if it expects char?
            // Let's check useTypingGame. usually it handles 'Backspace'.
            game.handleKeyDown('Backspace');
        }
    };

    return (
        <div className="flex flex-col h-full max-w-full mx-auto w-full" ref={gameContainerRef}>

            {/* 1. StatsBar - Clean Top Section */}
            <div className="w-full max-w-[1100px] mx-auto mb-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <StatsDisplay
                        wpm={game.wpm}
                        accuracy={game.accuracy}
                        errors={game.errors}
                        progress={Math.round((game.currentIndex / snippet.length) * 100)}
                        timer={game.duration}
                    />
                </div>
            </div>

            {/* 2. ActionBar - Separate Action Buttons */}
            <div className="w-full max-w-[1100px] mx-auto mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleSetupNew} variant="primary" disabled={isSetupModalOpen} title="New Snippet (Alt+N)" accessKey="n">
                        <FileCodeIcon className="w-4 h-4 mr-2" />
                        <ShortcutLabel label="New" char="N" isVisible={isAccessKeyMenuVisible} />
                    </Button>
                    <Button onClick={handleEndSession} variant="outline" disabled={isSetupModalOpen || game.isFinished} title="End Session (Alt+E)" accessKey="e">
                        <XIcon className="w-4 h-4 mr-2" />
                        <ShortcutLabel label="End" char="E" isVisible={isAccessKeyMenuVisible} />
                    </Button>
                    <Button onClick={resetGame} variant="outline" disabled={isSetupModalOpen} title="Reset (Alt+R)" accessKey="r">
                        <ResetIcon className="w-4 h-4 mr-2" />
                        <ShortcutLabel label="Reset" char="R" isVisible={isAccessKeyMenuVisible} />
                    </Button>
                    <Button onClick={togglePause} variant="outline" disabled={isSetupModalOpen || game.isFinished} title={game.isPaused ? "Resume (Alt+P)" : "Pause (Alt+P)"} accessKey="p">
                        {game.isPaused ? <PlayIcon className="w-4 h-4 mr-2" /> : <PauseIcon className="w-4 h-4 mr-2" />}
                        <ShortcutLabel label={game.isPaused ? "Resume" : "Pause"} char="P" isVisible={isAccessKeyMenuVisible} />
                    </Button>

                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden sm:block"></div>

                    <Dropdown
                        ref={blockOnErrorRef}
                        trigger={
                            <Button variant="ghost" title="Block on Error Settings (Alt+B)" accessKey="b">
                                <BlockIcon className="w-5 h-5 mr-2" />
                                <span className="hidden sm:inline">
                                    <ShortcutLabel label={`Block: ${blockOnErrorOptions.find(o => o.value === blockOnErrorThreshold)?.label}`} char="B" isVisible={isAccessKeyMenuVisible} />
                                </span>
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
                    <Button variant="ghost" onClick={() => { toggleHandGuide(); requestFocusOnCode(); }} title="Toggle Hand Guide (Alt+G)" disabled={isSetupModalOpen} accessKey="g">
                        <HandGuideIcon className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">
                            <ShortcutLabel label="Hand Guide" char="G" isVisible={isAccessKeyMenuVisible} />
                        </span>
                    </Button>
                </div>
            </div>

            {/* 3. Code Editor - Centered & Wide */}
            <div className="w-full mx-auto flex-grow min-h-0 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
                <CodeEditor
                    value={game.typedText}
                    onValueChange={handleEditorValueChange}
                    snippet={snippet}
                    languageAlias={selectedLanguage.prismAlias}
                    charStates={game.charStates}
                    currentIndex={game.currentIndex}
                    isError={game.isError}
                    isLoading={isLoadingSnippet}
                    error={snippetError}
                    isPaused={game.isPaused}
                    onRetry={() => fetchNewSnippet()}
                    className="flex-grow"
                />

                {/* Sidebar: Queue */}
                <div className="hidden md:flex flex-col gap-4 w-64 flex-shrink-0">
                    <div className="flex-grow min-h-0 overflow-hidden">
                        <PracticeQueueSidebar />
                    </div>
                </div>
            </div>

            {/* Keyboard (below code area) */}
            {showKeyboard && (
                <div className="flex-shrink-0 w-full max-w-[1100px] mx-auto mt-4">
                    <Keyboard
                        activeKey={nextChar}
                        isShiftActive={/[A-Z!@#$%^&*()_+{}|:"<>?~]/.test(nextChar)}
                        showHandGuide={showHandGuide}
                    />
                </div>
            )}

            <PracticeSetupModal
                isOpen={isSetupModalOpen}
                onClose={closeSetupModal}
                onStart={handleStartFromSetup}
            />

            <ResultsModal
                isOpen={isResultsModalOpen}
                onClose={() => {
                    setIsResultsModalOpen(false);
                    requestFocusOnCode();
                }}
                stats={lastStats}
                onPracticeSame={handlePracticeSame}
                onNextSnippet={handleNextSnippet}
                isSessionEndedEarly={isSessionEndedEarly}
            />

            <TargetedResultsModal
                isOpen={isTargetedResultsModalOpen}
                onClose={() => {
                    setIsTargetedResultsModalOpen(false);
                    requestFocusOnCode();
                }}
                stats={lastStats}
                onPracticeSame={handlePracticeSame}
                onNextSnippet={handleNextSnippet}
                currentTargetedKeys={currentTargetedKeys}
                onPracticeTargeted={(keys) => startTargetedSession(keys, { length: 'medium', level: 'medium' })}
            />
        </div>
    );
};

export default PracticePage;