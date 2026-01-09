/**
 * Sound Manager
 * 
 * Manages all app sounds with:
 * - Unified settings (sound/visuals/mobile)
 * - Throttled typing sounds (20ms minimum gap)
 * - AudioContext unlock on first interaction
 * - localStorage persistence
 */

import { AudioGenerator } from './audioGenerator';

interface AppSettings {
    sound: {
        typingSoundEnabled: boolean;
        errorSoundEnabled: boolean;
        successSoundEnabled: boolean;
        volume: number;
        keyboardStyle: 'clicky' | 'tactile' | 'thock';
    };
    visuals: {
        showHandGuide: boolean;
        autoDisableHandGuideAt: number; // Accuracy threshold (default 95)
    };
    mobile: {
        disableHandGuideOnMobile: boolean;
    };
}

class SoundManager {
    private audio: AudioGenerator;
    private settings: AppSettings;
    private lastTypingSoundTime: number = 0;
    private readonly TYPING_THROTTLE_MS = 20; // Prevent audio overload

    constructor() {
        this.audio = new AudioGenerator();
        this.settings = this.loadSettings();
        this.setupAudioUnlock();
    }

    /**
     * Setup one-time AudioContext unlock on first user interaction
     * Required for Chrome/Safari/Edge
     */
    private setupAudioUnlock(): void {
        const unlock = () => {
            this.audio.unlock();
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('pointerdown', unlock); // Mobile Safari fix
        };

        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });
        document.addEventListener('pointerdown', unlock, { once: true });
    }

    /**
     * Load settings from localStorage
     */
    private loadSettings(): AppSettings {
        const saved = localStorage.getItem('appSettings');
        return saved ? JSON.parse(saved) : {
            sound: {
                typingSoundEnabled: true,
                errorSoundEnabled: true,
                successSoundEnabled: true,
                volume: 0.5,
                keyboardStyle: 'tactile'
            },
            visuals: {
                showHandGuide: true,
                autoDisableHandGuideAt: 95
            },
            mobile: {
                disableHandGuideOnMobile: true
            }
        };
    }

    /**
     * Update settings and persist to localStorage
     */
    updateSettings(updates: Partial<AppSettings>): void {
        this.settings = {
            ...this.settings,
            ...updates,
            sound: { ...this.settings.sound, ...updates.sound },
            visuals: { ...this.settings.visuals, ...updates.visuals },
            mobile: { ...this.settings.mobile, ...updates.mobile }
        };
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
    }

    /**
     * Play typing sound (throttled for fast typists)
     */
    playTyping(): void {
        if (!this.settings.sound.typingSoundEnabled) return;

        // Throttle: prevent audio spam for >50 WPM typists
        const now = Date.now();
        if (now - this.lastTypingSoundTime < this.TYPING_THROTTLE_MS) {
            return; // Skip this sound
        }
        this.lastTypingSoundTime = now;

        const { keyboardStyle } = this.settings.sound;
        const volume = this.settings.sound.volume;

        switch (keyboardStyle) {
            case 'clicky':
                this.audio.playClicky(volume);
                break;
            case 'tactile':
                this.audio.playTactile(volume);
                break;
            case 'thock':
                this.audio.playThock(volume);
                break;
        }
    }

    /**
     * Play error sound
     */
    playError(): void {
        if (!this.settings.sound.errorSoundEnabled) return;
        this.audio.playError(this.settings.sound.volume);
    }

    /**
     * Play star unlock sound
     */
    playStar(num: number): void {
        if (!this.settings.sound.successSoundEnabled) return;
        this.audio.playStar(num, this.settings.sound.volume);
    }

    /**
     * Get current settings
     */
    getSettings(): AppSettings {
        return this.settings;
    }

    /**
     * Check if hand guide should show
     * - Respects user setting
     * - Auto-disables for advanced users (>95% accuracy)
     * - Disabled by default on mobile <768px
     */
    shouldShowHandGuide(currentAccuracy?: number): boolean {
        const { showHandGuide, autoDisableHandGuideAt } = this.settings.visuals;

        if (!showHandGuide) return false;

        // Auto-disable if accuracy exceeds threshold
        if (currentAccuracy && currentAccuracy >= autoDisableHandGuideAt) {
            return false;
        }

        // Disable on mobile if setting enabled
        if (this.settings.mobile.disableHandGuideOnMobile && window.innerWidth < 768) {
            return false;
        }

        return true;
    }
}

// Singleton instance
export const soundManager = new SoundManager();
