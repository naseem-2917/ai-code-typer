import React, { useEffect, useState, useRef, useMemo, useContext } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Stat } from './ui/Stat';
import { StarRating } from './StarRating';
import { CircularGauge } from './CircularGauge';
import { ConfettiEffect } from './ConfettiEffect';
import { calculateStars, getStarMessage } from '../utils/starCalculation';
import { AppContext } from '../context/AppContext';
import { soundManager } from '../utils/soundManager';

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
  title?: string;
  isEarlyExit?: boolean;
  isMultiFileSession?: boolean;
  onNextSnippet?: () => void;
  hasNextSnippet?: boolean;
  sessionErrorMap?: Record<string, number>;
  sessionAttemptMap?: Record<string, number>;
  saveStatus?: { saved: boolean; reason?: string } | null;
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
  title,
  isEarlyExit = false,
  isMultiFileSession = false,
  onNextSnippet,
  hasNextSnippet = false,
  sessionErrorMap = {},
  sessionAttemptMap = {},
  saveStatus,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Get goals from context for star calculation
  const context = useContext(AppContext);
  const { wpmGoal = 20, accuracyGoal = 95 } = context || {};

  // Calculate star rating
  const stars = calculateStars(stats.wpm, stats.accuracy, wpmGoal, accuracyGoal);
  const starMessage = getStarMessage(stars);

  // Animation stages for engaging reveal
  const [animStage, setAnimStage] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setAnimStage(0);
      return;
    }

    // Sequential animation stages
    const stages = [
      { delay: 0, stage: 1 },     // Modal opens
      { delay: 500, stage: 2 },   // Stars appear
      { delay: 1500, stage: 3 },  // Gauges fill
      { delay: 2300, stage: 4 }   // Message + confetti
    ];

    const timeouts = stages.map(({ delay, stage }) =>
      setTimeout(() => setAnimStage(stage), delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [isOpen]);

  // Play star unlock sounds sequentially
  useEffect(() => {
    if (!isOpen || animStage < 2) return;

    const totalStars = Math.floor(stars);
    const soundTimeouts: number[] = [];

    for (let i = 1; i <= totalStars; i++) {
      const timeout = window.setTimeout(() => {
        soundManager.playStar(i);
      }, i * 200) as unknown as number;

      soundTimeouts.push(timeout);
    }

    return () => soundTimeouts.forEach(clearTimeout);
  }, [isOpen, animStage, stars]);

  // FIX: Button logic now adds "View Your Progress" to the "Session Ended" popup for consistency.
  const buttons = useMemo(() => {
    const newSnippetButton = { label: 'New Snippet', action: onNewSnippet };
    const practiceSameButton = { label: 'Practice Same Code', action: onPracticeSame };
    const viewProgressButton = { label: 'View Your Progress', action: onViewProgress };
    const nextSnippetButton = { label: 'Next Snippet', action: onNextSnippet! };
    const resumeButton = { label: 'Resume', action: onClose };

    let actionButtons = [];

    if (hasNextSnippet && onNextSnippet) {
      actionButtons.push(nextSnippetButton);
    }

    if (isEarlyExit) {
      actionButtons.push(resumeButton, newSnippetButton, practiceSameButton, viewProgressButton);
    } else {
      if (lastPracticeAction === 'practice_same' && !isMultiFileSession) {
        actionButtons.push(practiceSameButton, newSnippetButton);
      } else {
        actionButtons.push(newSnippetButton, practiceSameButton);
      }
      actionButtons.push(viewProgressButton);
    }

    return actionButtons;
  }, [isEarlyExit, isMultiFileSession, lastPracticeAction, onNewSnippet, onPracticeSame, onViewProgress, onNextSnippet, hasNextSnippet, onClose]);

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


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        {/* Star Rating Display */}
        {animStage >= 2 && (
          <div className="text-center">
            <StarRating stars={stars} animated />
          </div>
        )}

        {/* Circular Gauges for Accuracy & WPM */}
        {animStage >= 3 && (
          <div className="flex gap-8 justify-center mb-6">
            <CircularGauge
              value={stats.accuracy}
              max={100}
              label="accuracy"
              color="purple"
            />
            <CircularGauge
              value={stats.wpm}
              max={wpmGoal}
              label="wpm"
              color="blue"
            />
          </div>
        )}

        {/* Motivational Message */}
        {animStage >= 4 && (
          <p className="text-lg text-center font-medium text-slate-700 dark:text-slate-300 animate-fade-in">
            {starMessage}
          </p>
        )}

        {/* Stats Grid - Only Errors & Duration (WPM/Accuracy shown in gauges above) */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <Stat label="Errors" value={stats.errors} />
          <Stat label="Duration" value={formatDuration(stats.duration)} />
        </div>

        {(isEarlyExit || (saveStatus && !saveStatus.saved)) && (
          <div className={`text-center py-2 px-4 rounded-md ${saveStatus?.saved ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
            <p className="font-medium">
              {saveStatus?.saved
                ? "Progress Saved"
                : saveStatus?.reason || "Session Ended Early (Not Saved)"}
            </p>
          </div>
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

      {/* Confetti for high scores */}
      {animStage >= 4 && stars >= 4 && <ConfettiEffect />}
    </Modal>
  );
};
