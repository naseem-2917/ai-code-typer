import React, { useRef, useEffect, useContext, useState } from 'react';
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
    disabled?: boolean;
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
    disabled = false,
    onRetry,
    className = ''
}, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLSpanElement>(null);
    const scrollableCardRef = useRef<HTMLDivElement>(null);

    // Inject Context
    const context = useContext(AppContext);

    // Track Visual Viewport height for mobile keyboard detection
    const [viewportHeight, setViewportHeight] = useState(() => {
        if (typeof window !== 'undefined' && window.visualViewport) {
            return window.visualViewport.height;
        }
        return typeof window !== 'undefined' ? window.innerHeight : 600;
    });

    // Visual Viewport API - Auto-detect mobile keyboard
    useEffect(() => {
        const handleViewportResize = () => {
            if (window.visualViewport) {
                setViewportHeight(window.visualViewport.height);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
            window.visualViewport.addEventListener('scroll', handleViewportResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportResize);
                window.visualViewport.removeEventListener('scroll', handleViewportResize);
            }
        };
    }, []);

    // Expose focus method
    React.useImperativeHandle(ref, () => ({
        focus: () => {
            textareaRef.current?.focus();
        }
    }));

    // Auto-focus on mount and when not paused
    useEffect(() => {
        if (!isLoading && !error && !isPaused && !disabled) {
            textareaRef.current?.focus();
        }
    }, [isLoading, error, isPaused, disabled]);

    // Keep focus when clicking anywhere in the container
    const handleContainerClick = () => {
        if (!disabled) {
            textareaRef.current?.focus();
        }
    };

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onValueChange(e.target.value);
    };

    // Auto-scroll cursor into view when typing
    useEffect(() => {
        const cursor = cursorRef.current;
        if (cursor && !isPaused) {
            cursor.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    }, [currentIndex, isPaused]);

    return (
        <div
            ref={containerRef}
            className={`relative flex-grow min-h-0 w-full flex flex-col ${isError ? 'animate-shake' : ''} ${className}`}
            onClick={handleContainerClick}
            style={{
                maxHeight: `${viewportHeight}px`,
                transition: 'max-height 0.3s ease-out'
            }}
        >
            {/* Hidden Textarea for Input */}
            <textarea
                ref={textareaRef}
                className="absolute opacity-0 w-px h-px p-0 m-0 border-0 -z-10"
                value={value}
                onChange={handleChange}
                disabled={disabled}
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

                <div className="flex-grow overflow-y-auto custom-scrollbar relative" ref={scrollableCardRef}>
                    <div className="p-4 md:p-6 min-h-full font-mono leading-relaxed">
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
