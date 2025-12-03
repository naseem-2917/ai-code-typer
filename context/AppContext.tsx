import React, { createContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Language, SnippetLength, SnippetLevel, FontSize, Page, PracticeStats, PracticeQueueItem, SavedContextState, PracticeMode, ContentType } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { generateCodeSnippet, generateTargetedCodeSnippet, generateGeneralSnippet, generateErrorPracticeSnippet } from '../services/geminiService';
import { updateDailyPracticeTime } from '../services/dataService';

const CUSTOM_LANGUAGE: Language = { id: 'custom', name: 'Custom', prismAlias: 'clike' };

const getLanguageFromExtension = (filename: string): Language => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex < 0) {
    return CUSTOM_LANGUAGE;
  }
  const extension = filename.substring(lastDotIndex).toLowerCase();

  const extensionMap: Record<string, Language | undefined> = {
    '.py': SUPPORTED_LANGUAGES.find(l => l.id === 'python'),
    '.js': SUPPORTED_LANGUAGES.find(l => l.id === 'javascript'),
    '.jsx': SUPPORTED_LANGUAGES.find(l => l.id === 'javascript'),
    '.ts': SUPPORTED_LANGUAGES.find(l => l.id === 'typescript'),
    '.tsx': SUPPORTED_LANGUAGES.find(l => l.id === 'typescript'),
    '.java': SUPPORTED_LANGUAGES.find(l => l.id === 'java'),
    '.cpp': SUPPORTED_LANGUAGES.find(l => l.id === 'cpp'),
    '.cc': SUPPORTED_LANGUAGES.find(l => l.id === 'cpp'),
    '.cxx': SUPPORTED_LANGUAGES.find(l => l.id === 'cpp'),
    '.h': SUPPORTED_LANGUAGES.find(l => l.id === 'cpp'),
    '.hpp': SUPPORTED_LANGUAGES.find(l => l.id === 'cpp'),
    '.go': SUPPORTED_LANGUAGES.find(l => l.id === 'go'),
    '.rs': SUPPORTED_LANGUAGES.find(l => l.id === 'rust'),
  };
  return extensionMap[extension] || CUSTOM_LANGUAGE;
};

const convertSpacesToTabs = (code: string): string => {
  return code
    .split('\n')
    .map(line => {
      const leadingSpacesMatch = line.match(/^ +/);
      if (leadingSpacesMatch) {
        const spaceCount = leadingSpacesMatch[0].length;
        if (spaceCount > 0 && spaceCount % 4 === 0) {
          const tabCount = spaceCount / 4;
          const tabs = '\t'.repeat(tabCount);
          return tabs + line.substring(spaceCount);
        }
      }
      return line;
    })
    .join('\n');
};

const safeParseJSON = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
  return fallback;
  }
};

  interface AppContextType {
    theme: 'light' | 'dark';
  toggleTheme: () => void;
  selectedLanguage: Language;
  setSelectedLanguage: (language: Language) => void;
  snippet: string;
  isLoadingSnippet: boolean;
  snippetError: string | null;
  fetchNewSnippet: (options?: {length ?: SnippetLength, level ?: SnippetLevel, mode ?: PracticeMode, contentTypes ?: ContentType[]}) => Promise<boolean>;
  startCustomSession: (code: string, mode?: PracticeMode) => void;
    startTargetedSession: (keys: string[], options: {length: SnippetLength, level: SnippetLevel }) => void;
  startErrorPracticeSession: () => void;
    isCustomSession: boolean;
    isMultiFileSession: boolean;
    snippetLength: SnippetLength;
  setSnippetLength: (length: SnippetLength) => void;
    snippetLevel: SnippetLevel;
  setSnippetLevel: (level: SnippetLevel) => void;
    blockOnErrorThreshold: number;
  setBlockOnErrorThreshold: (threshold: number) => void;
    fontSize: FontSize;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
    showKeyboard: boolean;
  toggleKeyboard: () => void;
    showHandGuide: boolean;
  toggleHandGuide: () => void;
    page: Page;
  navigateTo: (page: Page) => void;
  getPreviousPage: () => Page | null;
    isSetupModalOpen: boolean;
  openSetupModal: () => void;
  closeSetupModal: () => void;
    isInitialSetupComplete: boolean;
    setupTab: 'generate' | 'upload';
  setSetupTab: (tab: 'generate' | 'upload') => void;
    practiceHistory: PracticeStats[];
  addPracticeResult: (stats: PracticeStats) => void;
    keyErrorStats: Record<string, number>;
    keyAttemptStats: Record<string, number>;
    wpmGoal: number;
    accuracyGoal: number;
    timeGoal: number;
    dailyPracticeTime: number;
  setGoals: (wpm: number, accuracy: number, time: number) => void;
    isAccessKeyMenuVisible: boolean;
  showAccessKeyMenu: () => void;
  hideAccessKeyMenu: () => void;
    currentTargetedKeys: string[];
  setCurrentTargetedKeys: (keys: string[]) => void;
    lastPracticeAction: 'generate' | 'upload' | 'practice_same' | null;
  setLastPracticeAction: (action: 'generate' | 'upload' | 'practice_same') => void;
  setRequestFocusOnCodeCallback: (callback: (() => void) | null) => void;
  requestFocusOnCode: () => void;
    practiceQueue: PracticeQueueItem[];
    currentQueueIndex: number;
  startMultiFileSession: (files: File[]) => Promise<void>;
  loadNextSnippetInQueue: () => void;
      alertMessage: {message: string; type: 'warning' | 'info' | 'error' } | null;
  showAlert: (message: string, type: 'warning' | 'info' | 'error', duration?: number) => void;
  reloadDataFromStorage: () => void;

      practiceMode: PracticeMode;
  setPracticeMode: (mode: PracticeMode) => void;

      // Renamed to generalContentTypes for clarity
      generalContentTypes: ContentType[];
  setGeneralContentTypes: (types: ContentType[]) => void;

      sessionResetKey: number;
  handleStartFromSetup: (length: SnippetLength | null, level: SnippetLevel | null, customCode?: string | null, mode?: PracticeMode, contentTypes?: ContentType[]) => void;
  handleNextSnippet: () => void;
  handlePracticeSame: () => void;
  handleSetupNew: () => void;
  deletePracticeSession: (timestamp: number) => void;
  clearPracticeHistory: () => void;
}

      export const AppContext = createContext<AppContextType | null>(null);

      const FONT_SIZES: FontSize[] = ['sm', 'md', 'lg', 'xl'];

      export const AppProvider: React.FC<{ children: ReactNode }> = ({children}) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

      const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    const savedLangId = localStorage.getItem('selectedLanguage');
    return SUPPORTED_LANGUAGES.find(l => l.id === savedLangId) || SUPPORTED_LANGUAGES[0];
  });

        const [practiceMode, setPracticeMode] = useState<PracticeMode>('code');

          // Initialize generalContentTypes from LocalStorage
          const [generalContentTypes, setGeneralContentTypes] = useState<ContentType[]>(() =>
          safeParseJSON('generalContentTypes', ['characters'])
          );

          const [snippet, setSnippet] = useState('');
          const [isLoadingSnippet, setIsLoadingSnippet] = useState(false);
          const [snippetError, setSnippetError] = useState<string | null>(null);
          const [isCustomSession, setIsCustomSession] = useState(false);

          const [snippetLength, setSnippetLength] = useState<SnippetLength>('medium');
            const [snippetLevel, setSnippetLevel] = useState<SnippetLevel>('medium');
              const [blockOnErrorThreshold, setBlockOnErrorThreshold] = useState<number>(2);

                const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [showKeyboard, setShowKeyboard] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768; // Default to true only on desktop
    }
                  return true;
  });
                  const [showHandGuide, setShowHandGuide] = useState(true);

                  const [page, setPage] = useState<Page>('home');
                    const previousPageRef = useRef<Page | null>(null);
                    const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

                    const [practiceHistory, setPracticeHistory] = useState<PracticeStats[]>(() =>
                    safeParseJSON('practiceHistory', [])
                    );

                    const [keyErrorStats, setKeyErrorStats] = useState<Record<string, number>>(() =>
                      safeParseJSON('keyErrorStats', { })
                      );

                      const [keyAttemptStats, setKeyAttemptStats] = useState<Record<string, number>>(() =>
                        safeParseJSON('keyAttemptStats', { })
                        );

                        const [wpmGoal, setWpmGoal] = useState<number>(() => parseInt(localStorage.getItem('wpmGoal') || '20', 10));
                          const [accuracyGoal, setAccuracyGoal] = useState<number>(() => parseInt(localStorage.getItem('accuracyGoal') || '95', 10));
                            const [timeGoal, setTimeGoal] = useState<number>(() => parseInt(localStorage.getItem('timeGoal') || '15', 10));
                              const [dailyPracticeTime, setDailyPracticeTime] = useState<number>(() => {
    const today = new Date().toISOString().split('T')[0];
                                const storedDate = localStorage.getItem('dailyPracticeDate');
                                if (storedDate === today) {
      return Number(localStorage.getItem('dailyPracticeTime') || '0');
    }
                                // It's a new day, so clear stored time and return 0
                                localStorage.setItem('dailyPracticeTime', '0');
                                localStorage.setItem('dailyPracticeDate', today);
                                return 0;
  });

                                const [isAccessKeyMenuVisible, setIsAccessKeyMenuVisible] = useState(false);
                                const [currentTargetedKeys, setCurrentTargetedKeys] = useState<string[]>([]);
                                const [lastPracticeAction, setLastPracticeAction] = useState<'generate' | 'upload' | 'practice_same' | null>(null);

                                const [focusRequestCallback, setFocusRequestCallback] = useState<(() => void) | null>(null);

                                const [setupTab, setSetupTab] = useState<'generate' | 'upload'>(
    () => (localStorage.getItem('setupTab') as 'generate' | 'upload') || 'generate'
                                );

                                const [practiceQueue, setPracticeQueue] = useState<PracticeQueueItem[]>([]);
                                const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);

                                  const [alertMessage, setAlertMessage] = useState<{ message: string; type: 'warning' | 'info' | 'error' } | null>(null);
                                  const alertTimeoutRef = useRef<number | null>(null);

                                  const [sessionResetKey, setSessionResetKey] = useState(0);


                                  const isInitialSetupComplete = !!snippet;

  useEffect(() => {
                                    document.documentElement.classList.toggle('dark', theme === 'dark');
                                  localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
                                    localStorage.setItem('selectedLanguage', selectedLanguage.id);
  }, [selectedLanguage]);

  // Save generalContentTypes to LocalStorage whenever it changes
  useEffect(() => {
                                    localStorage.setItem('generalContentTypes', JSON.stringify(generalContentTypes));
  }, [generalContentTypes]);

  useEffect(() => {
                                    localStorage.setItem('practiceHistory', JSON.stringify(practiceHistory));
  }, [practiceHistory]);

  useEffect(() => {
                                    localStorage.setItem('keyErrorStats', JSON.stringify(keyErrorStats));
                                  localStorage.setItem('keyAttemptStats', JSON.stringify(keyAttemptStats));
  }, [keyErrorStats, keyAttemptStats]);

  useEffect(() => {
                                    localStorage.setItem('wpmGoal', String(wpmGoal));
                                  localStorage.setItem('accuracyGoal', String(accuracyGoal));
                                  localStorage.setItem('timeGoal', String(timeGoal));
  }, [wpmGoal, accuracyGoal, timeGoal]);

  useEffect(() => {
                                    localStorage.setItem('setupTab', setupTab);
  }, [setupTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
                                    e.preventDefault();
                                  setIsAccessKeyMenuVisible(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
                                    setIsAccessKeyMenuVisible(false);
      }
    };
                                  window.addEventListener('keydown', handleKeyDown);
                                  window.addEventListener('keyup', handleKeyUp);
    return () => {
                                    window.removeEventListener('keydown', handleKeyDown);
                                  window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const openSetupModal = () => setIsSetupModalOpen(true);
  const closeSetupModal = () => setIsSetupModalOpen(false);

  const navigateTo = (p: Page) => {
    if (p !== page) {
                                    previousPageRef.current = page;
    }
                                  setPage(p);
  };

  const getPreviousPage = () => previousPageRef.current;

  const setRequestFocusOnCodeCallback = useCallback((cb: (() => void) | null) => {
                                    setFocusRequestCallback(() => cb);
  }, []);

  const requestFocusOnCode = useCallback(() => {
    if (focusRequestCallback) {
                                    focusRequestCallback();
    }
  }, [focusRequestCallback]);

                                  const fetchNewSnippet = useCallback(async (options?: {length ?: SnippetLength, level ?: SnippetLevel, mode ?: PracticeMode, contentTypes ?: ContentType[]}) => {
    if (isLoadingSnippet) return false;

                                  const targetMode = options?.mode || practiceMode;
                                  const targetLength = options?.length || snippetLength;
                                  const targetLevel = options?.level || snippetLevel;
                                  const targetContentTypes = options?.contentTypes || generalContentTypes;

                                  console.debug(`fetchNewSnippet called with mode: ${targetMode}, contentTypes: ${targetContentTypes.join(', ')}`);

                                  setIsLoadingSnippet(true);
                                  setSnippet('');
                                  setSnippetError(null);
                                  setIsCustomSession(false);

                                  // Clear targeted keys if switching away from targeted mode, unless we are starting a new targeted session
                                  if (targetMode !== 'targeted') {
                                    setCurrentTargetedKeys([]);
    }

                                  try {
                                    let newSnippet = '';
                                  if (targetMode === 'code') {
                                    newSnippet = await generateCodeSnippet(selectedLanguage, targetLength, targetLevel);
      } else if (targetMode === 'targeted') {
        const keys = currentTargetedKeys;
        if (keys.length > 0) {
                                    newSnippet = await generateTargetedCodeSnippet(selectedLanguage, keys, targetLength, targetLevel);
        } else {
                                    // Fallback if no keys
                                    newSnippet = await generateCodeSnippet(selectedLanguage, targetLength, targetLevel);
        }
      } else if (targetMode === 'general') {
                                    newSnippet = await generateGeneralSnippet(targetLength, targetLevel, targetContentTypes);
      }

                                  setSnippet(convertSpacesToTabs(newSnippet));
      setSessionResetKey(prev => prev + 1);
                                  return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate snippet. Please try again.';
                                  setSnippetError(errorMessage);
      setSessionResetKey(prev => prev + 1);
                                  console.error(err);
                                  return false;
    } finally {
                                    setIsLoadingSnippet(false);
    }
  }, [selectedLanguage, snippetLength, snippetLevel, isLoadingSnippet, practiceMode, generalContentTypes, currentTargetedKeys]);

  const startCustomSession = (code: string, mode?: PracticeMode) => {
                                    clearPracticeQueue();
                                  const convertedCode = convertSpacesToTabs(code);
                                  setSnippet(convertedCode);
                                  setIsCustomSession(true);
                                  setCurrentTargetedKeys([]);
    setSessionResetKey(prev => prev + 1);
                                  if (mode) {
                                    setPracticeMode(mode);
    }
  };

  const clearPracticeQueue = () => {
                                    setPracticeQueue([]);
                                  setCurrentQueueIndex(-1);
  };

                                  const startTargetedSession = useCallback(async (keys: string[], options: {length: SnippetLength, level: SnippetLevel }) => {
    if (isLoadingSnippet) return;

                                  setPracticeMode('targeted');
                                  setCurrentTargetedKeys(keys);

                                  clearPracticeQueue();
                                  setSnippet('');
                                  setSnippetError(null);
                                  setIsCustomSession(false);
                                  setIsLoadingSnippet(true);

                                  try {
      const newSnippet = await generateTargetedCodeSnippet(selectedLanguage, keys, options.length, options.level);
                                  setSnippet(convertSpacesToTabs(newSnippet));
      setSessionResetKey(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch a targeted snippet. Please try again.';
                                  setSnippetError(errorMessage);
      setSessionResetKey(prev => prev + 1);
                                  console.error(err);
    } finally {
                                    setIsLoadingSnippet(false);
    }
  }, [selectedLanguage, isLoadingSnippet]);

  const loadSnippetFromQueue = useCallback((index: number) => {
    if (practiceQueue[index]) {
      const item = practiceQueue[index];
                                  setSnippet(item.code);
                                  setSelectedLanguage(item.language);
                                  setCurrentQueueIndex(index);
                                  setIsCustomSession(true);
                                  setCurrentTargetedKeys([]);
                                  setSnippetError(null);
                                  setIsLoadingSnippet(false);
      setSessionResetKey(prev => prev + 1);
    }
  }, [practiceQueue]);

  const startMultiFileSession = async (files: File[]) => {
                                    setIsLoadingSnippet(true);
                                  setSnippet('');
                                  clearPracticeQueue();

                                  const readFile = (file: File): Promise<PracticeQueueItem & {isValid: boolean }> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawCode = e.target?.result as string;
                                  const trimmedCode = rawCode.trim();

                                  const normalizedCode = rawCode.replace(/\r\n?/g, '\n');
                                  const convertedCode = convertSpacesToTabs(normalizedCode);
                                  resolve({
                                    code: convertedCode,
                                  name: file.name,
                                  language: getLanguageFromExtension(file.name),
            isValid: trimmedCode.length >= 2,
          });
        };
        reader.onerror = (e) => reject(e);
                                  reader.readAsText(file);
      });

                                  try {
      const allItems = await Promise.all(files.map(readFile));

      const validQueue = allItems.filter(item => item.isValid);
      const invalidQueue = allItems.filter(item => !item.isValid);

      if (invalidQueue.length > 0) {
        const invalidNames = invalidQueue.map(f => f.name).join(', ');
                                  showAlert(`Ignored files with less than 2 characters: ${invalidNames}`, 'warning', 6000);
      }

                                  if (validQueue.length === 0) {
                                    showAlert("All selected files are invalid. Code must be at least 2 characters long.", 'error');
                                  throw new Error("All selected files are invalid.");
      }

                                  setPracticeQueue(validQueue);
                                  const item = validQueue[0];
                                  setSnippet(item.code);
                                  setSelectedLanguage(item.language);
                                  setCurrentQueueIndex(0);
                                  setIsCustomSession(true);
                                  setSnippetError(null);
      setSessionResetKey(prev => prev + 1);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process files.';
                                  setSnippetError(errorMessage);
      setSessionResetKey(prev => prev + 1);
                                  console.error(err);
                                  throw err;
    } finally {
                                    setIsLoadingSnippet(false);
    }
  };

  const loadNextSnippetInQueue = useCallback(() => {
    const nextIndex = currentQueueIndex + 1;
                                  if (nextIndex < practiceQueue.length) {
                                    loadSnippetFromQueue(nextIndex);
    }
  }, [currentQueueIndex, practiceQueue, loadSnippetFromQueue]);

  const showAlert = useCallback((message: string, type: 'warning' | 'info' | 'error', duration: number = 4000) => {
    if (alertTimeoutRef.current) {
                                    clearTimeout(alertTimeoutRef.current);
    }
                                  setAlertMessage({message, type});
    alertTimeoutRef.current = window.setTimeout(() => {
                                    setAlertMessage(null);
    }, duration);
  }, []);

  const startErrorPracticeSession = useCallback(async () => {
    if (isLoadingSnippet) return;

                                  // 1. Gather all error keys
                                  const allErrorKeys = Object.entries(keyErrorStats)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]) // Sort by error count descending
      .map(([key]) => key);

                                  if (allErrorKeys.length === 0) {
                                    showAlert("No error history found! Practice more to generate error data.", 'info');
                                  return;
    }

                                  setPracticeMode('error-training');
                                  setCurrentTargetedKeys(allErrorKeys); // Set for highlighting

                                  clearPracticeQueue();
                                  setSnippet('');
                                  setSnippetError(null);
                                  setIsCustomSession(false);
                                  setIsLoadingSnippet(true);

                                  try {
      const newSnippet = await generateErrorPracticeSnippet(allErrorKeys);
                                  setSnippet(convertSpacesToTabs(newSnippet));
      setSessionResetKey(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate error practice snippet.';
                                  setSnippetError(errorMessage);
      setSessionResetKey(prev => prev + 1);
                                  console.error(err);
    } finally {
                                    setIsLoadingSnippet(false);
    }
  }, [keyErrorStats, isLoadingSnippet, showAlert]);

  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
                                  if (currentIndex < FONT_SIZES.length - 1) {
                                    setFontSize(FONT_SIZES[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex > 0) {
                                    setFontSize(FONT_SIZES[currentIndex - 1]);
    }
  };

  const toggleKeyboard = () => setShowKeyboard(prev => !prev);
  const toggleHandGuide = () => setShowHandGuide(prev => !prev);

  const addPracticeResult = (stats: PracticeStats) => {
    const finalStats = {...stats};
                                  if (practiceMode === 'general') {
                                    finalStats.language = 'General';
    }
    setPracticeHistory(prev => [...prev, finalStats].slice(-100));
                                  const newDailyTime = updateDailyPracticeTime(finalStats.duration);
                                  setDailyPracticeTime(newDailyTime);

                                  if (stats.errorMap) {
                                    setKeyErrorStats(prev => {
                                      const newStats = { ...prev };
                                      for (const [key, count] of Object.entries(stats.errorMap!)) {
                                        newStats[key] = (newStats[key] || 0) + count;
                                      }
                                      return newStats;
                                    });
    }

                                  if (stats.attemptMap) {
                                    setKeyAttemptStats(prev => {
                                      const newStats = { ...prev };
                                      for (const [key, count] of Object.entries(stats.attemptMap!)) {
                                        newStats[key] = (newStats[key] || 0) + count;
                                      }
                                      return newStats;
                                    });
    }
  };

  const setGoals = (wpm: number, accuracy: number, time: number) => {
                                    setWpmGoal(wpm);
                                  setAccuracyGoal(accuracy);
                                  setTimeGoal(time);
                                  localStorage.setItem('wpmGoal', String(wpm));
                                  localStorage.setItem('accuracyGoal', String(accuracy));
                                  localStorage.setItem('timeGoal', String(time));
  };

  const showAccessKeyMenu = () => setIsAccessKeyMenuVisible(true);
  const hideAccessKeyMenu = () => setIsAccessKeyMenuVisible(false);

  const reloadDataFromStorage = useCallback(() => {
    const savedTheme = localStorage.getItem('theme');
                                  setTheme(savedTheme ? (savedTheme as 'light' | 'dark') : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

                                  const savedLangId = localStorage.getItem('selectedLanguage');
    setSelectedLanguage(SUPPORTED_LANGUAGES.find(l => l.id === savedLangId) || SUPPORTED_LANGUAGES[0]);

                                  setPracticeHistory(safeParseJSON('practiceHistory', []));
                                  setKeyErrorStats(safeParseJSON('keyErrorStats', { }));
                                  setKeyAttemptStats(safeParseJSON('keyAttemptStats', { }));

                                  setWpmGoal(parseInt(localStorage.getItem('wpmGoal') || '20', 10));
                                  setAccuracyGoal(parseInt(localStorage.getItem('accuracyGoal') || '95', 10));
                                  setTimeGoal(parseInt(localStorage.getItem('timeGoal') || '15', 10));
                                  const today = new Date().toISOString().split('T')[0];
                                  const storedDate = localStorage.getItem('dailyPracticeDate');
                                  if (storedDate === today) {
                                    setDailyPracticeTime(Number(localStorage.getItem('dailyPracticeTime') || '0'));
    } else {
                                    setDailyPracticeTime(0);
    }

                                  setSetupTab((localStorage.getItem('setupTab') as 'generate' | 'upload') || 'generate');

                                  // Reload General Content Types
                                  setGeneralContentTypes(safeParseJSON('generalContentTypes', ['characters']));
  }, []);

  const handleStartFromSetup = useCallback(async (length: SnippetLength | null, level: SnippetLevel | null, customCode?: string | null, mode?: PracticeMode, newContentTypes?: ContentType[]) => {
    if (customCode) {
                                    startCustomSession(customCode, mode);
                                  closeSetupModal();
    } else {
      // Update state if provided
      if (length) setSnippetLength(length);
                                  if (level) setSnippetLevel(level);
                                  if (mode) setPracticeMode(mode);
                                  // Ensure we update the state with the latest selection for persistence
                                  if (newContentTypes) setGeneralContentTypes(newContentTypes);

                                  const success = await fetchNewSnippet({
                                    length: length || snippetLength,
                                  level: level || snippetLevel,
                                  mode: mode || practiceMode,
                                  // Pass explicitly, falling back to state
                                  contentTypes: newContentTypes || generalContentTypes
      });
                                  if (success) {
                                    closeSetupModal();
      }
    }
  }, [closeSetupModal, startCustomSession, fetchNewSnippet, snippetLength, snippetLevel, practiceMode, generalContentTypes]);

  const handleNextSnippet = useCallback(() => {
    if (practiceQueue.length > 0 && currentQueueIndex < practiceQueue.length - 1) {
                                    loadNextSnippetInQueue();
    } else {
                                    fetchNewSnippet();
    }
  }, [practiceQueue, currentQueueIndex, loadNextSnippetInQueue, fetchNewSnippet]);

  const handlePracticeSame = useCallback(() => {
                                    setSessionResetKey(prev => prev + 1);
  }, []);

  const handleSetupNew = useCallback(() => {
                                    openSetupModal();
    setSessionResetKey(prev => prev + 1);
  }, [openSetupModal]);

  const deletePracticeSession = useCallback((timestamp: number) => {
                                    setPracticeHistory(prev => {
                                      const sessionToDelete = prev.find(s => s.timestamp === timestamp);
                                      if (sessionToDelete) {
                                        const sessionDate = new Date(sessionToDelete.timestamp).toDateString();
                                        const todayDate = new Date().toDateString();
                                        if (sessionDate === todayDate) {
                                          setDailyPracticeTime(prevTime => Math.max(0, prevTime - sessionToDelete.duration));
                                          const currentDailyTime = Number(localStorage.getItem('dailyPracticeTime') || '0');
                                          localStorage.setItem('dailyPracticeTime', String(Math.max(0, currentDailyTime - sessionToDelete.duration)));
                                        }
                                      }
                                      return prev.filter(s => s.timestamp !== timestamp);
                                    });
  }, []);

  const clearPracticeHistory = useCallback(() => {
                                    setPracticeHistory([]);
                                  setDailyPracticeTime(0);
                                  localStorage.setItem('dailyPracticeTime', '0');
                                  setKeyErrorStats({ });
                                  setKeyAttemptStats({ });
                                  localStorage.removeItem('keyErrorStats');
                                  localStorage.removeItem('keyAttemptStats');
  }, []);

                                  const value: AppContextType = {
                                    theme, toggleTheme,
                                    selectedLanguage, setSelectedLanguage,
                                    snippet, isLoadingSnippet, snippetError, fetchNewSnippet, startCustomSession, startTargetedSession, startErrorPracticeSession,
                                    isCustomSession, isMultiFileSession: practiceQueue.length > 0,
                                  snippetLength, setSnippetLength,
                                  snippetLevel, setSnippetLevel,
                                  blockOnErrorThreshold, setBlockOnErrorThreshold,
                                  fontSize, increaseFontSize, decreaseFontSize,
                                  showKeyboard, toggleKeyboard,
                                  showHandGuide, toggleHandGuide,
                                  page, navigateTo, getPreviousPage,
                                  isSetupModalOpen, openSetupModal, closeSetupModal,
                                  isInitialSetupComplete,
                                  setupTab, setSetupTab,
                                  practiceHistory, addPracticeResult,
                                  keyErrorStats, keyAttemptStats,
                                  wpmGoal, accuracyGoal, timeGoal, dailyPracticeTime, setGoals,
                                  isAccessKeyMenuVisible, showAccessKeyMenu, hideAccessKeyMenu,
                                  currentTargetedKeys, setCurrentTargetedKeys,
                                  lastPracticeAction, setLastPracticeAction,
                                  setRequestFocusOnCodeCallback, requestFocusOnCode,
                                  practiceQueue, currentQueueIndex, startMultiFileSession, loadNextSnippetInQueue,
                                  alertMessage, showAlert,
                                  reloadDataFromStorage,

                                  practiceMode, setPracticeMode,
                                  generalContentTypes, setGeneralContentTypes,
                                  sessionResetKey,
                                  handleStartFromSetup, handleNextSnippet, handlePracticeSame, handleSetupNew,
                                  deletePracticeSession, clearPracticeHistory,
  };

                                  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};