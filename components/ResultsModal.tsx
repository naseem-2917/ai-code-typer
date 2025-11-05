import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Stat } from './ui/Stat';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPracticeSame: () => void;
  onNewSnippet: () => void;
  onViewProgress: () => void;
  isCustomSession: boolean;
  lastPracticeAction: 'generate' | 'upload' | 'practice_same' | null;
  stats: {
    wpm: number;
    accuracy: number;
    errors: number;
    duration: number;
  };
  isEarlyExit?: boolean;
  isMultiFileSession?: boolean;
  onNextSnippet?: () => void;
}

const formatDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return "0:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ 
  isOpen, 
  onClose,
  onPracticeSame,
  onNewSnippet,
  onViewProgress,
  isCustomSession,
  lastPracticeAction,
  stats,
  isEarlyExit = false,
  isMultiFileSession = false,
  onNextSnippet,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // FIX: Button logic now adds "View Your Progress" to the "Session Ended" popup for consistency.
  const buttons = useMemo(() => {
    const newSnippetButton = { label: 'New Snippet', action: onNewSnippet };
    const practiceSameButton = { label: 'Practice Same Code', action: onPracticeSame };
    const viewProgressButton = { label: 'View Your Progress', action: onViewProgress };
    const nextSnippetButton = { label: 'Next Snippet', action: onNextSnippet! };

    let actionButtons = [];
    
    if (isMultiFileSession) {
        actionButtons.push(nextSnippetButton);
    }

    if (isEarlyExit) {
        actionButtons.push(newSnippetButton, practiceSameButton, viewProgressButton);
    } else {
        if (lastPracticeAction === 'practice_same' && !isMultiFileSession) {
            actionButtons.push(practiceSameButton, newSnippetButton);
        } else {
            actionButtons.push(newSnippetButton, practiceSameButton);
        }
        actionButtons.push(viewProgressButton);
    }
    
    return actionButtons;
  }, [isEarlyExit, isMultiFileSession, lastPracticeAction, onNewSnippet, onPracticeSame, onViewProgress, onNextSnippet]);
  
  useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, buttons.length);
  }, [buttons]);

  useEffect(() => {
    if (isOpen) {
      const defaultIndex = 0;
      setFocusedIndex(defaultIndex);
      setTimeout(() => {
        buttonRefs.current[defaultIndex]?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // For Tab/Shift+Tab, we let the browser handle focus changes.
      // The `onFocus` prop on each button will automatically update our `focusedIndex` state.
      if (event.key === 'Tab') {
          return;
      }

      // For Arrow keys, we manually control focus.
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); // Prevent page scrolling
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const newIndex = (focusedIndex + direction + buttons.length) % buttons.length;
        setFocusedIndex(newIndex);
        buttonRefs.current[newIndex]?.focus();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        // Click the button that has state-based focus
        buttonRefs.current[focusedIndex]?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, buttons, focusedIndex]);

  const title = isEarlyExit ? "Session Ended" : "Session Complete!";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        {!isEarlyExit ? (
            <div className="grid grid-cols-2 gap-4 text-center">
                <Stat label="WPM" value={stats.wpm} />
                <Stat label="Accuracy" value={`${stats.accuracy}%`} />
                <Stat label="Errors" value={stats.errors} />
                <Stat label="Duration" value={formatDuration(stats.duration)} />
            </div>
        ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                {stats.wpm > 0 
                    ? "Your progress for this session has been saved."
                    : "You ended the session before any progress could be saved."
                }
            </p>
        )}
        
        <div className="flex flex-col gap-3">
          {buttons.map((btn, index) => (
            <Button
              key={btn.label}
              ref={el => { buttonRefs.current[index] = el; }}
              size="lg"
              className="w-full"
              onClick={btn.action}
              variant={index === focusedIndex ? 'primary' : 'secondary'}
              onMouseEnter={() => setFocusedIndex(index)}
              onFocus={() => setFocusedIndex(index)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
};
