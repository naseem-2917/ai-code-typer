import React, { useContext } from 'react';
import { Page } from '../../types';
import { AppContext } from '../../context/AppContext';

interface BottomNavProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AppContext not found");

    const handleNavigate = (page: Page) => {
        // If navigating to practice page without a snippet, open setup modal first
        if (page === 'practice' && !context.snippet) {
            context.openSetupModal();
            return;
        }
        onNavigate(page);
    };

    const navItems = [
        {
            page: 'home' as Page,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            label: 'Home',
        },
        {
            page: 'practice' as Page,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            label: 'Practice',
        },
        {
            page: 'dashboard' as Page,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            label: 'Dashboard',
        },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-slate-200/50 dark:border-slate-700/50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => (
                    <button
                        key={item.page}
                        onClick={() => handleNavigate(item.page)}
                        className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-lg group ${currentPage === item.page ? '' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                            }`}
                    >
                        <div className={`transition-all duration-200 ${currentPage === item.page ? 'scale-110' : 'group-hover:scale-105'} ${currentPage === item.page
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-slate-600 dark:text-slate-400'
                            }`}>
                            {item.icon}
                        </div>
                        <span className={`text-xs mt-1 font-medium transition-colors ${currentPage === item.page
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-semibold'
                            : 'text-slate-600 dark:text-slate-400'
                            }`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>
        </nav>
    );
};
