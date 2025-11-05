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

  // 5. Generate a filename with the current date.
  const date = new Date();
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const filename = `ai-code-typer-backup-${dateString}.json`;

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
 * Parses a JSON string and writes the data to localStorage.
 * @param jsonString The JSON string from the backup file.
 * @throws An error if the JSON is invalid or the data format is incorrect.
 */
export const importData = (jsonString: string): void => {
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

  Object.keys(data).forEach(key => {
    const value = data[key];
    // localStorage only stores strings. Objects/arrays must be stringified.
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, valueToStore);
  });
};
