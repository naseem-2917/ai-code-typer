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
import { SnippetLength, SnippetLevel } from '../types';
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
                        className={`flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${
                            index === currentQueueIndex
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
        setLastPracticeAction, lastPracticeAction, startTargetedSession,
        blockOnErrorThreshold, setBlockOnErrorThreshold,
        setRequestFocusOnCodeCallback, requestFocusOnCode,
        practiceQueue, currentQueueIndex, loadNextSnippetInQueue,
        isSetupModalOpen, openSetupModal, closeSetupModal, isInitialSetupComplete,
        getPreviousPage,
    } = context;
    
    const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
    const [isTargetedResultsModalOpen, setIsTargetedResultsModalOpen] = useState(false);
    const [lastStats, setLastStats] = useState({ wpm: 0, accuracy: 0, errors: 0, duration: 0, errorMap: {}, attemptMap: {} });
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isSessionEndedEarly, setIsSessionEndedEarly] = useState(false);

    const gameContainerRef = useRef<HTMLDivElement>(null);
    const codeContainerRef = useRef<HTMLDivElement>(null);
    const scrollableCardRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLSpanElement>(null);
    const blockOnErrorRef = useRef<DropdownRef>(null);

    const onPauseCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);
    const onResumeCallback = useCallback(() => requestFocusOnCode(), [requestFocusOnCode]);

    const game = useTypingGame(snippet, blockOnErrorThreshold, {
        onPause: onPauseCallback,
        onResume: onResumeCallback
    });

    useEffect(() => {
        if (!isInitialSetupComplete && !isLoadingSnippet) {
            openSetupModal();
        }
    }, [isInitialSetupComplete, isLoadingSnippet, openSetupModal]);


    useEffect(() => {
        const focusCode = () => codeContainerRef.current?.focus();
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
                codeContainerRef.current?.focus();
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

            const isTypingElement = document.activeElement === codeContainerRef.current;
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
      if(!isLoadingSnippet && !snippetError && snippet) {
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
        }, 100);
    }, [game, hasSubmitted, snippet, selectedLanguage.name, addPracticeResult]);

    const handlePracticeSame = () => {
        resetGame();
        setLastPracticeAction('practice_same');
    };

    const handleSetupNew = () => {
        setIsResultsModalOpen(false);
        setIsTargetedResultsModalOpen(false);
        openSetupModal();
    };
    
    const handleStartFromSetup = async (length: SnippetLength | null, level: SnippetLevel | null, customCode: string | null) => {
        closeSetupModal();
        if (customCode) {
            startCustomSession(customCode);
        } else if (length && level) {
            await fetchNewSnippet({ length, level });
        }
    };
    
    const isMultiFileSession = practiceQueue.length > 1 && currentQueueIndex < practiceQueue.length - 1;

    const handleNextSnippet = () => {
        setIsResultsModalOpen(false);
        setIsTargetedResultsModalOpen(false);
        loadNextSnippetInQueue();
    };

    const handleModalClose = useCallback(() => {
        closeSetupModal();
        if (!isInitialSetupComplete) {
            const prevPage = getPreviousPage();
            navigateTo(prevPage || 'home');
        } else {
            requestFocusOnCode();
        }
    }, [closeSetupModal, isInitialSetupComplete, getPreviousPage, navigateTo, requestFocusOnCode]);

    const nextChar = snippet ? snippet[game.currentIndex] : '';

    return (
        <div ref={gameContainerRef} className="flex flex-col gap-4 sm:gap-6 h-full focus:outline-none" tabIndex={-1}>
            {isCapsLockOn && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-md shadow-lg flex items-center gap-2 animate-fade-in-up">
                <WarningIcon className="w-5 h-5" />
                <span className="font-semibold">Caps Lock is On</span>
              </div>
            )}
            <div className="flex-shrink-0">
                <StatsDisplay wpm={game.wpm} accuracy={game.accuracy} errors={game.errors} duration={game.duration} />
            </div>
            
            <div className="flex-grow min-h-0 flex flex-row gap-6 overflow-hidden">
                <div
                  ref={codeContainerRef}
                  className={`relative focus:outline-none flex-grow min-h-0 ${game.isError ? 'animate-shake' : ''}`}
                  tabIndex={-1}
                  aria-label="Code typing area"
                >
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
                       (!snippet && !isLoadingSnippet && snippetError) ? <div className="text-red-500 font-semibold text-center p-8 flex items-center justify-center gap-2"><WarningIcon/> {snippetError}</div> :
                       <CodeSnippet
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
                <PracticeQueueSidebar />
            </div>
            
            <div className="flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={openSetupModal} title="New Snippet (Alt+N)" accessKeyChar="N">New Snippet</Button>
                    <Button variant="secondary" size="icon" onClick={game.isPaused ? game.resumeGame : game.pauseGame} title={game.isPaused ? "Resume (or start typing)" : "Pause (Alt+S)"} accessKeyChar='S'>
                        {game.isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                    </Button>
                     <Button variant="secondary" size="icon" onClick={resetGame} title="Reset (Alt+R)" accessKeyChar="R">
                        <ResetIcon className="w-5 h-5" />
                    </Button>
                    <Button variant="secondary" onClick={handleEndSession} title="End Session (Alt+E)" accessKeyChar="E">End Session</Button>
                </div>
                <div className="flex items-center gap-2">
                    <Dropdown
                        ref={blockOnErrorRef}
                        trigger={
                            <Button variant="ghost" accessKeyChar="B">
                               <BlockIcon className="w-5 h-5 mr-2"/> Block on Error
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
                    <Button variant="ghost" onClick={() => { toggleHandGuide(); requestFocusOnCode(); }} title="Toggle Hand Guide (Alt+G)" accessKeyChar="G">
                       <HandGuideIcon className="w-5 h-5 mr-2"/> Hand Guide
                    </Button>
                </div>
            </div>

            {showKeyboard && (
                <div className="flex-shrink-0">
                    <Keyboard nextKey={nextChar} />
                </div>
            )}
            
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
                onClose={handleModalClose}
                onStart={handleStartFromSetup}
                variant="default"
            />
        </div>
    );
};

export default PracticePage;
