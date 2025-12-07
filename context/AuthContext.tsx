import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { PracticeStats, UserPreferences, UserData, SnippetLength, SnippetLevel, FontSize, PracticeMode, ContentType } from '../types';

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
    saveUserPreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
    updateUserProfile: (profile: { displayName?: string; photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Helper to scrape local storage for preferences
const getLocalPreferences = (): UserPreferences => {
    // Helper to safely parse
    function safeGet<T>(key: string, def: T): T {
        const item = localStorage.getItem(key);
        if (!item) return def;
        try { return JSON.parse(item); } catch { return def; }
    }

    return {
        theme: localStorage.getItem('theme') as 'light' | 'dark' || 'dark', // Default to valid
        languageId: localStorage.getItem('selectedLanguage') || 'javascript',
        snippetLength: (localStorage.getItem('snippetLength') as SnippetLength) || 'medium', // Note: AppContext doesn't save this to LS explicitly in all versions, but we should start?
        // Actually AppContext uses state for length/level, they might not be in LS.
        // Let's assume defaults if not found.
        snippetLevel: (localStorage.getItem('snippetLevel') as SnippetLevel) || 'medium',
        blockOnErrorThreshold: Number(localStorage.getItem('blockOnErrorThreshold')) || 2,
        // Wait, AppContext doesn't save blockOnErrorThreshold to LS? 
        // Let's check AppContext again. It doesn't seem to save everything to LS.
        // If they are not in LS, we use defaults. 
        fontSize: (localStorage.getItem('fontSize') as FontSize) || 'md',
        showKeyboard: localStorage.getItem('showKeyboard') === 'true', // Need to check if AppContext saves this
        showHandGuide: localStorage.getItem('showHandGuide') !== 'false',
        wpmGoal: Number(localStorage.getItem('wpmGoal')) || 20,
        accuracyGoal: Number(localStorage.getItem('accuracyGoal')) || 95,
        timeGoal: Number(localStorage.getItem('timeGoal')) || 15,
        lastSetupTab: (localStorage.getItem('setupTab') as 'generate' | 'upload') || 'generate',
        lastPracticeMode: (localStorage.getItem('practiceMode') as PracticeMode) || 'code',
        generalContentTypes: safeGet<ContentType[]>('generalContentTypes', ['characters']),
    };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

    // Handle local storage migration on login
    // Algorithm: Fetch Cloud -> Get Local -> Smart Merge -> Save Back
    // Handle local storage migration on login
    // Algorithm: Fetch Cloud -> Get Local -> Smart Merge -> Save Back
    // RETURNS: The final UserData to be used by the app (eliminating need for extra read)
    const syncUserData = async (uid: string): Promise<UserData | null> => {
        try {
            setSyncStatus('syncing');

            // 1. Get Local Defaults (Fallback)
            const localHistoryJSON = localStorage.getItem('practiceHistory');
            const localHistory: PracticeStats[] = localHistoryJSON ? JSON.parse(localHistoryJSON) : [];
            const localPrefs = getLocalPreferences();

            // 2. Get Cloud Data (Primary)
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);

            let cloudHistory: PracticeStats[] = [];
            let cloudPrefs: UserPreferences | undefined = undefined;
            let docExists = false;

            if (userDoc.exists()) {
                const data = userDoc.data() as UserData;
                cloudHistory = data.history || [];
                cloudPrefs = data.preferences;
                docExists = true;
            }

            // --- HISTORY LOGIC (Merge Local + Cloud) ---
            let historyToSave = cloudHistory;
            let needsHistoryUpdate = false;

            if (localHistory.length > 0) {
                // Filter out duplicates
                const existingIds = new Set(cloudHistory.map((s: any) => s.id));
                const newSessions = localHistory.filter(s => !existingIds.has(s.id));

                if (newSessions.length > 0) {
                    historyToSave = [...cloudHistory, ...newSessions];
                    needsHistoryUpdate = true;
                }
                // Cleanup local storage
                localStorage.removeItem('practiceHistory');
                localStorage.removeItem('keyErrorStats');
                localStorage.removeItem('keyAttemptStats');
            }

            // --- PREFERENCES LOGIC (Cloud Priority) ---
            let finalPreferences: UserPreferences;
            let needsPrefsUpdate = false;

            if (cloudPrefs) {
                // Cloud exists: Merge cloud over local defaults (Cloud wins)
                finalPreferences = { ...localPrefs, ...cloudPrefs };
            } else {
                // Cloud empty: Upload local defaults
                finalPreferences = localPrefs;
                needsPrefsUpdate = true;
            }

            // --- SAVE TO FIRESTORE ---
            if (needsHistoryUpdate || needsPrefsUpdate || !docExists) {
                const updates: any = {};

                if (needsHistoryUpdate) updates.history = historyToSave;
                // Only upload preferences if cloud was empty
                if (needsPrefsUpdate) updates.preferences = finalPreferences;

                if (docExists) {
                    if (Object.keys(updates).length > 0) {
                        await updateDoc(userDocRef, updates);
                    }
                } else {
                    await setDoc(userDocRef, {
                        history: historyToSave,
                        preferences: finalPreferences
                    });
                }
            }

            setSyncStatus('synced');

            return {
                history: historyToSave,
                preferences: finalPreferences
            };

        } catch (error) {
            console.error("Sync failed:", error);
            setSyncStatus('error');
            return null;
        }
    };

    const saveUserPreferences = async (newPrefs: Partial<UserPreferences>) => {
        if (!user) {
            console.warn("saveUserPreferences: No user logged in. Aborting save.");
            return;
        }
        console.log("saveUserPreferences: Attempting to save...", newPrefs);

        try {
            // 🛠️ COMBINED FIX: Use Dot Notation for keys + setDoc with merge: true
            const updates: Record<string, any> = {};
            Object.entries(newPrefs).forEach(([key, value]) => {
                updates[`preferences.${key}`] = value;
            });
            // Add timestamp for synchronization handling
            updates['preferences.updatedAt'] = Date.now();

            await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
            console.log("saveUserPreferences: Save SUCCESS.", updates);
        } catch (error) {
            console.error("saveUserPreferences: Failed to save preferences:", error);
        }
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // 1. Sync & Load Logic (Optimized: No separate listener)
                // Use the data returned directly from syncUserData
                const data = await syncUserData(currentUser.uid);
                if (data) {
                    setUserData(data);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
        };
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            // Optional: Clear any in-memory user data needed
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const updateUserProfile = async (profile: { displayName?: string; photoURL?: string }) => {
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, profile);
            setUser({ ...auth.currentUser, ...profile });

            // Also update Firestore to keep it in sync (optional but good practice)
            // We'll just update the top level fields if we decide to add them to UserData later, 
            // but for now this just ensures Auth is current.
        } catch (error) {
            console.error("Failed to update profile", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            loading,
            loginWithGoogle,
            logout,
            syncStatus,
            saveUserPreferences,
            updateUserProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};
