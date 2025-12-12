import React, { createContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Language, SnippetLength, SnippetLevel, FontSize, Page, PracticeStats, PracticeQueueItem, SavedContextState, PracticeMode, ContentType } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { generateCodeSnippet, generateTargetedCodeSnippet, generateGeneralSnippet, generateErrorPracticeSnippet } from '../services/geminiService';
import { updateDailyPracticeTime, recalculateDerivedStats } from '../services/dataService';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const CUSTOM_LANGUAGE: Language = { id: 'custom', name: 'Custom', prismAlias: 'clike' };
const FONT_SIZES: FontSize[] = ['sm', 'md', 'lg', 'xl'];


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

function safeParseJSON<T>(key: string, fallback: T): T {
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
  fetchNewSnippet: (options?: { length?: SnippetLength, level?: SnippetLevel, mode?: PracticeMode, contentTypes?: ContentType[] }) => Promise<boolean>;
  startCustomSession: (code: string, mode?: PracticeMode) => void;
  startTargetedSession: (keys: string[], options: { length: SnippetLength, level: SnippetLevel }) => void;
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
  alertMessage: { message: string; type: 'warning' | 'info' | 'error' } | null;
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



export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, syncStatus, userData, loading } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme as 'light' | 'dark';
    // User Request: Default to Light mode for new users
    return 'light';
  });

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(() => {
    const savedLangId = localStorage.getItem('selectedLanguage');
    // User Request: Default to Python
    return SUPPORTED_LANGUAGES.find(l => l.id === (savedLangId || 'python')) || SUPPORTED_LANGUAGES[0];
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
    safeParseJSON('keyErrorStats', {})
  );

  const [keyAttemptStats, setKeyAttemptStats] = useState<Record<string, number>>(() =>
    safeParseJSON('keyAttemptStats', {})
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

  const showAlert = useCallback((message: string, type: 'warning' | 'info' | 'error', duration: number = 4000) => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    setAlertMessage({ message, type });
    alertTimeoutRef.current = window.setTimeout(() => {
      setAlertMessage(null);
    }, duration);
  }, []);

  const isInitialSetupComplete = !!snippet;

  // -------------------------------------------------------------------------
  // WRAPPER SETTERS (Event-Driven Updates)
  // Instead of useEffects, we trigger saves directly when the user changes a setting.
  // -------------------------------------------------------------------------

  const updateTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };
  const toggleTheme = () => updateTheme(theme === 'light' ? 'dark' : 'light');

  const updateSelectedLanguage = (lang: Language) => {
    setSelectedLanguage(lang);
    localStorage.setItem('selectedLanguage', lang.id);
  };

  const updateSnippetLength = (length: SnippetLength) => {
    setSnippetLength(length);
    localStorage.setItem('snippetLength', length);
  };

  const updateSnippetLevel = (level: SnippetLevel) => {
    setSnippetLevel(level);
    localStorage.setItem('snippetLevel', level);
  };

  const updateBlockOnErrorThreshold = (val: number) => {
    setBlockOnErrorThreshold(val);
    localStorage.setItem('blockOnErrorThreshold', String(val));
  };

  const updateFontSize = (newSize: FontSize) => {
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
  }

  const increaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex < FONT_SIZES.length - 1) {
      updateFontSize(FONT_SIZES[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    if (currentIndex > 0) {
      updateFontSize(FONT_SIZES[currentIndex - 1]);
    }
  };

  const updateShowKeyboard = (show: boolean) => {
    setShowKeyboard(show);
    localStorage.setItem('showKeyboard', String(show));
  }
  const toggleKeyboard = () => updateShowKeyboard(!showKeyboard);

  const updateShowHandGuide = (show: boolean) => {
    setShowHandGuide(show);
    localStorage.setItem('showHandGuide', String(show));
  }
  const toggleHandGuide = () => updateShowHandGuide(!showHandGuide);


  const updateSetupTab = (tab: 'generate' | 'upload') => {
    setSetupTab(tab);
    localStorage.setItem('setupTab', tab);
  }

  const updatePracticeMode = (mode: PracticeMode) => {
    setPracticeMode(mode);
    localStorage.setItem('practiceMode', mode);
  }

  const updateGeneralContentTypes = (types: ContentType[]) => {
    setGeneralContentTypes(types);
    localStorage.setItem('generalContentTypes', JSON.stringify(types));
  }

  // NOTE: setGoals is already a wrapper, just needs to be updated.
  const setGoals = (wpm: number, accuracy: number, time: number) => {
    setWpmGoal(wpm);
    setAccuracyGoal(accuracy);
    setTimeGoal(time);
    localStorage.setItem('wpmGoal', String(wpm));
    localStorage.setItem('accuracyGoal', String(accuracy));
    localStorage.setItem('timeGoal', String(time));
  };

  // -------------------------------------------------------------------------
  // HYDRATION: When sync completes, if AuthContext downloaded data to localStorage, pick it up.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (syncStatus === 'synced') {
      const localHistoryJSON = localStorage.getItem('practiceHistory');
      if (localHistoryJSON) {
        console.log("Sync complete. Hydrating from local storage.");
        try {
          const hydratedHistory = JSON.parse(localHistoryJSON);
          if (Array.isArray(hydratedHistory) && hydratedHistory.length > 0) {
            setPracticeHistory(hydratedHistory);
            // Recalculate stats
            const { keyErrorStats, keyAttemptStats } = recalculateDerivedStats(hydratedHistory);
            setKeyErrorStats(keyErrorStats);
            setKeyAttemptStats(keyAttemptStats);
          }
        } catch (e) {
          console.error("Failed to hydrate", e);
        }
      }
    }
  }, [syncStatus]);

  // Real-time Update from AuthContext (Cloud -> Local)
  useEffect(() => {
    if (userData) {
      // 1. Update History
      if (userData.history) {
        setPracticeHistory(userData.history);
        const { keyErrorStats, keyAttemptStats } = recalculateDerivedStats(userData.history);
        setKeyErrorStats(keyErrorStats);
        setKeyAttemptStats(keyAttemptStats);
      }
      setIsDataLoaded(true);
    } else if (!user) {
      setIsDataLoaded(true);
    }
  }, [userData, user]);



  const [isDataLoaded, setIsDataLoaded] = useState(false);




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
    const handleBlur = () => {
      setIsAccessKeyMenuVisible(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);


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

  const clearPracticeQueue = () => {
    setPracticeQueue([]);
    setCurrentQueueIndex(-1);
  };

  const fetchNewSnippet = useCallback(async (options?: { length?: SnippetLength, level?: SnippetLevel, mode?: PracticeMode, contentTypes?: ContentType[] }) => {
    if (isLoadingSnippet) return false;

    const targetMode = options?.mode || practiceMode;
    const targetLength = options?.length || snippetLength;
    const targetLevel = options?.level || snippetLevel;
    const targetContentTypes = options?.contentTypes || generalContentTypes;

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

  const startTargetedSession = useCallback(async (keys: string[], options: { length: SnippetLength, level: SnippetLevel }) => {
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

  const startErrorPracticeSession = useCallback(async () => {
    if (isLoadingSnippet) return;

    // 1. Gather all error keys
    const allErrorKeys = (Object.entries(keyErrorStats) as [string, number][])
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
      // Prepare the stats object for the generator
      const statsForGenerator: Record<string, { errors: number; attempts: number }> = {};

      // We need to combine error stats with attempt stats
      allErrorKeys.forEach(key => {
        const errors = keyErrorStats[key] || 0;
        const attempts = keyAttemptStats[key] || errors; // Fallback to errors if attempts missing
        statsForGenerator[key] = { errors, attempts };
      });

      const newSnippet = await generateErrorPracticeSnippet(statsForGenerator, snippetLength);
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
  }, [keyErrorStats, keyAttemptStats, isLoadingSnippet, showAlert, snippetLength]);

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

    const readFile = (file: File): Promise<PracticeQueueItem & { isValid: boolean }> =>
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





  const saveHistoryToCloud = async (newHistory: PracticeStats[]) => {
    if (user) {
      try {
        console.log("Saving history to cloud...", newHistory.length);
        await setDoc(doc(db, 'users', user.uid), { history: newHistory }, { merge: true });
        console.log("Cloud save successful.");
      } catch (error) {
        console.error("Failed to save history:", error);
        showAlert("Failed to sync with cloud. Please check your connection.", 'error');
      }
    }
  };


  const addPracticeResult = (stats: PracticeStats) => {
    const finalStats = { ...stats };
    if (practiceMode === 'general') {
      finalStats.language = 'General';
    }

    let newHistory: PracticeStats[] = [];

    setPracticeHistory(prev => {
      const existingIndex = prev.findIndex(s => s.id === finalStats.id);
      if (existingIndex >= 0) {
        newHistory = [...prev];
        newHistory[existingIndex] = finalStats;
      } else {
        newHistory = [...prev, finalStats].slice(-100);
      }
      return newHistory;
    });

    // Explicitly Save to Cloud
    saveHistoryToCloud(newHistory);

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


  const showAccessKeyMenu = () => setIsAccessKeyMenuVisible(true);
  const hideAccessKeyMenu = () => setIsAccessKeyMenuVisible(false);

  const reloadDataFromStorage = useCallback(() => {
    const savedTheme = localStorage.getItem('theme');
    setTheme(savedTheme ? (savedTheme as 'light' | 'dark') : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const savedLangId = localStorage.getItem('selectedLanguage');
    setSelectedLanguage(SUPPORTED_LANGUAGES.find(l => l.id === savedLangId) || SUPPORTED_LANGUAGES[0]);

    setPracticeHistory(safeParseJSON('practiceHistory', []));
    setKeyErrorStats(safeParseJSON('keyErrorStats', {}));
    setKeyAttemptStats(safeParseJSON('keyAttemptStats', {}));

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
      navigateTo('practice');
    } else {
      // Update state if provided
      if (length) setSnippetLength(length);
      if (level) setSnippetLevel(level);
      if (mode) setPracticeMode(mode);
      // Ensure we update the state with the latest selection for persistence
      if (newContentTypes) setGeneralContentTypes(newContentTypes);

      closeSetupModal();
      navigateTo('practice');

      await fetchNewSnippet({
        length: length || snippetLength,
        level: level || snippetLevel,
        mode: mode || practiceMode,
        // Pass explicitly, falling back to state
        contentTypes: newContentTypes || generalContentTypes
      });
    }
  }, [closeSetupModal, startCustomSession, fetchNewSnippet, snippetLength, snippetLevel, practiceMode, generalContentTypes, navigateTo]);

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
    // 1. Calculate new history synchronously based on current state
    const sessionToDelete = practiceHistory.find(s => s.timestamp === timestamp);
    if (!sessionToDelete) return;

    const newHistory = practiceHistory.filter(s => s.timestamp !== timestamp);

    // 2. Update Local State
    setPracticeHistory(newHistory);

    // 3. Update Daily Stats
    const sessionDate = new Date(sessionToDelete.timestamp).toDateString();
    const todayDate = new Date().toDateString();
    if (sessionDate === todayDate) {
      setDailyPracticeTime(prevTime => Math.max(0, prevTime - sessionToDelete.duration));
      const currentDailyTime = Number(localStorage.getItem('dailyPracticeTime') || '0');
      localStorage.setItem('dailyPracticeTime', String(Math.max(0, currentDailyTime - sessionToDelete.duration)));
    }

    // 4. Update Cloud
    saveHistoryToCloud(newHistory);

  }, [practiceHistory, user]);

  const clearPracticeHistory = useCallback(async () => {
    // 1. Reset State to Defaults
    setPracticeHistory([]);
    setDailyPracticeTime(0);
    setKeyErrorStats({});
    setKeyAttemptStats({});

    // Preferences Reset
    setTheme('light'); // User Request: Default to Light
    setSelectedLanguage(SUPPORTED_LANGUAGES.find(l => l.id === 'python') || SUPPORTED_LANGUAGES[0]);
    setPracticeMode('code');
    setGeneralContentTypes(['characters']);
    setSnippetLength('medium');
    setSnippetLevel('medium');
    setBlockOnErrorThreshold(2);
    setFontSize('medium');
    setWpmGoal(20);
    setAccuracyGoal(95);
    setTimeGoal(15);
    // Note: We don't reset showKeyboard/HandGuide usually as they are device dependent,
    // but user asked for "all cache", so let's reset to defaults.
    setShowKeyboard(window.innerWidth >= 768);
    setShowHandGuide(true);


    // 2. Clear Local Storage "Cache" (Comprehensive)
    const keysToRemove = [
      'practiceHistory', 'keyErrorStats', 'keyAttemptStats', 'dailyPracticeTime', 'dailyPracticeDate',
      'theme', 'selectedLanguage', 'generalContentTypes', 'snippetLength', 'snippetLevel',
      'blockOnErrorThreshold', 'fontSize', 'wpmGoal', 'accuracyGoal', 'timeGoal',
      'setupTab', 'sessionResultToShow', 'continuedSession', 'showKeyboard'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 3. Clear Cloud Data (Hard Wipe)
    if (user) {
      try {
        console.log("Wiping cloud data...");
        // Overwrite document with empty history and default preferences
        await setDoc(doc(db, 'users', user.uid), {
          history: [],
          preferences: {
            theme: 'dark',
            languageId: SUPPORTED_LANGUAGES[0].id,
            // Add other defaults if strictly needed for sync logic, otherwise empty implies defaults
          }
        });
        console.log("Cloud wipe successful.");
        showAlert("All history and preferences cleared from device and cloud.", 'info');
      } catch (error) {
        console.error("Failed to wipe cloud data:", error);
        showAlert("Failed to clear cloud data. Please check connection.", 'error');
      }
    } else {
      showAlert("All local history and preferences cleared.", 'info');
    }
  }, [user, showAlert]);



  const value: AppContextType = {
    theme, toggleTheme,
    selectedLanguage, setSelectedLanguage: updateSelectedLanguage,
    snippet, isLoadingSnippet, snippetError, fetchNewSnippet, startCustomSession, startTargetedSession, startErrorPracticeSession,
    isCustomSession, isMultiFileSession: practiceQueue.length > 0,
    snippetLength, setSnippetLength: updateSnippetLength,
    snippetLevel, setSnippetLevel: updateSnippetLevel,
    blockOnErrorThreshold, setBlockOnErrorThreshold: updateBlockOnErrorThreshold,
    fontSize, increaseFontSize, decreaseFontSize,
    showKeyboard, toggleKeyboard,
    showHandGuide, toggleHandGuide,
    page, navigateTo, getPreviousPage,
    isSetupModalOpen, openSetupModal, closeSetupModal,
    isInitialSetupComplete,
    setupTab, setSetupTab: updateSetupTab,
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

    practiceMode, setPracticeMode: updatePracticeMode,
    generalContentTypes, setGeneralContentTypes: updateGeneralContentTypes,
    sessionResetKey,
    handleStartFromSetup, handleNextSnippet, handlePracticeSame, handleSetupNew,
    deletePracticeSession, clearPracticeHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};