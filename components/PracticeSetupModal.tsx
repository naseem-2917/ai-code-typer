import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { SegmentedControl } from './ui/SegmentedControl';
import { Button } from './ui/Button';
import { SnippetLength, SnippetLevel, Language } from '../types';
import { AppContext } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../constants';
import { Select, SelectRef } from './ui/Select';
import { useAccessKey } from '../hooks/useAccessKey';
import { UploadIcon } from './icons/UploadIcon';

interface PracticeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (length: SnippetLength | null, level: SnippetLevel | null, customCode?: string | null) => void;
  variant: 'default' | 'targeted';
}

const lengthOptions: { label: string, value: SnippetLength }[] = [
  { label: 'Short', value: 'short' },
  { label: 'Medium', value: 'medium' },
  { label: 'Long', value: 'long' },
];

const levelOptions: { label: string, value: SnippetLevel }[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
];

const tabOptions = [
    { label: 'Generate with AI', value: 'generate' },
    { label: 'Use Your Code', value: 'upload' },
];

const customLanguage: Language = { id: 'custom', name: 'Custom', prismAlias: 'clike' };
const generateLanguages = SUPPORTED_LANGUAGES;
const uploadLanguages = [...SUPPORTED_LANGUAGES, customLanguage];

export const PracticeSetupModal: React.FC<PracticeSetupModalProps> = ({ isOpen, onClose, onStart, variant }) => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext not found");
  
  const { 
    selectedLanguage, setSelectedLanguage, isLoadingSnippet, setLastPracticeAction,
    snippetLength, snippetLevel, setupTab, setSetupTab, startMultiFileSession, showAlert
  } = context;

  const [selectedLength, setSelectedLength] = useState<SnippetLength>(snippetLength);
  const [selectedLevel, setSelectedLevel] = useState<SnippetLevel>(snippetLevel);
  const [pastedCode, setPastedCode] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const tabRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<SelectRef>(null);
  const lengthRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const pasteTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const selectFileRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const useCodeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedLength(snippetLength);
      setSelectedLevel(snippetLevel);
      if (variant === 'default' && setupTab === 'upload') {
        // do nothing
      } else {
        setSetupTab('generate');
      }
      setPastedCode('');
    }
  }, [isOpen, variant, snippetLength, snippetLevel, setupTab, setSetupTab]);
  
  useEffect(() => {
    if (setupTab === 'generate' && selectedLanguage.id === 'custom') {
      setSelectedLanguage(SUPPORTED_LANGUAGES[0]);
    }
  }, [setupTab, selectedLanguage, setSelectedLanguage]);

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        if (setupTab === 'upload') {
          pasteTextAreaRef.current?.focus();
        } else if (variant === 'default') {
          startRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, setupTab, variant]);

  // FIX: Implemented minimum code length validation for pasted code.
  const handleCustomCodeSubmit = (code: string) => {
    if (code.trim().length < 2) {
        showAlert("Code must have at least 2 characters to start a practice session.", 'warning');
        return;
    }
    const codeWithNormalizedNewlines = code.replace(/\r\n?/g, '\n');
    setLastPracticeAction('upload');
    onStart(null, null, codeWithNormalizedNewlines);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
        return;
    }

    let filesToProcess = Array.from(files);

    if (filesToProcess.length > 10) {
        filesToProcess = filesToProcess.slice(0, 10);
        showAlert("Maximum limit reached. Only the first 10 files have been selected for practice.", 'warning');
    }

    setLastPracticeAction('upload');
    // FIX: Added a catch block to handle cases where all files are invalid, preventing the modal from closing.
    startMultiFileSession(filesToProcess)
      .then(() => {
          onStart(null, null, null); 
      })
      .catch((err) => {
        console.error("File processing failed:", err.message);
        // Do not close the modal, the alert is already shown in the context.
      });
    
    if (event.target) {
        event.target.value = '';
    }
  };


  const handleStartGenerate = () => {
    setLastPracticeAction('generate');
    onStart(selectedLength, selectedLevel, null);
  };
  
  const handleLanguageChange = (langId: string) => {
    const lang = uploadLanguages.find(l => l.id === langId);
    if(lang) setSelectedLanguage(lang);
  }

  useAccessKey('G', () => setSetupTab('generate'), { disabled: !isOpen || variant === 'targeted' });
  useAccessKey('U', () => setSetupTab('upload'), { disabled: !isOpen || variant === 'targeted' });
  useAccessKey('L', () => languageRef.current?.toggle(), { disabled: !isOpen });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (setupTab === 'generate' || variant === 'targeted') {
                startRef.current?.click();
            } else {
                useCodeRef.current?.click();
            }
            return;
        }
        
        const activeElement = document.activeElement as HTMLElement;

        if (activeElement === pasteTextAreaRef.current && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            
            const isGenerate = setupTab === 'generate' || variant === 'targeted';

            const generateFocusOrder = [
                tabRef.current,
                languageRef.current?.getTriggerElement(),
                lengthRef.current,
                levelRef.current,
                startRef.current
            ];

            const uploadFocusOrder = [
                tabRef.current,
                languageRef.current?.getTriggerElement(),
                pasteTextAreaRef.current,
                selectFileRef.current
            ];
            
            const focusableElements = (isGenerate ? generateFocusOrder : uploadFocusOrder).filter(Boolean) as HTMLElement[];

            const bottomButtons = [selectFileRef.current, backRef.current, useCodeRef.current];
            const isBottomButtonFocused = bottomButtons.some(btn => btn === activeElement);
            
            let currentIndex = focusableElements.findIndex(el => el === activeElement);

            if (isBottomButtonFocused && !isGenerate) {
                currentIndex = focusableElements.length - 1;
            }

            if (currentIndex === -1) {
              focusableElements[0]?.focus();
              return;
            }

            const direction = e.key === 'ArrowDown' ? 1 : -1;
            const nextIndex = (currentIndex + direction + focusableElements.length) % focusableElements.length;
            
            focusableElements[nextIndex]?.focus();
            return;
        }

        if (setupTab === 'upload' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
             const buttons = [selectFileRef.current, backRef.current, useCodeRef.current].filter(Boolean) as HTMLElement[];
             const currentButtonIndex = buttons.indexOf(activeElement);
             
             if (currentButtonIndex !== -1) {
                 e.preventDefault();
                 const direction = e.key === 'ArrowRight' ? 1 : -1;
                 const nextButtonIndex = (currentButtonIndex + direction + buttons.length) % buttons.length;
                 buttons[nextButtonIndex]?.focus();
             }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setupTab, variant]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={variant === 'targeted' ? 'Targeted Practice Setup' : 'Setup Your Practice'}>
        <div className="space-y-6">
            {variant === 'default' && (
                <div className="flex justify-center">
                    <SegmentedControl
                        ref={tabRef}
                        options={tabOptions}
                        selectedValue={setupTab}
                        onSelect={(value) => setSetupTab(value as 'generate' | 'upload')}
                        accessKeyChars={['G', 'U']}
                    />
                </div>
            )}

            { (setupTab === 'generate' || variant === 'targeted') && (
                <div className="space-y-4 animate-fade-in-up">
                    {variant === 'default' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                            <Select
                                ref={languageRef}
                                value={selectedLanguage.id}
                                onChange={handleLanguageChange}
                                options={generateLanguages.map(l => ({ value: l.id, label: l.name }))}
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Snippet Length</label>
                        <SegmentedControl
                            ref={lengthRef}
                            options={lengthOptions}
                            selectedValue={selectedLength}
                            onSelect={(value) => setSelectedLength(value as SnippetLength)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty Level</label>
                        <SegmentedControl
                            ref={levelRef}
                            options={levelOptions}
                            selectedValue={selectedLevel}
                            onSelect={(value) => setSelectedLevel(value as SnippetLevel)}
                        />
                    </div>
                    <div className="flex justify-center pt-4">
                        <Button ref={startRef} onClick={handleStartGenerate} className="w-1/2" disabled={isLoadingSnippet}>
                            {isLoadingSnippet ? 'Generating...' : 'Start Typing'}
                        </Button>
                    </div>
                </div>
            )}
            
            {variant === 'default' && setupTab === 'upload' && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                        <Select
                            ref={languageRef}
                            value={selectedLanguage.id}
                            onChange={handleLanguageChange}
                            options={uploadLanguages.map(l => ({ value: l.id, label: l.name }))}
                        />
                    </div>
                    <textarea
                        ref={pasteTextAreaRef}
                        value={pastedCode}
                        onChange={(e) => setPastedCode(e.target.value)}
                        placeholder="Paste your code here..."
                        className="w-full h-32 p-2 font-mono text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 custom-scrollbar"
                        aria-label="Paste code area"
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.cc,.cxx,.h,.hpp,.go,.rs,.txt,.*"
                        multiple
                    />
                    <div className="flex justify-between items-center flex-wrap gap-2 pt-2">
                        <Button ref={selectFileRef} variant="ghost" onClick={() => fileInputRef.current?.click()}>
                            <UploadIcon className="w-4 h-4 mr-2" />
                            Select File(s)
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button ref={backRef} variant="secondary" onClick={onClose}>
                                Back
                            </Button>
                            <Button ref={useCodeRef} onClick={() => handleCustomCodeSubmit(pastedCode)} disabled={!pastedCode.trim()}>
                                Use This Code
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </Modal>
  );
};