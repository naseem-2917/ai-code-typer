import React, { useRef, useEffect, useContext } from 'react';
import CodeSnippet from './CodeSnippet';
import { Card } from './ui/Card';
import { WarningIcon } from './icons/WarningIcon';
import { Button } from './ui/Button';
import { ResetIcon } from './icons/ResetIcon';
import SkeletonLoader from './SkeletonLoader';
import { PauseIcon } from './icons/PauseIcon';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { AppContext } from '../context/AppContext';

interface CodeEditorProps {
    value: string;
    onValueChange: (value: string) => void;
    snippet: string;
    languageAlias: string;
    charStates: ('correct' | 'incorrect' | 'pending')[];
    currentIndex: number;
    isError: boolean;
    isLoading: boolean;
    error: string | null;
    isPaused: boolean;
    onRetry: () => void;
    className?: string;
}

export interface CodeEditorHandle {
    focus: () => void;
}

export const CodeEditorComponent = React.forwardRef<CodeEditorHandle, CodeEditorProps>(({
    value,
    onValueChange,
    snippet,
    languageAlias,
    charStates,
    currentIndex,
    isError,
    isLoading,
    error,
    isPaused,
    onRetry,
    className = ''
}, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLSpanElement>(null);
    const scrollableCardRef = useRef<HTMLDivElement>(null);
    const [isCopied, setIsCopied] = React.useState(false);

    // Inject Context
    const context = useContext(AppContext);

    const handleCopy = async () => {
        const copyToClipboardFallback = (text: string) => {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;

                // Ensure it's not visible but part of DOM
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                    context?.showAlert('Code copied to clipboard!', 'info');
                } else {
                    throw new Error('Fallback copy failed');
                }
            } catch (err) {
                console.error('Fallback copy failed: ', err);
                context?.showAlert('Failed to copy code.', 'error');
            }
        };

        // Try modern API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(snippet);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
                context?.showAlert('Code copied to clipboard!', 'info');
            } catch (err) {
                console.warn('Clipboard API failed, trying fallback...', err);
                copyToClipboardFallback(snippet);
            }
        } else {
            // Fallback for older browsers or non-secure contexts
            copyToClipboardFallback(snippet);
        }
    };

    // Expose focus method
    React.useImperativeHandle(ref, () => ({
        focus: () => {
            textareaRef.current?.focus();
        }
    }));

    // Auto-focus on mount and when not paused
    useEffect(() => {
        if (!isLoading && !error && !isPaused) {
            textareaRef.current?.focus();
        }
    }, [isLoading, error, isPaused]);

    // Keep focus when clicking anywhere in the container
    const handleContainerClick = () => {
        textareaRef.current?.focus();
    };

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onValueChange(e.target.value);
    };

    // Auto-scroll to cursor
    useEffect(() => {
        const scrollContainer = scrollableCardRef.current;
        const cursor = cursorRef.current;

        if (scrollContainer && cursor) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const cursorRect = cursor.getBoundingClientRect();
            const cursorTopInContainer = cursorRect.top - containerRect.top;

            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

            if (isMobile) {
                // Mobile: Scroll line by line to keep context stable
                const lineHeight = cursorRect.height || 24; // Fallback line height
                const threshold = containerRect.height / 3;

                if (cursorTopInContainer > threshold || cursorTopInContainer < 0) {
                    const desiredScrollTop = scrollContainer.scrollTop + cursorTopInContainer - lineHeight;
                    scrollContainer.scrollTo({
                        top: desiredScrollTop,
                        behavior: 'smooth',
                    });
                }
            } else {
                // Desktop: Center the cursor
                const desiredScrollTop = scrollContainer.scrollTop + cursorTopInContainer - (containerRect.height / 2) + (cursorRect.height / 2);

                if (scrollContainer.scrollHeight > containerRect.height) {
                    scrollContainer.scrollTo({
                        top: desiredScrollTop,
                        behavior: 'smooth',
                    });
                }
            }
        }
    }, [currentIndex]);

    return (
        <div
            ref={containerRef}
            className={`relative flex-grow min-h-0 w-full flex flex-col ${isError ? 'animate-shake' : ''} ${className}`}
            onClick={handleContainerClick}
        >
            {/* Hidden Textarea for Input */}
            <textarea
                ref={textareaRef}
                className="absolute opacity-0 w-px h-px p-0 m-0 border-0 -z-10"
                value={value}
                onChange={handleChange}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                tabIndex={0}
            />

            {/* Paused Overlay */}
            {isPaused && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg z-20 pointer-events-none animate-fade-in-up">
                    <div className="bg-white/90 dark:bg-slate-800/90 p-6 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        <div className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                            <PauseIcon className="w-8 h-8 text-primary-500" />
                            <span>Paused</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-center">Press any key to resume</p>
                    </div>
                </div>
            )}

            {/* Display Area */}
            <Card className="h-full overflow-hidden flex flex-col relative w-full group">
                {/* Copy Button */}
                {!isLoading && !error && (
                    <div className="absolute top-2 right-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent container focus
                                handleCopy();
                            }}
                            className="!py-1 !px-2 text-xs shadow-sm bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm"
                            title="Copy Code (Alt+C)"
                            accessKeyChar="C"
                        >
                            {isCopied ? (
                                <>
                                    <CheckIcon className="w-3 h-3 mr-1 text-green-500" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <CopyIcon className="w-3 h-3 mr-1" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                )}
                <div className="flex-grow overflow-y-auto custom-scrollbar relative" ref={scrollableCardRef}>
                    <div className="p-4 md:p-6 min-h-full font-mono text-lg md:text-xl leading-relaxed">
                        {isLoading ? (
                            <SkeletonLoader />
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-red-500 p-8 text-center animate-fade-in">
                                <WarningIcon className="w-12 h-12 mb-4 opacity-80" />
                                <p className="text-lg font-medium mb-4">{error}</p>
                                <Button onClick={onRetry} variant="primary">
                                    <ResetIcon className="w-4 h-4 mr-2" /> Try Again
                                </Button>
                            </div>
                        ) : (
                            <CodeSnippet
                                code={snippet}
                                languageAlias={languageAlias}
                                charStates={charStates}
                                currentIndex={currentIndex}
                                isError={isError}
                                cursorRef={cursorRef}
                            />
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
});

export const CodeEditor = React.memo(CodeEditorComponent);
CodeEditor.displayName = 'CodeEditor';
