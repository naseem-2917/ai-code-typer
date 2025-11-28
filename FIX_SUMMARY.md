# Bug Fixes and Improvements

## 1. Stale Code & Upload Failure Fix
- **Component**: `components/PracticeSetupModal.tsx`
- **Change**: Implemented a mandatory state reset logic in `handleStartGenerate` and `handleCustomCodeSubmit`.
- **Mechanism**: 
    - Before initiating a new session, we explicitly set the `lastPracticeAction` and other relevant state.
    - The `onStart` callback triggers the context methods (`fetchNewSnippet` or `startCustomSession`).
    - These context methods increment the `sessionResetKey`.
    - The `PracticePage` component in `App.tsx` uses `key={sessionResetKey}`, forcing a complete remount of the component.
    - This ensures that all local state (typed text, timer, errors) is wiped clean, preventing stale data from appearing.

## 2. Browser Caching Fix
- **File**: `vite.config.ts`
- **Change**: Added `build.rollupOptions` configuration.
- **Mechanism**:
    - Configured `entryFileNames`, `chunkFileNames`, and `assetFileNames` to include `[hash]`.
    - This ensures that every build generates files with unique names (e.g., `index-d4e5f6.js`).
    - Browsers will treat these as new files and fetch them from the server, bypassing the cache for older versions.

## 3. General Typing Mode Fixes (Previous)
- **File**: `services/geminiService.ts`
- **Change**: Updated prompt logic to strictly enforce content types (Numbers/Symbols) and added `systemInstruction` for natural line breaks.

## Verification
- **Localhost**: The application should now correctly reset state on every new session start (Generate or Upload).
- **Deployment**: The next deployment will use hashed filenames, resolving the "white screen" or "stale app" issues caused by browser caching.
