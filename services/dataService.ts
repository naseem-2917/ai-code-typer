import { PracticeStats } from "../types";

/**
 * Recalculates aggregate statistics from a given practice history.
 * @param history The complete practice history array.
 * @returns An object containing the recalculated keyErrorStats and keyAttemptStats.
 */
export const recalculateDerivedStats = (history: PracticeStats[]): { keyErrorStats: Record<string, number>, keyAttemptStats: Record<string, number> } => {
  const newKeyErrorStats: Record<string, number> = {};
  const newKeyAttemptStats: Record<string, number> = {};

  for (const session of history) {
    if (session.errorMap) {
      for (const [key, count] of Object.entries(session.errorMap)) {
        newKeyErrorStats[key] = (newKeyErrorStats[key] || 0) + count;
      }
    }
    if (session.attemptMap) {
      for (const [key, count] of Object.entries(session.attemptMap)) {
        newKeyAttemptStats[key] = (newKeyAttemptStats[key] || 0) + count;
      }
    }
  }
  return { keyErrorStats: newKeyErrorStats, keyAttemptStats: newKeyAttemptStats };
};

/**
 * Updates and returns the total practice time for the current day.
 * Resets the timer if the day has changed.
 * @param sessionDuration The duration of the just-completed session in seconds.
 * @returns The total practice duration for today in seconds.
 */
export const updateDailyPracticeTime = (sessionDuration: number): number => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const storedDate = localStorage.getItem('dailyPracticeDate');
  let dailyTime = Number(localStorage.getItem('dailyPracticeTime') || '0');

  if (storedDate !== today) {
    // It's a new day, reset the time and set the new date
    dailyTime = 0;
    localStorage.setItem('dailyPracticeDate', today);
  }

  dailyTime += sessionDuration;
  localStorage.setItem('dailyPracticeTime', String(dailyTime));

  return dailyTime;
};

/**
 * Compiles all user-related data from localStorage into a single JSON object
 * and initiates a download for the user.
 */
export const exportAllData = () => {
  // 1. Identify all keys used by the application in localStorage.
  const allKeys = [
    'theme',
    'selectedLanguage',
    'practiceHistory',
    'keyErrorStats',
    'keyAttemptStats',
    'wpmGoal',
    'accuracyGoal',
    'setupTab',
    'timeGoal',
    'dailyPracticeDate',
    'dailyPracticeTime',
    'generalContentTypes',
  ];

  // 2. Collect all data into a single object.
  const dataToExport: Record<string, any> = {};

  allKeys.forEach(key => {
    const rawData = localStorage.getItem(key);
    if (rawData !== null) {
      try {
        // Attempt to parse JSON strings, otherwise store as-is.
        dataToExport[key] = JSON.parse(rawData);
      } catch (e) {
        dataToExport[key] = rawData;
      }
    }
  });

  // 3. Stringify the compiled data object.
  const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty-print the JSON

  // 4. Create a Blob from the JSON string.
  const blob = new Blob([jsonString], { type: 'application/json' });

  // 5. Generate a filename with the current date and time.
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const dateTimeString = `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  const filename = `ai-code-typer-backup-${dateTimeString}.json`;

  // 6. Create a temporary link element to trigger the download.
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;

  // 7. Trigger the download and clean up.
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};


/**
 * Parses a JSON string and writes the data to localStorage, with options for merging or replacing history.
 * @param jsonString The JSON string from the backup file.
 * @param mode Determines how to handle existing practice history.
 * @throws An error if the JSON is invalid or the data format is incorrect.
 */
export const importData = (jsonString: string, mode: 'merge' | 'replace'): void => {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON file. Could not parse data.');
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Invalid backup file format: not a JSON object.');
  }

  // A simple check to see if it's likely our backup file.
  const knownKeys = ['theme', 'selectedLanguage', 'practiceHistory', 'keyErrorStats', 'wpmGoal'];
  const isLikelyBackup = knownKeys.some(key => key in data);

  if (!isLikelyBackup) {
    throw new Error('File does not appear to be a valid AI Code Typer backup.');
  }

  // 1. Overwrite all settings and non-history data first.
  Object.keys(data).forEach(key => {
    if (key !== 'practiceHistory' && key !== 'keyErrorStats' && key !== 'keyAttemptStats') {
      const value = data[key];
      const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, valueToStore);
    }
  });

  // 2. Handle practice history based on the selected mode.
  let finalHistory: PracticeStats[] = [];
  const importedHistory: PracticeStats[] = Array.isArray(data.practiceHistory) ? data.practiceHistory : [];

  if (mode === 'merge') {
    const existingHistoryRaw = localStorage.getItem('practiceHistory');
    const existingHistory: PracticeStats[] = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];

    // De-duplicate based on timestamp to avoid adding the same session twice.
    const existingTimestamps = new Set(existingHistory.map(s => s.timestamp));
    const uniqueImportedSessions = importedHistory.filter(s => !existingTimestamps.has(s.timestamp));

    finalHistory = [...existingHistory, ...uniqueImportedSessions];
    finalHistory.sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically
  } else { // 'replace' mode
    finalHistory = importedHistory;
  }

  // 3. Recalculate derived stats from the final, authoritative history.
  let { keyErrorStats, keyAttemptStats } = recalculateDerivedStats(finalHistory);

  // Fallback: If recalculation yields no data (e.g., because history items are missing maps due to a past bug),
  // but the imported data HAS stats, use the imported stats to prevent data loss.
  if (Object.keys(keyErrorStats).length === 0 && data.keyErrorStats && Object.keys(data.keyErrorStats).length > 0) {
    if (mode === 'replace') {
      keyErrorStats = data.keyErrorStats;
    }
  }

  if (Object.keys(keyAttemptStats).length === 0 && data.keyAttemptStats && Object.keys(data.keyAttemptStats).length > 0) {
    if (mode === 'replace') {
      keyAttemptStats = data.keyAttemptStats;
    }
  }

  // 4. Save the final history and recalculated stats to localStorage.
  localStorage.setItem('practiceHistory', JSON.stringify(finalHistory));
  localStorage.setItem('keyErrorStats', JSON.stringify(keyErrorStats));
  localStorage.setItem('keyAttemptStats', JSON.stringify(keyAttemptStats));
};