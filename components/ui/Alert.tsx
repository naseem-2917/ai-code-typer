import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppContext } from '../../context/AppContext';
import { WarningIcon } from '../icons/WarningIcon';

export const Alert: React.FC = () => {
    const context = useContext(AppContext);
    // Don't disable rendering just because context is missing immediately, but typically it should be there.
    // However, hooks order matters.

    // Use state to track mount (for standard portal safety nextjs style, though this is vite)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!context) return null;
    const { alertMessage } = context;

    const icons = {
        warning: <WarningIcon className="w-5 h-5" />,
        info: <WarningIcon className="w-5 h-5" />, // Placeholder
        error: <WarningIcon className="w-5 h-5" />, // Placeholder
    };

    const colors = {
        warning: 'bg-yellow-400 text-yellow-900',
        info: 'bg-blue-500 text-white',
        error: 'bg-red-500 text-white',
    };

    if (!mounted || !alertMessage) return null;

    const alertRoot = document.getElementById('alert-root');
    if (!alertRoot) return null;

    return createPortal(
        <div
            className="fixed top-6 inset-x-0 z-[10000] flex justify-center pointer-events-none"
            role="alert"
        >
            <div
                className={`pointer-events-auto px-4 py-3 rounded-md shadow-lg flex items-center gap-2 animate-fade-in-up ${colors[alertMessage.type]}`}
            >
                {icons[alertMessage.type]}
                <span className="font-semibold">{alertMessage.message}</span>
            </div>
        </div>,
        alertRoot
    );
};
