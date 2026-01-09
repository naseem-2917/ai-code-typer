import React, { useState } from 'react';
import { soundManager } from '../utils/soundManager';

/**
 * Settings Component
 * 
 * Modern UI with toggle switches and styled controls
 */
export const Settings: React.FC = () => {
    const [settings, setSettings] = useState(soundManager.getSettings());

    const updateSetting = (category: string, key: string, value: any) => {
        const newSettings = {
            ...settings,
            [category]: {
                ...settings[category as keyof typeof settings],
                [key]: value
            }
        };

        soundManager.updateSettings(newSettings);
        setSettings(soundManager.getSettings());
    };

    // Custom Toggle Switch Component
    const ToggleSwitch: React.FC<{
        checked: boolean;
        onChange: (checked: boolean) => void;
        label: string;
        icon?: React.ReactNode;
    }> = ({ checked, onChange, label, icon }) => (
        <label className="flex items-center justify-between py-3 cursor-pointer group">
            <div className="flex items-center gap-3">
                {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
                <span className="text-slate-700 dark:text-slate-200 font-medium">{label}</span>
            </div>
            <div
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked
                        ? 'bg-primary-500'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                onClick={() => onChange(!checked)}
            >
                <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </div>
        </label>
    );

    return (
        <div className="space-y-6">
            {/* Sound Settings */}
            <section className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Sound Effects
                    </h3>
                </div>

                <div className="space-y-1 divide-y divide-slate-200 dark:divide-slate-700">
                    <ToggleSwitch
                        checked={settings.sound.typingSoundEnabled}
                        onChange={(checked) => updateSetting('sound', 'typingSoundEnabled', checked)}
                        label="Typing Sounds"
                        icon={<span>⌨️</span>}
                    />
                    <ToggleSwitch
                        checked={settings.sound.errorSoundEnabled}
                        onChange={(checked) => updateSetting('sound', 'errorSoundEnabled', checked)}
                        label="Error Sounds"
                        icon={<span>🔴</span>}
                    />
                    <ToggleSwitch
                        checked={settings.sound.successSoundEnabled}
                        onChange={(checked) => updateSetting('sound', 'successSoundEnabled', checked)}
                        label="Success Sounds"
                        icon={<span>✨</span>}
                    />
                </div>

                {/* Volume Slider */}
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Volume
                        </label>
                        <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                            {Math.round(settings.sound.volume * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.sound.volume * 100}
                        onChange={(e) => updateSetting('sound', 'volume', Number(e.target.value) / 100)}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                </div>

                {/* Keyboard Style */}
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="block mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                        Keyboard Style
                    </label>
                    <select
                        value={settings.sound.keyboardStyle}
                        onChange={(e) => updateSetting('sound', 'keyboardStyle', e.target.value)}
                        className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                        <option value="clicky">🔵 Clicky (Cherry MX Blue)</option>
                        <option value="tactile">🟤 Tactile (Cherry MX Brown)</option>
                        <option value="thock">⚫ Thock (Topre)</option>
                    </select>
                </div>
            </section>

            {/* Info Section */}
            <section className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-xl p-5">
                <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Pro Tip</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Different keyboard sounds can help you develop muscle memory. Try "Thock" for a satisfying deep sound!
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};
