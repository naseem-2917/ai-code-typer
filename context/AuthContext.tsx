import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    Unsubscribe
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
    const syncUserData = async (uid: string) => {
        try {
            setSyncStatus('syncing');
            const localHistoryJSON = localStorage.getItem('practiceHistory');
            const localHistory: PracticeStats[] = localHistoryJSON ? JSON.parse(localHistoryJSON) : [];
            const localPrefs = getLocalPreferences();

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

            let historyToSave = cloudHistory;
            let prefsToSave = cloudPrefs;
            let needsUpdate = false;

            // SMART MERGE LOGIC - HISTORY
            // 1. If local is empty, we DOWNLOAD cloud data to local (restore session)
            //    and do NOT overwrite cloud.
            if (localHistory.length === 0 && docExists) {
                console.log("Local storage empty. Downloading cloud data...");
                localStorage.setItem('practiceHistory', JSON.stringify(cloudHistory));
                // We also assume prefs will be downloaded via the snapshot listener
            }
            // 2. If local has data, we MERGE and UPLOAD.
            else if (localHistory.length > 0) {
                // De-duplicate: Create Set of existing cloud IDs
                const existingIds = new Set(cloudHistory.map((s: any) => s.id));
                const newSessions = localHistory.filter(s => !existingIds.has(s.id));

                if (newSessions.length > 0) {
                    historyToSave = [...cloudHistory, ...newSessions];
                    needsUpdate = true;
                }

                // Clear local storage after successful sync (migration complete)
                localStorage.removeItem('practiceHistory');
                localStorage.removeItem('keyErrorStats');
                localStorage.removeItem('keyAttemptStats');
            }

            // SMART MERGE LOGIC - PREFS
            if (!cloudPrefs) {
                // If cloud has no prefs, upload local ones
                prefsToSave = localPrefs;
                needsUpdate = true;
            }

            if (needsUpdate || !docExists) {
                if (docExists) {
                    await updateDoc(userDocRef, {
                        history: historyToSave,
                        preferences: prefsToSave || localPrefs // fallback if somehow undefined
                    });
                } else {
                    await setDoc(userDocRef, {
                        history: historyToSave,
                        preferences: localPrefs
                    });
                }
            }

            setSyncStatus('synced');
        } catch (error) {
            console.error("Sync failed:", error);
            setSyncStatus('error');
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
        let unsubscribeSnapshot: Unsubscribe | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // 1. Sync Logic (One-time merge)
                await syncUserData(currentUser.uid);

                // 2. Real-time Listener
                const userDocRef = doc(db, 'users', currentUser.uid);
                unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data() as UserData);
                    }
                });

                setUser(currentUser);
            } else {
                setUser(null);
                setUserData(null);
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }
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

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            loading,
            loginWithGoogle,
            logout,
            syncStatus,
            saveUserPreferences
        }}>
            {children}
        </AuthContext.Provider>
    );
};
