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
import { XIcon } from './icons/XIcon';

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
        handleNextSnippet, handleStartFromSetup, handlePracticeSame, handleSetupNew, isMultiFileSession,
        sessionResetKey
    } = context;

    const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
    const [isTargetedResultsModalOpen, setIsTargetedResultsModalOpen] = useState(false);
    const [lastStats, setLastStats] = useState({ wpm: 0, accuracy: 0, errors: 0, duration: 0, errorMap: {}, attemptMap: {} });
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isSessionEndedEarly, setIsSessionEndedEarly] = useState(false);
    const [sessionToRestore, setSessionToRestore] = useState<PausedSessionData | null>(null);

    const gameContainerRef = useRef<HTMLDivElement>(null);
    const codeContainerRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
    const scrollableCardRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLSpanElement>(null);
    const blockOnErrorRef = useRef<DropdownRef>(null);
    const hasRestoredOnMount = useRef(false);

    const onPauseCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);
    const onResumeCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);

    const game = useTypingGame(snippet, blockOnErrorThreshold, {
        onPause: onPauseCallback,
        onResume: onResumeCallback
    });

    // Force game reset when sessionResetKey changes (e.g. on new snippet or error)
    useEffect(() => {
        game.reset();
    }, [sessionResetKey, game]);

    // Effect for restoring session state from localStorage ONCE on mount
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect for handling initial setup modal if no session was restored
    useEffect(() => {
        if (!hasRestoredOnMount.current && !isInitialSetupComplete && !isLoadingSnippet) {
            openSetupModal();
        }
    }, [isInitialSetupComplete, isLoadingSnippet, openSetupModal]);

    // Effect to apply restored game state once the context (snippet) is ready
    useEffect(() => {
        if (sessionToRestore && snippet === sessionToRestore.context.snippet) {
            game.restoreState(sessionToRestore.game);
            setSessionToRestore(null);
        }
    }, [sessionToRestore, snippet, game]);

    // Effect for SAVING session state to localStorage on unmount/navigation
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
            // Focus the hidden textarea for mobile keyboard support
            hiddenInputRef.current?.focus();
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

    useEffect(() => {
        const handleFocusShortcut = (e: KeyboardEvent) => {
            if (isResultsModalOpen || isTargetedResultsModalOpen || isSetupModalOpen || e.altKey) return;

            if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
                e.preventDefault();
                hiddenInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleFocusShortcut);
        return () => window.removeEventListener('keydown', handleFocusShortcut);
    }, [isResultsModalOpen, isTargetedResultsModalOpen, isSetupModalOpen]);

    useEffect(() => {
        const handleTypingInput = (e: KeyboardEvent) => {
            if (isResultsModalOpen || isTargetedResultsModalOpen || isSetupModalOpen || e.altKey) return;
            if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) return;

            const isTypingKey = e.key.length === 1 || e.key === 'Enter' || e.key === 'Tab' || e.key === 'Backspace';

            if (game.isPaused) {
                if (isTypingKey && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    game.handleKeyDown(e.key);
                } else {
                    game.handleKeyDown(e.key);
                }
                return;
            }

            const isTypingElement = document.activeElement === hiddenInputRef.current || document.activeElement === codeContainerRef.current;
            if (!isTypingElement) return;

            if (e.getModifierState("CapsLock")) {
                setIsCapsLockOn(true);
            } else {
                setIsCapsLockOn(false);
            }

            e.preventDefault();
            game.handleKeyDown(e.key);
        };
        window.addEventListener('keydown', handleTypingInput);
        return () => window.removeEventListener('keydown', handleTypingInput);
    }, [game, isResultsModalOpen, isTargetedResultsModalOpen, isSetupModalOpen]);

    useEffect(() => {
        const scrollContainer = scrollableCardRef.current;
        const cursor = cursorRef.current;

        if (scrollContainer && cursor) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const cursorRect = cursor.getBoundingClientRect();

            const cursorTopInContainer = cursorRect.top - containerRect.top;

            const desiredScrollTop = scrollContainer.scrollTop + cursorTopInContainer - (containerRect.height / 2) + (cursorRect.height / 2);

            if (scrollContainer.scrollHeight > containerRect.height) {
                scrollContainer.scrollTo({
                    top: desiredScrollTop,
                    behavior: 'smooth',
                });
            }
        }
    }, [game.currentIndex]);

    useEffect(() => {
        if (!isLoadingSnippet && !snippetError && snippet) {
            requestFocusOnCode();
        }
    }, [isLoadingSnippet, snippetError, snippet, requestFocusOnCode]);

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

    const nextChar = snippet ? snippet[game.currentIndex] : '';

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4" ref={gameContainerRef}>
            {
                isCapsLockOn && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-md shadow-lg flex items-center gap-2 animate-fade-in-up">
                        <WarningIcon className="w-5 h-5" />
                        <span className="font-semibold">Caps Lock is On</span>
                    </div>
                )
            }
            <div className="flex-shrink-0">
                <StatsDisplay wpm={game.wpm} accuracy={game.accuracy} errors={game.errors} duration={game.duration} />
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between gap-4">
                {/* Primary Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
                    <Button onClick={handleSetupNew} variant="outline" className="w-full justify-center" disabled={isSetupModalOpen} title="New Snippet">
                        <FileCodeIcon className="w-4 h-4 mr-2" /> New
                    </Button>
                    <Button onClick={handleEndSession} variant="outline" className="w-full justify-center" disabled={isSetupModalOpen || game.isFinished} title="End Session">
                        <XIcon className="w-4 h-4 mr-2" /> End
                    </Button>
                    <Button onClick={resetGame} variant="outline" className="w-full justify-center" disabled={isSetupModalOpen} title="Reset">
                        <ResetIcon className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button onClick={togglePause} variant="outline" className="w-full justify-center" disabled={isSetupModalOpen || game.isFinished} title={game.isPaused ? "Resume" : "Pause"}>
                        {game.isPaused ? <PlayIcon className="w-4 h-4 mr-2" /> : <PauseIcon className="w-4 h-4 mr-2" />}
                        {game.isPaused ? "Resume" : "Pause"}
                    </Button>
                </div>

                {/* Secondary Actions */}
                <div className="flex gap-2 justify-end items-center">
                    <Dropdown
                        ref={blockOnErrorRef}
                        trigger={
                            <Button variant="ghost" title="Block on Error Settings">
                                <BlockIcon className="w-5 h-5 mr-2" />
                                <span className="hidden sm:inline">Block: {blockOnErrorOptions.find(o => o.value === blockOnErrorThreshold)?.label}</span>
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
                        <HandGuideIcon className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Hand Guide</span>
                    </Button>
                </div>
            </div>

            <div className="flex-grow min-h-0 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
                <div
                    ref={codeContainerRef}
                    className={`relative focus:outline-none flex-grow min-h-0 ${game.isError ? 'animate-shake' : ''}`}
                    onClick={() => hiddenInputRef.current?.focus()}
                    aria-label="Code typing area"
                >
                    {/* Hidden input for mobile keyboard support */}
                    <textarea
                        ref={hiddenInputRef}
                        className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0 -z-10"
                        aria-hidden="true"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        tabIndex={0}
                    />
                    {game.isPaused && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg z-10 pointer-events-none animate-fade-in-up">
                            <div className="text-center text-white p-6 bg-slate-900/80 backdrop-blur-sm rounded-lg shadow-2xl">
                                <PauseIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <h2 className="text-3xl font-bold tracking-widest text-slate-100">PAUSED</h2>
                                <p className="text-slate-300 mt-2 text-sm">Start typing to resume</p>
                            </div>
                        </div>
                    )}
                    <Card ref={scrollableCardRef} className={`p-4 sm:p-6 transition-all duration-300 h-full overflow-auto custom-scrollbar`}>
                        {(!snippet && isLoadingSnippet) ? <SkeletonLoader /> :
                            (!snippet && !isLoadingSnippet && snippetError) ? <div className="text-red-500 font-semibold text-center p-8 flex items-center justify-center gap-2"><WarningIcon /> {snippetError}</div> :
                                <CodeSnippet
                                    key={sessionResetKey}
                                    code={snippet}
                                    languageAlias={selectedLanguage.prismAlias}
                                    charStates={game.charStates}
                                    currentIndex={game.currentIndex}
                                    isError={game.isError}
                                    cursorRef={cursorRef}
                                />
                        }
                    </Card>
                </div>
            </div>

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