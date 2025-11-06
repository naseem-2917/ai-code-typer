import { useState, useEffect, useCallback, useRef } from 'react';
import { SavableTypingGameState } from '../types';

export enum CharState {
  Idle,
  Correct,
  Incorrect,
}

interface TypingGameOptions {
  onPause?: () => void;
  onResume?: () => void;
}

export interface TypingGame {
  charStates: CharState[];
  typedText: string;
  wpm: number;
  accuracy: number;
  errors: number;
  duration: number;
  isFinished: boolean;
  currentIndex: number;
  isError: boolean;
  isPaused: boolean;
  handleKeyDown: (key: string) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  reset: () => void;
  clearAutoPauseTimer: () => void;
  resetIdleTimer: () => void;
  errorMap: Record<string, number>;
  attemptMap: Record<string, number>;
  getSavableState: () => SavableTypingGameState;
  restoreState: (savedState: SavableTypingGameState) => void;
}


const useTypingGame = (textToType: string, errorThreshold: number, options: TypingGameOptions = {}): TypingGame => {
  const { onPause, onResume } = options;
  const [startTime, setStartTime] = useState<number | null>(null);
  const [charStates, setCharStates] = useState<CharState[]>(
    Array(textToType.length).fill(CharState.Idle)
  );
  const [typedText, setTypedText] = useState('');
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [duration, setDuration] = useState(0); // Duration in seconds
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const gameStateRef = useRef({
    isPaused: false,
    isFinished: false,
    startTime: null as number | null,
    isTypingStarted: false,
  });

  useEffect(() => {
    gameStateRef.current = { ...gameStateRef.current, isPaused, isFinished, startTime };
  });

  const autoPauseTimerRef = useRef<number | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  const currentIndex = typedText.length;
  
  const timerIntervalRef = useRef<number | null>(null);
  const accumulatedDurationRef = useRef<number>(0);
  const lastResumeTimeRef = useRef<number | null>(null);

  const errorMapRef = useRef<Record<string, number>>({});
  const attemptMapRef = useRef<Record<string, number>>({});
  
  const clearAutoPauseTimer = useCallback(() => {
    if (autoPauseTimerRef.current) {
      clearTimeout(autoPauseTimerRef.current);
      autoPauseTimerRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const pauseGame = useCallback(() => {
    const { isPaused, isFinished, startTime } = gameStateRef.current;
    if (isPaused || isFinished || !startTime) return;
    
    clearAutoPauseTimer();
    stopTimer();
    
    if (lastResumeTimeRef.current) {
      accumulatedDurationRef.current += Date.now() - lastResumeTimeRef.current;
    }
    
    setIsPaused(true);
    if (onPause) onPause();
  }, [onPause, clearAutoPauseTimer, stopTimer]);
  
  const resetIdleTimer = useCallback(() => {
    clearAutoPauseTimer();
    if (!gameStateRef.current.isFinished) {
      autoPauseTimerRef.current = window.setTimeout(pauseGame, 5000);
    }
  }, [clearAutoPauseTimer, pauseGame]);
  
  const startTimer = useCallback(() => {
    stopTimer();
    lastResumeTimeRef.current = Date.now();
    timerIntervalRef.current = window.setInterval(() => {
      if (lastResumeTimeRef.current) {
        const elapsedSinceResume = Date.now() - lastResumeTimeRef.current;
        setDuration((accumulatedDurationRef.current + elapsedSinceResume) / 1000);
      }
    }, 100);
  }, [stopTimer]);
  
  const resumeGame = useCallback(() => {
    const { isPaused, isFinished } = gameStateRef.current;
    if (!isPaused || isFinished) return;

    setIsPaused(false);
    startTimer();
    resetIdleTimer();
    if (onResume) onResume();
  }, [onResume, resetIdleTimer, startTimer]);

  const reset = useCallback(() => {
    stopTimer();
    setStartTime(null);
    setCharStates(Array(textToType.length).fill(CharState.Idle));
    setTypedText('');
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setDuration(0);
    setConsecutiveErrors(0);
    setIsFinished(false);
    setIsError(false);
    setIsPaused(false);
    
    accumulatedDurationRef.current = 0;
    lastResumeTimeRef.current = null;
    gameStateRef.current.isTypingStarted = false;

    errorMapRef.current = {};
    attemptMapRef.current = {};
    
    const newAttemptMap: Record<string, number> = {};
    for (const char of textToType) {
      newAttemptMap[char] = (newAttemptMap[char] || 0) + 1;
    }
    attemptMapRef.current = newAttemptMap;

    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    clearAutoPauseTimer();
  }, [textToType, clearAutoPauseTimer, stopTimer]);

  useEffect(() => {
    reset();
  }, [reset]);

  const handleKeyDown = useCallback((key: string) => {
      const isPrintable = key.length === 1;
      const isAllowedControlKey = ['Tab', 'Control', 'Shift', 'Enter', 'Backspace'].includes(key);

      if (gameStateRef.current.isFinished || textToType.length === 0) {
        return;
      }
      
      // If the key is not a valid typing key, ignore it for timer/resume purposes.
      if (!isPrintable && !isAllowedControlKey) {
        return;
      }

      if (gameStateRef.current.isPaused) {
          resumeGame();
      } else if (gameStateRef.current.isTypingStarted) {
          resetIdleTimer();
      }
    
      if (!gameStateRef.current.isTypingStarted) {
        setStartTime(Date.now());
        startTimer();
        resetIdleTimer();
        gameStateRef.current.isTypingStarted = true;
      }
    
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      setIsError(false);

      if (key === 'Backspace') {
        setConsecutiveErrors(0);
        if (currentIndex > 0) {
          setTypedText(prev => prev.slice(0, -1));
          setCharStates(prev => {
            const newStates = [...prev];
            newStates[currentIndex - 1] = CharState.Idle;
            return newStates;
          });
        }
      } else {
        const inputChar = key === 'Enter' ? '\n' : (key === 'Tab' ? '\t' : (isPrintable ? key : null));
        if (inputChar !== null && currentIndex < textToType.length) {
          const expectedChar = textToType[currentIndex];
          const isCorrect = inputChar === expectedChar;

          if (!isCorrect) {
            errorMapRef.current[expectedChar] = (errorMapRef.current[expectedChar] || 0) + 1;
            const newConsecutiveErrors = consecutiveErrors + 1;
            setErrors(prev => prev + 1);
            if (errorThreshold > 0 && newConsecutiveErrors >= errorThreshold) {
              setConsecutiveErrors(newConsecutiveErrors);
              setIsError(true);
              errorTimeoutRef.current = window.setTimeout(() => setIsError(false), 200);
              return;
            }
            setConsecutiveErrors(newConsecutiveErrors);
          } else {
            setConsecutiveErrors(0);
          }

          setTypedText(prev => prev + inputChar);
          setCharStates(prev => {
            const newStates = [...prev];
            newStates[currentIndex] = isCorrect ? CharState.Correct : CharState.Incorrect;
            return newStates;
          });

          if (currentIndex + 1 === textToType.length) {
            clearAutoPauseTimer();
            stopTimer();
            
            const finalAccumulated = accumulatedDurationRef.current + (lastResumeTimeRef.current ? (Date.now() - lastResumeTimeRef.current) : 0);
            const finalDurationInSeconds = finalAccumulated / 1000;
            
            setDuration(finalDurationInSeconds);

            const durationInMinutes = finalDurationInSeconds / 60;
            const wordsTyped = textToType.length / 5;
            const finalWpm = durationInMinutes > 0 ? Math.round(wordsTyped / durationInMinutes) : 0;
            setWpm(finalWpm);
            
            const finalAccuracy = Math.max(0, ((textToType.length - (errors + (isCorrect ? 0 : 1))) / textToType.length) * 100);
            setAccuracy(parseFloat(finalAccuracy.toFixed(2)));
            setIsFinished(true);
          }
        }
      }
  }, [
      currentIndex, textToType, errors, errorThreshold, consecutiveErrors, 
      resumeGame, clearAutoPauseTimer, resetIdleTimer, startTimer, stopTimer
  ]);

  useEffect(() => {
    if (startTime && !isFinished) {
      const currentTotalDurationMs = accumulatedDurationRef.current + (lastResumeTimeRef.current && !isPaused ? (Date.now() - lastResumeTimeRef.current) : 0);
      const durationInMinutes = currentTotalDurationMs / 60000;

      const wordsTyped = typedText.length / 5;
      if (durationInMinutes > 0) {
        setWpm(Math.round(wordsTyped / durationInMinutes));
      } else {
        setWpm(0);
      }
      
      const totalTyped = typedText.length;
      if (totalTyped > 0) {
        const correctChars = typedText.split('').filter((char, index) => char === textToType[index]).length;
        setAccuracy(parseFloat(((correctChars / totalTyped) * 100).toFixed(2)));
      } else {
        setAccuracy(100);
      }
    } else if (!startTime) {
        setWpm(0);
        setAccuracy(100);
    }
  }, [typedText, startTime, isFinished, isPaused, textToType]);
  
  useEffect(() => stopTimer, [stopTimer]);

  const getSavableState = useCallback((): SavableTypingGameState => {
    const currentAccumulated = accumulatedDurationRef.current + (lastResumeTimeRef.current && !gameStateRef.current.isPaused ? (Date.now() - lastResumeTimeRef.current) : 0);
    return {
      startTime: gameStateRef.current.startTime,
      charStates,
      typedText,
      errors,
      consecutiveErrors,
      isFinished,
      accumulatedDuration: currentAccumulated,
      errorMap: errorMapRef.current,
      attemptMap: attemptMapRef.current,
      isTypingStarted: gameStateRef.current.isTypingStarted,
    };
  }, [charStates, typedText, errors, consecutiveErrors, isFinished]);

  const restoreState = useCallback((savedState: SavableTypingGameState) => {
    stopTimer();
    setStartTime(savedState.startTime);
    setCharStates(savedState.charStates);
    setTypedText(savedState.typedText);
    setErrors(savedState.errors);
    setConsecutiveErrors(savedState.consecutiveErrors);
    setIsFinished(savedState.isFinished);

    accumulatedDurationRef.current = savedState.accumulatedDuration;
    lastResumeTimeRef.current = null;

    errorMapRef.current = savedState.errorMap;
    attemptMapRef.current = savedState.attemptMap;

    gameStateRef.current.isTypingStarted = savedState.isTypingStarted;
    gameStateRef.current.startTime = savedState.startTime;

    setDuration(savedState.accumulatedDuration / 1000);
    setIsPaused(true);
  }, [stopTimer]);

  return {
    charStates, typedText, wpm, accuracy, errors, duration, isFinished,
    currentIndex, isError, isPaused, handleKeyDown, pauseGame, resumeGame,
    reset, clearAutoPauseTimer, resetIdleTimer,
    errorMap: errorMapRef.current,
    attemptMap: attemptMapRef.current,
    getSavableState,
    restoreState,
  };
};

export default useTypingGame;