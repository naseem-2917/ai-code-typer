import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { WarningIcon } from '../icons/WarningIcon';
import { CheckIcon } from '../icons/CheckIcon';

export const Alert: React.FC = () => {
    const context = useContext(AppContext);
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

    return (
        <div
            className="fixed top-24 inset-x-0 z-[10000] flex justify-center pointer-events-none"
            role="alert"
        >
            {alertMessage && (
                <div
                    className={`pointer-events-auto px-4 py-3 rounded-md shadow-lg flex items-center gap-2 animate-fade-in-up ${colors[alertMessage.type]}`}
                >
                    {icons[alertMessage.type]}
                    <span className="font-semibold">{alertMessage.message}</span>
                </div>
            )}
        </div>
    );
};
