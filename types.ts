export interface Language {
  id: string;
  name: string;
  prismAlias: string;
}

export interface PracticeStats {
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
export type Page = 'home' | 'practice' | 'dashboard';