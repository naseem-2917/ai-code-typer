import React, { useState, useEffect, useContext } from 'react';
import { CharState } from '../hooks/useTypingGame';
import { AppContext } from '../context/AppContext';

// This is a browser-only type. Assuming Prism is loaded from CDN.
declare const Prism: any;

interface CodeSnippetProps {
    code: string;
    languageAlias: string;
    charStates?: CharState[];
    currentIndex?: number;
    isError?: boolean;
    cursorRef?: React.RefObject<HTMLSpanElement>;
}

interface HighlightedChar {
    char: string;
    classNames: string[];
    originalIndex: number;
}

interface LogicalLine {
    chars: HighlightedChar[];
    lineNumber: number;
}

const CodeSnippet: React.FC<CodeSnippetProps> = ({ code, charStates, currentIndex, languageAlias, isError, cursorRef }) => {
    const [logicalLines, setLogicalLines] = useState<LogicalLine[]>([{ chars: [], lineNumber: 1 }]);
    const context = useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const { fontSize } = context;

    const isInteractive = charStates !== undefined && currentIndex !== undefined;

    const fontSizeClass = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
    }[fontSize];


    useEffect(() => {
        const highlightedChars: HighlightedChar[] = [];
        if (code && languageAlias && typeof Prism !== 'undefined' && Prism.languages[languageAlias]) {
            try {
                const tokens = Prism.tokenize(code, Prism.languages[languageAlias]);
                let charIndex = 0;

                const processTokenStream = (tokenStream: (string | any)[]) => {
                    for (const token of tokenStream) {
                        if (typeof token === 'string') {
                            for (const char of token) {
                                highlightedChars.push({ char, classNames: ['token', 'plain'], originalIndex: charIndex++ });
                            }
                        } else {
                            const classNames = ['token', token.type];
                            if (token.alias) {
                                const aliases = Array.isArray(token.alias) ? token.alias : [token.alias];
                                classNames.push(...aliases);
                            }

                            if (typeof token.content === 'string') {
                                for (const char of token.content) {
                                    highlightedChars.push({ char, classNames, originalIndex: charIndex++ });
                                }
                            } else if (Array.isArray(token.content)) {
                                // This is a simplification. True nested highlighting would require passing parent classes.
                                // For this app's purpose, tokenizing preserves characters which is the main goal.
                                processTokenStream(token.content);
                            }
                        }
                    }
                };

                processTokenStream(tokens);

                // Safety check to ensure tokenization didn't alter content length, which would break the app.
                if (highlightedChars.map(c => c.char).join('') !== code) {
                    throw new Error("Tokenization resulted in content mismatch.");
                }
            } catch (e) {
                console.error("Prism tokenization failed, falling back to plain text.", e);
                // Clear any partial results and fall back
                highlightedChars.length = 0;
                highlightedChars.push(...code.split('').map((char, index) => ({ char, classNames: [], originalIndex: index })));
            }
        } else {
            // Fallback for no language support or no code
            highlightedChars.push(...code.split('').map((char, index) => ({ char, classNames: [], originalIndex: index })));
        }

        const newLogicalLines: LogicalLine[] = [];
        if (code) {
            let currentLineChars: HighlightedChar[] = [];
            let lineCounter = 1;

            for (const charInfo of highlightedChars) {
                currentLineChars.push(charInfo);
                if (charInfo.char === '\n') {
                    newLogicalLines.push({ chars: currentLineChars, lineNumber: lineCounter++ });
                    currentLineChars = [];
                }
            }
            if (currentLineChars.length > 0) {
                newLogicalLines.push({ chars: currentLineChars, lineNumber: lineCounter });
            }
            if (newLogicalLines.length === 0) {
                newLogicalLines.push({ chars: [], lineNumber: 1 });
            }
        } else {
            newLogicalLines.push({ chars: [], lineNumber: 1 });
        }
        setLogicalLines(newLogicalLines);
    }, [code, languageAlias]);

    const renderChar = (charInfo: HighlightedChar) => {
        const index = charInfo.originalIndex;
        const isCurrentChar = isInteractive && index === currentIndex;

        let charSpecificClassName;

        if (isInteractive) {
            if (index < currentIndex!) {
                switch (charStates![index]) {
                    case CharState.Correct:
                        charSpecificClassName = 'text-primary-500 dark:text-primary-400';
                        break;
                    case CharState.Incorrect:
                        charSpecificClassName = 'text-red-500 bg-red-500/20 rounded-sm';
                        break;
                    case CharState.Warning:
                        charSpecificClassName = 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/20 rounded-sm';
                        break;
                    default:
                        charSpecificClassName = 'text-gray-400';
                        break;
                }
            } else {
                charSpecificClassName = 'text-gray-600 dark:text-gray-400';
            }
        } else {
            charSpecificClassName = charInfo.classNames.join(' ');
        }

        // Use a different, less intrusive color for untyped text in interactive mode
        if (isInteractive && index > currentIndex!) {
            charSpecificClassName = 'text-gray-600 dark:text-gray-400';
        }

        return (
            <span key={index} ref={isCurrentChar ? cursorRef : undefined} className="relative">
                {isInteractive && isCurrentChar && !isError && (
                    <span className="absolute top-0 left-0 w-0.5 h-full bg-primary-400 animate-blink rounded-full"></span>
                )}
                <span className={`${charSpecificClassName} ${isInteractive && isCurrentChar && isError ? 'bg-red-500/20 rounded-sm' : ''}`}>
                    {charInfo.char === '\n' ? '' : charInfo.char}
                </span>
                {/* End of Line Error Indicator */}
                {isInteractive && isCurrentChar && isError && charInfo.char === '\n' && (
                    <span className="absolute top-0 left-0 text-red-500 select-none pointer-events-none">↵</span>
                )}
            </span>
        );
    };

    return (
        <div className={`font-mono leading-relaxed tracking-wide ${fontSizeClass} [tab-size:4]`}>
            {logicalLines.map(({ chars, lineNumber }, lineIndex) => {
                const isBlankLine = chars.length === 1 && chars[0].char === '\n';
                const isLastLine = lineIndex === logicalLines.length - 1;
                const showCursorAtEnd = isLastLine && isInteractive && currentIndex === code.length && code.length > 0;

                return (
                    <div key={lineIndex} className="flex">
                        <div className="text-right pr-4 text-gray-500 dark:text-gray-400 select-none flex-shrink-0 w-10 sm:w-12" aria-hidden="true">
                            {lineNumber}
                        </div>
                        <div className="flex-1 min-w-0 whitespace-pre-wrap break-all">
                            {chars.map(renderChar)}
                            {/* If the line is blank, render an invisible non-breaking space to give it height,
                                which ensures the cursor placed on the newline character is visible. */}
                            {isBlankLine && <span className="opacity-0 select-none">&nbsp;</span>}
                            {showCursorAtEnd && (
                                <span ref={cursorRef} className="relative inline-block w-0">
                                    {'\u200b'}
                                    {/* EOF Error Indicator */}
                                    {isError ? (
                                        <span className="absolute top-0 left-0 w-2 h-full bg-red-500/50 animate-pulse rounded-sm"></span>
                                    ) : (
                                        <span className="absolute top-0 left-0 w-0.5 h-full bg-primary-400 animate-blink rounded-full"></span>
                                    )}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CodeSnippet;