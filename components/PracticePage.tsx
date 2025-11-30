import React, { useContext, useEffect, useRef, useCallback, useState, useLayoutEffect } from 'react';
import { AppContext } from '../context/AppContext';
import useTypingGame from '../hooks/useTypingGame';
import { CodeEditor, CodeEditorHandle } from './CodeEditor';
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
import { WarningIcon } from './icons/WarningIcon';

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
        setCurrentTargetedKeys, setLastPracticeAction, lastPracticeAction, startTargetedSession,
        blockOnErrorThreshold, setBlockOnErrorThreshold,
        setRequestFocusOnCodeCallback, requestFocusOnCode,
        practiceQueue, currentQueueIndex, loadNextSnippetInQueue,
        isSetupModalOpen, openSetupModal, closeSetupModal, isInitialSetupComplete,
        getPreviousPage, restorePracticeSession,
        sessionResetKey,
        isAccessKeyMenuVisible
    } = context;

    const handleStartFromSetup = useCallback(async (length: SnippetLength | null, level: SnippetLevel | null, customCode?: string | null, mode?: PracticeMode, contentTypes?: ContentType[]) => {
        closeSetupModal();
        if (customCode) {
            startCustomSession(customCode, mode);
        } else {
            await fetchNewSnippet({ length: length || undefined, level: level || undefined, mode: mode || undefined, contentTypes: contentTypes || undefined });
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
    const codeEditorRef = useRef<CodeEditorHandle>(null);
    const hasRestoredOnMount = useRef(false);

    const onPauseCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);
    const onResumeCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);

    const game = useTypingGame(snippet, blockOnErrorThreshold, {
        onPause: onPauseCallback,
        onResume: onResumeCallback
    });

    // ---------------------------------------------------------
    // 🔥 CRITICAL FIX: STABLE GAME REF PATTERN
    // ---------------------------------------------------------
    // We use a Ref to hold the latest game object. This allows us to
    // access the latest game state inside the event listener without
    // adding 'game' to the dependency array, preventing re-renders/resets.
    const gameRef = useRef(game);
    useLayoutEffect(() => {
        gameRef.current = game;
    }, [game]);
    // ---------------------------------------------------------

    const nextChar = snippet[game.currentIndex] || '';

    // Force game reset when sessionResetKey changes
    useEffect(() => {
        gameRef.current.reset();
    }, [sessionResetKey]);

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

        const continuedSessionJSON = localStorage.getItem('continuedSession');
        if (continuedSessionJSON) {
            hasRestoredOnMount.current = true;
            localStorage.removeItem('continuedSession');
            try {
                const savedSession = JSON.parse(continuedSessionJSON) as PausedSessionData;
                restorePracticeSession(savedSession.context);
                setSessionToRestore(savedSession);
            } catch (e) { console.error("Failed to parse continued session", e); }
        }

        if (!hasRestoredOnMount.current && !isInitialSetupComplete && !isLoadingSnippet && !snippetError) {
            openSetupModal();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Apply restored game state
    useEffect(() => {
        if (sessionToRestore && snippet === sessionToRestore.context.snippet) {
            gameRef.current.restoreState(sessionToRestore.game);
            setSessionToRestore(null);
        }
    }, [sessionToRestore, snippet]);

    // Save session state on unmount
    useEffect(() => {
        return () => {
            // Access ref current to avoid stale closure issues in cleanup
            const currentGame = gameRef.current;
            if (!currentGame.isFinished && currentGame.typedText.length > 0) {
                const continuedSession: PausedSessionData = {
                    game: currentGame.getSavableState(),
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
            } else if (currentGame.isFinished && hasSubmitted) {
                // Logic handled in separate state based effect, but good to have fallback
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasSubmitted, isSessionEndedEarly, lastPracticeAction, isCustomSession, snippet, selectedLanguage, currentTargetedKeys, practiceQueue, currentQueueIndex]);


    useEffect(() => {
        const focusCode = () => {
            codeEditorRef.current?.focus();
        };
        setRequestFocusOnCodeCallback(focusCode);
        return () => setRequestFocusOnCodeCallback(null);
    }, [setRequestFocusOnCodeCallback]);

    // Check for finish
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
        gameRef.current.reset();
        setIsResultsModalOpen(false);
        setIsTargetedResultsModalOpen(false);
        setHasSubmitted(false);
        setIsSessionEndedEarly(false);
        requestFocusOnCode();
    }, [requestFocusOnCode]);

    const togglePause = useCallback(() => {
        if (gameRef.current.isPaused) {
            gameRef.current.resumeGame();
        } else {
            gameRef.current.pauseGame();
        }
        requestFocusOnCode();
    }, [requestFocusOnCode]);

    const handleEndSession = useCallback(() => {
        if (gameRef.current.isFinished || hasSubmitted) return;

        gameRef.current.pauseGame();

        setTimeout(() => {
            const currentGame = gameRef.current;
            if (currentGame.typedText.length > 1) {
                setHasSubmitted(true);
                const currentSnippetLines = (snippet.match(/\n/g) || []).length + 1;
                const typedLinesRatio = currentGame.currentIndex / snippet.length;
                const linesTyped = Math.round(currentSnippetLines * typedLinesRatio);

                const stats = {
                    wpm: currentGame.wpm,
                    accuracy: currentGame.accuracy,
                    errors: currentGame.errors,
                    language: selectedLanguage.name,
                    timestamp: Date.now(),
                    duration: currentGame.duration,
                    linesTyped,
                    errorMap: currentGame.errorMap,
                    attemptMap: currentGame.attemptMap,
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
    }, [hasSubmitted, snippet, selectedLanguage, addPracticeResult]);

    const handleSetupNew = useCallback(() => {
        resetGame();
        openSetupModal();
    }, [resetGame, openSetupModal]);

    const handlePracticeSame = useCallback(() => {
        gameRef.current.reset();
    }, []);

    const handleNextSnippet = useCallback(() => {
        gameRef.current.reset();
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
    }, [practiceQueue.length, currentQueueIndex, loadNextSnippetInQueue, fetchNewSnippet]);


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

    // ---------------------------------------------------------
    // ✅ GLOBAL TYPING HANDLER (FIXED)
    // ---------------------------------------------------------
    useEffect(() => {
        const handleTypingInput = (e: KeyboardEvent) => {
            const currentGame = gameRef.current; // Access latest game via ref

            // 1. Modal/Modifier Check
            if (isResultsModalOpen || isTargetedResultsModalOpen || isSetupModalOpen || e.altKey || e.ctrlKey || e.metaKey) {
                return;
            }

            const key = e.key;

            // 2. Tab Focus Fix
            if (key === 'Tab') {
                e.preventDefault();
            }

            // 3. CapsLock Check
            if (e.getModifierState("CapsLock")) {
                setIsCapsLockOn(true);
            } else {
                setIsCapsLockOn(false);
            }

            // 4. Valid Key Check
            const isPrintable = key.length === 1;
            const isSpecialKey = ['Backspace', 'Enter', 'Tab'].includes(key);

            if (isPrintable || isSpecialKey) {
                e.preventDefault();
                currentGame.handleKeyDown(key); // Call method on the Ref
                requestFocusOnCode();
            }
        };

        window.addEventListener('keydown', handleTypingInput);
        return () => window.removeEventListener('keydown', handleTypingInput);
    }, [isResultsModalOpen, isTargetedResultsModalOpen, isSetupModalOpen, requestFocusOnCode]);
    // Note: 'game' is NOT in the dependency array. This keeps the listener stable.

    const handleEditorValueChange = (newValue: string) => {
        // Only handle bulk text insertion (pasting)
        const currentText = gameRef.current.typedText;

        if (newValue.length > currentText.length + 1) {
            const newChars = newValue.slice(currentText.length);
            for (const c of newChars) {
                gameRef.current.handleKeyDown(c);
            }
            requestFocusOnCode();
        }
    };

    return (
        <div className="flex flex-col h-full max-w-full mx-auto w-full" ref={gameContainerRef}>
            {isCapsLockOn && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-md shadow-lg flex items-center gap-2 animate-fade-in-up">
                    <WarningIcon className="w-5 h-5" />
                    <span className="font-semibold">Caps Lock is On</span>
                </div>
            )}

            <div className="w-full max-w-[1100px] mx-auto mb-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                    <StatsDisplay
                        wpm={game.wpm}
                        accuracy={game.accuracy}
                        errors={game.errors}
                        progress={snippet.length > 0 ? Math.round((game.currentIndex / snippet.length) * 100) : 0}
                        timer={game.duration}
                    />
                </div>
            </div>

            {/* 2. ActionBar - Separate Action Buttons */}
            <div className="w-full max-w-[1100px] mx-auto mb-6">
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button onClick={handleSetupNew} variant="primary" disabled={isSetupModalOpen} title="New Snippet (Alt+N)" accessKey="n">
                        <FileCodeIcon className="w-4 h-4 mr-2" />
                        New
                    </Button>
                    <Button onClick={handleEndSession} variant="outline" disabled={isSetupModalOpen || game.isFinished} title="End Session (Alt+E)" accessKey="e">
                        <XIcon className="w-4 h-4 mr-2" />
                        End
                    </Button>
                    <Button onClick={resetGame} variant="outline" disabled={isSetupModalOpen} title="Reset (Alt+R)" accessKey="r">
                        <ResetIcon className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <Button onClick={togglePause} variant="outline" disabled={isSetupModalOpen || game.isFinished} title={game.isPaused ? "Resume (Alt+P)" : "Pause (Alt+P)"} accessKey="p">
                        {game.isPaused ? <PlayIcon className="w-4 h-4 mr-2" /> : <PauseIcon className="w-4 h-4 mr-2" />}
                        {game.isPaused ? "Resume" : "Pause"}
                    </Button>

                    <Dropdown
                        ref={blockOnErrorRef}
                        trigger={
                            <Button variant="outline" title="Block on Error Settings (Alt+B)" accessKey="b">
                                <BlockIcon className="w-5 h-5 mr-2" />
                                <span className="hidden sm:inline">
                                    Block: {blockOnErrorOptions.find(o => o.value === blockOnErrorThreshold)?.label}
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
                    <Button variant="outline" onClick={() => { toggleHandGuide(); requestFocusOnCode(); }} title="Toggle Hand Guide (Alt+G)" disabled={isSetupModalOpen} accessKey="g">
                        <HandGuideIcon className="w-5 h-5 sm:mr-2" />
                        <span className="hidden sm:inline">
                            Hand Guide
                        </span>
                    </Button>
                </div>
            </div>

            {/* 3. Code Editor - Centered & Wide */}
            <div className="w-full mx-auto flex-grow min-h-0 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
                <CodeEditor
                    ref={codeEditorRef}
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
                {practiceQueue.length > 1 && (
                    <div className="hidden md:flex flex-col gap-4 w-64 flex-shrink-0">
                        <div className="flex-grow min-h-0 overflow-hidden">
                            <PracticeQueueSidebar />
                        </div>
                    </div>
                )}
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
                title={isSessionEndedEarly ? 'Session Ended' : 'Session Complete!'}
                onPracticeSame={handlePracticeSame}
                onNextSnippet={handleNextSnippet}
                onNewSnippet={handleSetupNew}
                onViewProgress={() => {
                    setIsResultsModalOpen(false);
                    navigateTo('dashboard');
                }}
                isSessionEndedEarly={isSessionEndedEarly}
                hasNextSnippet={practiceQueue.length > 1 && currentQueueIndex < practiceQueue.length - 1}
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