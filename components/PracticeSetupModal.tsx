import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { SegmentedControl } from './ui/SegmentedControl';
import { Select } from './ui/Select';
import { UploadIcon } from './icons/UploadIcon';
import { SnippetLength, SnippetLevel, Language, PracticeMode, ContentType } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface PracticeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (length: SnippetLength | null, level: SnippetLevel | null, customCode?: string | null, mode?: PracticeMode, contentTypes?: ContentType[]) => void;
  variant?: 'default' | 'targeted';
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
  { label: 'Upload Text', value: 'upload' },
];

const modeOptions = [
  { label: 'Code Practice', value: 'code' },
  { label: 'General Typing', value: 'general' },
];

const customLanguage: Language = { id: 'custom', name: 'Custom', prismAlias: 'clike' };
const generalLanguage: Language = { id: 'general', name: 'General Text', prismAlias: 'text' };
const generateLanguages = SUPPORTED_LANGUAGES;
const uploadLanguages = [...SUPPORTED_LANGUAGES, customLanguage];

export const PracticeSetupModal: React.FC<PracticeSetupModalProps> = ({ isOpen, onClose, onStart, variant }) => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext not found");

  const {
    selectedLanguage, setSelectedLanguage, isLoadingSnippet, setLastPracticeAction,
    setupTab, setSetupTab, snippetLength, setSnippetLength, snippetLevel, setSnippetLevel,
    practiceMode, setPracticeMode, startMultiFileSession, showAlert, navigateTo,
    // Fix: Correctly destructure generalContentTypes from context
    generalContentTypes, setGeneralContentTypes
  } = context;

  const [selectedLength, setSelectedLength] = useState<SnippetLength>(snippetLength);
  const [selectedLevel, setSelectedLevel] = useState<SnippetLevel>(snippetLevel);
  const [selectedMode, setSelectedMode] = useState<PracticeMode>(practiceMode);
  const [pastedCode, setPastedCode] = useState('');

  // Fix: Initialize state with the value from Context (Memory)
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(generalContentTypes);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Refs for focus management
  const tabsRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const lengthRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<any>(null);
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  const selectFileRef = useRef<HTMLButtonElement>(null);
  const useCodeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  // Fix: Sync local state with global state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLength(snippetLength);
      setSelectedLevel(snippetLevel);
      setSelectedMode(practiceMode);
      setSelectedContentTypes(generalContentTypes);
      setTimeout(() => generateBtnRef.current?.focus(), 50);
    }
  }, [isOpen, snippetLength, snippetLevel, practiceMode, generalContentTypes]);

  // Auto-focus on paste textarea when tab changes
  useEffect(() => {
    if (isOpen && setupTab === 'upload') {
      setTimeout(() => pasteTextAreaRef.current?.focus(), 50);
    }
  }, [isOpen, setupTab]);

  const handleStartGenerate = () => {
    // MANDATORY RESET: Clear any previous session state before starting
    setLastPracticeAction('generate');
    setPracticeMode(selectedMode);
    setSnippetLength(selectedLength);
    setSnippetLevel(selectedLevel);

    // Fix: Save the user's selection to Context Memory
    setGeneralContentTypes(selectedContentTypes);

    // Pass specific settings to onStart
    onStart(selectedLength, selectedLevel, null, selectedMode, selectedContentTypes);
  };

  const handleCustomCodeSubmit = (code: string) => {
    if (code.trim().length < 2) {
      showAlert("Code must be at least 2 characters long.", 'error');
      return;
    }
    setLastPracticeAction('upload');

    if (selectedMode === 'general') {
      setSelectedLanguage(generalLanguage);
    }

    // For custom code, content types don't matter, pass undefined or empty array
    onStart(null, null, code, selectedMode);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      if (files.length === 1) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          handleCustomCodeSubmit(text);
        };
        reader.readAsText(file);
      } else {
        const readFileContent = (file: File): Promise<{ file: File, isValid: boolean }> => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const text = event.target?.result as string;
              resolve({ file, isValid: text.trim().length >= 2 });
            };
            reader.readAsText(file);
          });
        };

        try {
          const results = await Promise.all(files.map(readFileContent));
          const validFiles = results.filter(r => r.isValid).map(r => r.file);
          const invalidFiles = results.filter(r => !r.isValid).map(r => r.file);

          if (validFiles.length === 0) {
            showAlert("All selected files are invalid. Code must be at least 2 characters long.", 'error');
          } else {
            if (invalidFiles.length > 0) {
              const invalidNames = invalidFiles.map(f => f.name).join(', ');
              showAlert(`Skipped ${invalidFiles.length} invalid file(s) (<2 chars): ${invalidNames}`, 'warning', 6000);
            }

            if (selectedMode === 'general') {
              setSelectedLanguage(generalLanguage);
            }
            await startMultiFileSession(validFiles);

            onClose();
            navigateTo('practice');
          }
        } catch (error) {
          console.error("Multi-file session start failed:", error);
          showAlert("An unexpected error occurred while processing files.", 'error');
        }
      }
    }
  };

  const toggleContentType = (type: ContentType) => {
    setSelectedContentTypes(prev => {
      if (prev.includes(type)) {
        // Prevent deselecting the last item
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Keyboard Navigation Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement;
      const isTextInput = target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text');

      if ((e.ctrlKey || e.shiftKey || e.altKey) && e.key === 'Enter') {
        e.preventDefault();
        if (setupTab === 'generate') {
          if (!isLoadingSnippet) handleStartGenerate();
        } else {
          if (pastedCode.trim()) handleCustomCodeSubmit(pastedCode);
        }
        return;
      }

      // Stop Arrow navigation if in text input/textarea to allow cursor movement
      if (isTextInput && (e.key.startsWith('Arrow'))) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const current = document.activeElement;
        const primaryBtn = setupTab === 'generate' ? generateBtnRef.current : useCodeRef.current;
        if (current === primaryBtn || current === backRef.current) {
          e.preventDefault();
          if (current === primaryBtn) backRef.current?.focus();
          else primaryBtn?.focus();
          return;
        }

        if (contentRef.current?.contains(current)) {
          e.preventDefault();
          const buttons = Array.from(contentRef.current.querySelectorAll('button'));
          const idx = buttons.indexOf(current as HTMLButtonElement);
          if (idx !== -1) {
            const direction = e.key === 'ArrowRight' ? 1 : -1;
            const nextIdx = (idx + direction + buttons.length) % buttons.length;
            buttons[nextIdx].focus();
          }
          return;
        }
      }

      if (e.key === 'Enter' && contentRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        (document.activeElement as HTMLElement).click();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const order: { ref: React.RefObject<HTMLElement>, type: 'segmented' | 'select' | 'input' | 'button' | 'container' }[] = [];

        order.push({ ref: tabsRef as any, type: 'segmented' });
        order.push({ ref: modeRef as any, type: 'segmented' });

        if (setupTab === 'generate') {
          if (selectedMode === 'code') {
            order.push({ ref: languageRef as any, type: 'select' });
          }
          order.push({ ref: lengthRef as any, type: 'segmented' });
          if (selectedMode === 'code') {
            order.push({ ref: levelRef as any, type: 'segmented' });
          } else {
            order.push({ ref: contentRef as any, type: 'container' });
          }
          order.push({ ref: actionButtonsRef as any, type: 'container' });
        } else {
          if (selectedMode === 'code') {
            order.push({ ref: languageRef as any, type: 'select' });
          }
          order.push({ ref: pasteTextAreaRef as any, type: 'input' });
          order.push({ ref: selectFileRef as any, type: 'button' });
          order.push({ ref: actionButtonsRef as any, type: 'container' });
        }

        const currentElement = document.activeElement;
        const currentIndex = order.findIndex(item => {
          if (item.type === 'select') {
            return item.ref.current?.getTriggerElement?.() === currentElement;
          }
          if (item.type === 'container' || item.type === 'segmented') {
            return item.ref.current?.contains(currentElement);
          }
          return item.ref.current === currentElement;
        });

        if (currentIndex !== -1) {
          e.preventDefault();
          const direction = e.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = (currentIndex + direction + order.length) % order.length;
          const nextItem = order[nextIndex];

          if (nextItem.type === 'select') {
            nextItem.ref.current?.focus();
          } else if (nextItem.type === 'container') {
            if (nextItem.ref === actionButtonsRef) {
              const primaryBtn = setupTab === 'generate' ? generateBtnRef.current : useCodeRef.current;
              primaryBtn?.focus();
            } else if (nextItem.ref === contentRef) {
              const firstBtn = nextItem.ref.current?.querySelector('button');
              firstBtn?.focus();
            } else {
              const firstInput = nextItem.ref.current?.querySelector('input');
              firstInput?.focus();
            }
          } else {
            nextItem.ref.current?.focus();
          }
        }
        return;
      }

      if (e.altKey) {
        const key = e.key.toLowerCase();
        switch (key) {
          case 'a': setSetupTab('generate'); break;
          case 'u': setSetupTab('upload'); break;
          case 'c': setSelectedMode('code'); break;
          case 'g': setSelectedMode('general'); break;
          case 's': if (setupTab === 'generate') setSelectedLength('short'); break;
          case 'm': if (setupTab === 'generate') setSelectedLength('medium'); break;
          case 'l': if (setupTab === 'generate') setSelectedLength('long'); break;
          case 'i': if (setupTab === 'generate' && selectedMode === 'code') setSelectedLevel('medium'); break;
          case 'h':
            if (setupTab === 'generate') {
              if (selectedMode === 'code') setSelectedLevel('hard');
              else toggleContentType('characters');
            }
            break;
          case 'y':
            if (setupTab === 'generate') {
              if (selectedMode === 'code') setSelectedLevel('easy');
              else toggleContentType('symbols');
            }
            break;
          case 'n': if (setupTab === 'generate' && selectedMode === 'general') toggleContentType('numbers'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoadingSnippet, selectedMode, setupTab, selectedLength, selectedLevel, selectedContentTypes, pastedCode, handleStartGenerate, handleCustomCodeSubmit]);

  const handleLanguageChange = (value: string) => {
    const langId = value;
    const lang = uploadLanguages.find(l => l.id === langId) || uploadLanguages[0];
    setSelectedLanguage(lang);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Practice Setup" size="md">
      <div className="space-y-6">
        <SegmentedControl
          ref={tabsRef}
          options={tabOptions}
          selectedValue={setupTab}
          onSelect={(value) => {
            setSetupTab(value as 'generate' | 'upload');
            tabsRef.current?.focus();
          }}
          className="mb-4"
          accessKeyChars={['A', 'U']}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode</label>
          <SegmentedControl
            ref={modeRef}
            options={modeOptions}
            selectedValue={selectedMode}
            onSelect={(value) => {
              setSelectedMode(value as PracticeMode);
              modeRef.current?.focus();
            }}
            accessKeyChars={['C', 'G']}
          />
        </div>

        {setupTab === 'generate' && (
          <div className="space-y-4 animate-fade-in-up">
            {selectedMode === 'code' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <Select
                  ref={languageRef}
                  options={generateLanguages.map(l => ({ label: l.name, value: l.id }))}
                  value={selectedLanguage.id}
                  onChange={handleLanguageChange}
                  searchable
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Length</label>
              <SegmentedControl
                ref={lengthRef}
                options={lengthOptions}
                selectedValue={selectedLength}
                onSelect={(value) => {
                  setSelectedLength(value as SnippetLength);
                  lengthRef.current?.focus();
                }}
                accessKeyChars={['S', 'M', 'L']}
              />
            </div>

            {selectedMode === 'code' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty Level</label>
                <SegmentedControl
                  ref={levelRef}
                  options={levelOptions}
                  selectedValue={selectedLevel}
                  onSelect={(value) => {
                    setSelectedLevel(value as SnippetLevel);
                    levelRef.current?.focus();
                  }}
                  accessKeyChars={['Y', 'I', 'H']}
                />
              </div>
            ) : (
              <div className="space-y-2" ref={contentRef}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Type</label>
                <div className="flex p-1 gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-full">
                  <button
                    onClick={() => toggleContentType('characters')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${selectedContentTypes.includes('characters')
                      ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                      }`}
                  >
                    Characters (a-z)
                  </button>
                  <button
                    onClick={() => toggleContentType('numbers')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${selectedContentTypes.includes('numbers')
                      ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                      }`}
                  >
                    Numbers (0-9)
                  </button>
                  <button
                    onClick={() => toggleContentType('symbols')}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${selectedContentTypes.includes('symbols')
                      ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent'
                      }`}
                  >
                    Symbols (!@#)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {setupTab === 'upload' && (
          <div className="space-y-4 animate-fade-in-up">
            {selectedMode === 'code' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <Select
                  ref={languageRef}
                  options={uploadLanguages.map(l => ({ label: l.name, value: l.id }))}
                  value={selectedLanguage.id}
                  onChange={handleLanguageChange}
                  searchable
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Paste Code</label>
              <textarea
                ref={pasteTextAreaRef}
                className="w-full h-32 p-3 border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-white font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                placeholder="Paste your code here..."
                value={pastedCode}
                onChange={(e) => setPastedCode(e.target.value)}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-900 text-gray-500">Or upload file</span>
              </div>
            </div>

            <div className="flex justify-center">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.hpp,.cs,.go,.rs,.php,.rb,.html,.css,.json,.md"
                onChange={handleFileChange}
                multiple
              />
              <Button
                ref={selectFileRef}
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                Select File(s)
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-4 border-t dark:border-slate-700" ref={actionButtonsRef}>
          <Button
            ref={backRef}
            variant="ghost"
            onClick={onClose}
            className="hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:bg-slate-100 dark:focus:bg-slate-800 transition-colors"
          >
            Cancel
          </Button>
          {setupTab === 'generate' ? (
            <Button
              ref={generateBtnRef}
              variant="primary"
              onClick={handleStartGenerate}
              isLoading={isLoadingSnippet}
              accessKeyChar="Enter"
              accessKeyLabel="↵"
            >
              Start Practice
            </Button>
          ) : (
            <Button
              ref={useCodeRef}
              variant="primary"
              onClick={() => handleCustomCodeSubmit(pastedCode)}
              disabled={!pastedCode.trim()}
            >
              Use This Text
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};