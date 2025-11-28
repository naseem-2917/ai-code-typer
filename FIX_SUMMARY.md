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

## 4. Deployment Failure Fixes
- **File**: `package.json` & `vite.config.ts`
- **Problem**: 
    - `package.json` contained invalid/non-existent versions of Vite (`^7.1.12`) and React (`^19.2.0`), and duplicate entries.
    - `vite.config.ts` contained markdown syntax errors.
    - `@google/genai` version instability.
- **Fix**:
    - Cleaned up `package.json` to use stable, compatible versions (Vite 5.x, React 18.x).
    - Reverted `@google/genai` to `^0.1.3` per user request.
    - Removed markdown code blocks from `vite.config.ts`.
    - Verified `.github/workflows/deploy.yml` correctly uses `npm run build`.

## Verification
- **Localhost**: The application should now correctly reset state on every new session start.
- **Deployment**: The next deployment will succeed (dependencies fixed) and use hashed filenames (caching fixed).
