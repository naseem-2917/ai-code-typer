import { CharState } from './hooks/useTypingGame';

export interface Language {
  id: string;
  name: string;
  prismAlias: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  languageId: string; // Storing ID string instead of full object for simpler serialization
  snippetLength: SnippetLength;
  snippetLevel: SnippetLevel;
  blockOnErrorThreshold: number;
  fontSize: FontSize;
  showKeyboard: boolean;
  showHandGuide: boolean;
  wpmGoal: number;
  accuracyGoal: number;
  timeGoal: number;
  // Session Persistence
  lastSetupTab: 'generate' | 'upload';
  lastPracticeMode: PracticeMode;
  generalContentTypes: ContentType[];
}

export interface UserData {
  history: PracticeStats[];
  preferences?: UserPreferences;
}

export interface PracticeStats {
  id: string;
  wpm: number;
  accuracy: number;
  errors: number;
  language: string;
  timestamp: number;
  duration: number;
  linesTyped: number;
  errorMap?: Record<string, number>;
  attemptMap?: Record<string, number>;
}

export interface PracticeQueueItem {
  code: string;
  name: string;
  language: Language;
}

export type SnippetLength = 'short' | 'medium' | 'long';
export type SnippetLevel = 'easy' | 'medium' | 'hard';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';
export type Page = 'home' | 'practice' | 'dashboard' | 'history' | 'profile';
export type PracticeMode = 'code' | 'general' | 'targeted' | 'error-training';
export type ContentType = 'characters' | 'numbers' | 'symbols';

export interface SavableTypingGameState {
  startTime: number | null;
  charStates: CharState[];
  typedText: string;
  errors: number;
  consecutiveErrors: number;
  isFinished: boolean;
  accumulatedDuration: number;
  errorMap: Record<string, number>;
  attemptMap: Record<string, number>;
  isTypingStarted: boolean;
}

export interface SavedContextState {
  snippet: string;
  selectedLanguage: Language;
  isCustomSession: boolean;
  currentTargetedKeys: string[];
  practiceQueue: PracticeQueueItem[];
  currentQueueIndex: number;
}

export interface PausedSessionData {
  game: SavableTypingGameState;
  context: SavedContextState;
  timestamp: number;
}

export interface FinishedSessionData {
  stats: {
    wpm: number;
    accuracy: number;
    errors: number;
    duration: number;
    errorMap: Record<string, number>;
    attemptMap: Record<string, number>;
  };
  isEarlyExit: boolean;
  isCustomSession: boolean;
  lastPracticeAction: 'generate' | 'upload' | 'practice_same' | null;
  isMultiFileSession: boolean;
  currentTargetedKeys: string[];
}
