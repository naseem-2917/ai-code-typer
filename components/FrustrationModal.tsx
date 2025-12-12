import React, { useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { ResetIcon } from './icons/ResetIcon';
import { WarningIcon } from './icons/WarningIcon';

interface FrustrationModalProps {
    isOpen: boolean;
    onRestart: () => void;
}

export const FrustrationModal: React.FC<FrustrationModalProps> = ({ isOpen, onRestart }) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure DOM is ready and animation started
            // This guarantees the focus grab wins over any other focus events
            const timer = setTimeout(() => {
                buttonRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700 transform scale-100 animate-fade-in-up">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <WarningIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Whoa, slow down!
                </h2>

                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                    We detected a lot of errors in a row.
                    <br />
                    Please focus on your <strong>accuracy</strong> and try again.
                </p>

                <div className="flex justify-center">
                    <Button
                        ref={buttonRef}
                        onClick={onRestart}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.stopPropagation();
                                e.preventDefault();
                                onRestart();
                            }
                        }}
                        variant="primary"
                        size="lg"
                        className="w-full sm:w-auto min-w-[160px]"
                    >
                        <ResetIcon className="w-5 h-5 mr-2" />
                        Restart Snippet
                    </Button>
                </div>
            </div>
        </div>
    );
};
