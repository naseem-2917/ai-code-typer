import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const SkeletonLoader: React.FC = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const { fontSize } = context;

    const fontSizeClass = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
    }[fontSize];

    const lines = [
        { width: '75%' },
        { width: '90%' },
        { width: '80%' },
        { width: '60%' },
        { width: '95%' },
        { width: '70%' },
        { width: '85%' },
        { width: '50%' },
    ];

    return (
        <div className={`animate-pulse font-mono leading-relaxed tracking-wide ${fontSizeClass}`}>
            {lines.map((line, index) => (
                <div key={index} className="flex mb-1 h-5 sm:h-6">
                    <div className="text-right pr-4 text-transparent bg-slate-300 dark:bg-slate-700 rounded-md select-none flex-shrink-0 w-10 sm:w-12" aria-hidden="true">
                       {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center">
                         <div className="h-full bg-slate-300 dark:bg-slate-700 rounded-md" style={{ width: line.width }}></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SkeletonLoader;
