import React, { useContext, useRef, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../constants';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { KeyboardIcon } from './icons/KeyboardIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { HomeIcon } from './icons/HomeIcon';
import { Select, SelectRef } from './ui/Select';
import { Button } from './ui/Button';
import { FontSize } from '../types';
import { TextSizeIncreaseIcon } from './icons/TextSizeIncreaseIcon';
import { TextSizeDecreaseIcon } from './icons/TextSizeDecreaseIcon';
import { PracticeIcon } from './icons/PracticeIcon';
import { useAccessKey } from '../hooks/useAccessKey';
import { AccessKeyLabel } from './ui/AccessKeyLabel';
import { MenuIcon } from './icons/MenuIcon';
import { XIcon } from './icons/XIcon';

const FONT_SIZES: FontSize[] = ['sm', 'md', 'lg', 'xl'];

const Header: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppContext not found');
  const {
    theme,
    toggleTheme,
    selectedLanguage,
    setSelectedLanguage,
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    showKeyboard,
    toggleKeyboard,
    page,
    navigateTo,
    isAccessKeyMenuVisible,
    requestFocusOnCode,
    isSetupModalOpen
  } = context;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const selectRef = useRef<SelectRef>(null);
  useAccessKey('L', () => selectRef.current?.toggle(), { disabled: isSetupModalOpen });

  const handleSettingChange = (action: () => void) => {
    action();
    if (page === 'practice') {
      requestFocusOnCode();
    }
  };

  const NavButton: React.FC<{
    page: 'home' | 'practice' | 'dashboard';
    label: string;
    icon: React.ReactNode;
    accessKeyChar: string;
    onClick: () => void;
    className?: string;
    showLabelAlways?: boolean;
  }> = ({ page: buttonPage, label, icon, accessKeyChar, onClick, className, showLabelAlways }) => (
    <Button
      onClick={onClick}
      variant={page === buttonPage ? 'primary' : 'ghost'}
      size="sm"
      className={`!py-2 !gap-2 ${className || ''}`}
      accessKeyChar={accessKeyChar}
      disabled={isSetupModalOpen}
    >
      {icon}
      <span className={showLabelAlways ? "inline" : "hidden sm:inline"}>{label}</span>
    </Button>
  );

  const currentSizeIndex = FONT_SIZES.indexOf(fontSize);
  const canDecrease = currentSizeIndex > 0;
  const canIncrease = currentSizeIndex < FONT_SIZES.length - 1;

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </Button>
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
              <span className='hidden lg:inline'>AI Code Typer</span>
              <span className='lg:hidden hidden sm:inline'>ACT</span>
            </h1>
            <nav className="hidden md:flex items-center gap-1 sm:gap-2">
              <NavButton page="home" label="Home" icon={<HomeIcon className="w-5 h-5" />} accessKeyChar="H" onClick={() => navigateTo('home')} />
              <NavButton
                page="practice"
                label="Practice"
                icon={<PracticeIcon className="w-5 h-5" />}
                accessKeyChar="P"
                onClick={() => {
                  if (!context.snippet) {
                    context.openSetupModal();
                  } else {
                    navigateTo('practice');
                  }
                }}
              />
              <NavButton page="dashboard" label="Dashboard" icon={<ChartBarIcon className="w-5 h-5" />} accessKeyChar="D" onClick={() => navigateTo('dashboard')} />
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className='relative w-32 sm:w-40'>
              <Select
                ref={selectRef}
                value={selectedLanguage.id}
                onChange={(value) => {
                  const lang = SUPPORTED_LANGUAGES.find(l => l.id === value);
                  if (lang) {
                    handleSettingChange(() => setSelectedLanguage(lang));
                  }
                }}
                disabled={isSetupModalOpen}
                options={SUPPORTED_LANGUAGES.map(lang => ({ value: lang.id, label: lang.name }))}
              />
              {isAccessKeyMenuVisible && <AccessKeyLabel label="L" />}
            </div>
            {page === 'practice' && (
              <>
                <Button variant="ghost" size="icon" onClick={() => handleSettingChange(decreaseFontSize)} disabled={!canDecrease || isSetupModalOpen} aria-label="Decrease font size" accessKeyChar="-">
                  <TextSizeDecreaseIcon className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleSettingChange(increaseFontSize)} disabled={!canIncrease || isSetupModalOpen} aria-label="Increase font size" accessKeyChar="=">
                  <TextSizeIncreaseIcon className="w-6 h-6" />
                </Button>
                <Button
                  variant={showKeyboard ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => handleSettingChange(toggleKeyboard)}
                  aria-label="Toggle keyboard"
                  title="Toggle keyboard"
                  disabled={isSetupModalOpen}
                  accessKeyChar="K"
                >
                  <KeyboardIcon className="w-6 h-6" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={() => handleSettingChange(toggleTheme)} aria-label="Toggle theme" accessKeyChar="M" disabled={isSetupModalOpen}>
              {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 absolute w-full left-0 shadow-lg z-50">
          <div className="flex flex-col p-4 space-y-2">
            <NavButton
              page="home"
              label="Home"
              icon={<HomeIcon className="w-5 h-5" />}
              accessKeyChar="H"
              onClick={() => { navigateTo('home'); setIsMobileMenuOpen(false); }}
              className="w-full justify-start"
              showLabelAlways
            />
            <NavButton
              page="practice"
              label="Practice"
              icon={<PracticeIcon className="w-5 h-5" />}
              accessKeyChar="P"
              onClick={() => {
                if (!context.snippet) {
                  context.openSetupModal();
                } else {
                  navigateTo('practice');
                }
                setIsMobileMenuOpen(false);
              }}
              className="w-full justify-start"
              showLabelAlways
            />
            <NavButton
              page="dashboard"
              label="Dashboard"
              icon={<ChartBarIcon className="w-5 h-5" />}
              accessKeyChar="D"
              onClick={() => { navigateTo('dashboard'); setIsMobileMenuOpen(false); }}
              className="w-full justify-start"
              showLabelAlways
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
