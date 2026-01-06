import React from 'react';
import ReactDOM from 'react-dom';

interface MobileActionMenuItem {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    shortcut?: string;
}

interface MobileActionMenuProps {
    isOpen: boolean;
    onClose: () => void;
    items: MobileActionMenuItem[];
    title?: string;
}

export const MobileActionMenu: React.FC<MobileActionMenuProps> = ({
    isOpen,
    onClose,
    items,
    title = "Actions"
}) => {
    if (!isOpen) return null;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return null;

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
                <div className="glass-card rounded-t-2xl mx-2 mb-2 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {items.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    item.onClick();
                                    onClose();
                                }}
                                disabled={item.disabled}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                    text-left transition-all duration-150
                                    ${item.disabled
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-primary-50 dark:hover:bg-primary-900/30 active:scale-[0.98]'
                                    }
                                `}
                            >
                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400">
                                    {item.icon}
                                </span>
                                <span className="flex-1 font-medium text-slate-700 dark:text-slate-300">
                                    {item.label}
                                </span>
                                {item.shortcut && (
                                    <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                        {item.shortcut}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>,
        modalRoot
    );
};

export default MobileActionMenu;
