import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { SegmentedControl } from './ui/SegmentedControl';
import { Select } from './ui/Select';
import { AccessKeyLabel } from './ui/AccessKeyLabel';
import { UploadIcon } from './icons/UploadIcon';
import { SnippetLength, SnippetLevel, Language, PracticeMode, ContentType } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';

interface PracticeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (length: SnippetLength | null, level: SnippetLevel | null, customCode?: string | null, mode?: PracticeMode, contentTypes?: ContentType[]) => void;
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

const modeOptions = [
  { label: 'Code Practice', value: 'code' },
  { label: 'General Typing', value: 'general' },
];

const customLanguage: Language = { id: 'custom', name: 'Custom', prismAlias: 'clike' };
const generateLanguages = SUPPORTED_LANGUAGES;
const uploadLanguages = [...SUPPORTED_LANGUAGES, customLanguage];

export const PracticeSetupModal: React.FC<PracticeSetupModalProps> = ({ isOpen, onClose, onStart, variant }) => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext not found");

  const {
    selectedLanguage, setSelectedLanguage, isLoadingSnippet, setLastPracticeAction,
    setupTab, setSetupTab, snippetLength, setSnippetLength, snippetLevel, setSnippetLevel,
    practiceMode, setPracticeMode, startMultiFileSession
  } = context;

  const [selectedLength, setSelectedLength] = useState<SnippetLength>(snippetLength);
  const [selectedLevel, setSelectedLevel] = useState<SnippetLevel>(snippetLevel);
  const [selectedMode, setSelectedMode] = useState<PracticeMode>(practiceMode);
  const [pastedCode, setPastedCode] = useState('');
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(['characters']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Refs for focus management
  const tabsRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);
  const lengthRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<any>(null); // Select component ref
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  const selectFileRef = useRef<HTMLButtonElement>(null);
  const useCodeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedLength(snippetLength);
      setSelectedLevel(snippetLevel);
      setSelectedMode(practiceMode);
      // Reset content types if needed, or keep default
      setTimeout(() => generateBtnRef.current?.focus(), 50);
    }
  }, [isOpen, snippetLength, snippetLevel, practiceMode]);

  const handleStartGenerate = () => {
    // MANDATORY RESET: Clear any previous session state before starting
    setLastPracticeAction('generate');
    setPracticeMode(selectedMode);
    setSnippetLength(selectedLength);
    setSnippetLevel(selectedLevel);
    // Explicitly reset session key to force remount
    onStart(selectedLength, selectedLevel, null, selectedMode, selectedContentTypes);
  };

  const handleCustomCodeSubmit = (code: string) => {
    // MANDATORY RESET: Clear any previous session state before starting
    setLastPracticeAction('upload');
    onStart(null, null, code, selectedMode);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (files.length === 1) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          handleCustomCodeSubmit(text);
        };
        reader.readAsText(file);
      } else {
        await startMultiFileSession(files);
        onClose();
      }
    }
  };

  const toggleContentType = (type: ContentType) => {
    setSelectedContentTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Start Practice
      if ((e.ctrlKey || e.shiftKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoadingSnippet && setupTab === 'generate') handleStartGenerate();
        return;
      }

      // Horizontal Navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const current = document.activeElement;

        // Action Buttons
        if (current === generateBtnRef.current || current === backRef.current) {
          e.preventDefault();
          if (current === generateBtnRef.current) backRef.current?.focus();
          else generateBtnRef.current?.focus();
          return;
        }

        // Content Selection Buttons
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

      // Enter Key for Content Selection
      if (e.key === 'Enter' && contentRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        (document.activeElement as HTMLElement).click();
        return;
      }

      // Vertical Navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const order: { ref: React.RefObject<HTMLElement>, type: 'segmented' | 'select' | 'input' | 'button' | 'container' }[] = [];

        // Build navigation order based on current state
        order.push({ ref: tabsRef as any, type: 'segmented' });

        if (setupTab === 'generate') {
          order.push({ ref: modeRef as any, type: 'segmented' });
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
          order.push({ ref: languageRef as any, type: 'select' });
          order.push({ ref: pasteTextAreaRef as any, type: 'input' });
          order.push({ ref: selectFileRef as any, type: 'button' });
          order.push({ ref: actionButtonsRef as any, type: 'container' });
        }

        const currentElement = document.activeElement;
        const currentIndex = order.findIndex(item => {
          if (item.type === 'select') {
            // Accessing exposed method from Select
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
              generateBtnRef.current?.focus();
            } else if (nextItem.ref === contentRef) {
              // Focus first button in content group
              const firstBtn = nextItem.ref.current?.querySelector('button');
              firstBtn?.focus();
            } else {
              // Focus first input in container (fallback)
              const firstInput = nextItem.ref.current?.querySelector('input');
              firstInput?.focus();
            }
          } else {
            nextItem.ref.current?.focus();
          }
        }
        return;
      }

      // Alt Shortcuts
      if (e.altKey) {
        const key = e.key.toLowerCase();
        switch (key) {
          // Tabs
          case 'a': setSetupTab('generate'); break;
          case 'u': setSetupTab('upload'); break;

          // Mode
          case 'c': if (setupTab === 'generate') setSelectedMode('code'); break;
          case 'g': if (setupTab === 'generate') setSelectedMode('general'); break;

          // Length
          case 's': if (setupTab === 'generate') setSelectedLength('short'); break;
          case 'm': if (setupTab === 'generate') setSelectedLength('medium'); break;
          case 'l': if (setupTab === 'generate') setSelectedLength('long'); break;

          // Level (Code Mode)
          case 'e': if (setupTab === 'generate' && selectedMode === 'code') setSelectedLevel('easy'); break;
          case 'i': if (setupTab === 'generate' && selectedMode === 'code') setSelectedLevel('medium'); break;
          case 'h':
            if (setupTab === 'generate') {
              if (selectedMode === 'code') setSelectedLevel('hard');
              else toggleContentType('characters'); // 'h' for cHaracters
            }
            break;

          // Content (General Mode)
          // 'h' is handled above
          case 'n': if (setupTab === 'generate' && selectedMode === 'general') toggleContentType('numbers'); break;
          case 'y': if (setupTab === 'generate' && selectedMode === 'general') toggleContentType('symbols'); break; // 'y' for sYmbols
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoadingSnippet, selectedMode, setupTab, selectedLength, selectedLevel, selectedContentTypes]);

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

        {setupTab === 'generate' && (
          <div className="space-y-4 animate-fade-in-up">
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

            {selectedMode === 'code' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <Select
                  ref={languageRef}
                  value={selectedLanguage.id}
                  onChange={(value) => {
                    const lang = generateLanguages.find(l => l.id === value) || generateLanguages[0];
                    setSelectedLanguage(lang);
                  }}
                  options={generateLanguages.map(l => ({ value: l.id, label: l.name }))}
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
                  accessKeyChars={['E', 'I', 'H']}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Selection</label>
                <div
                  className="flex justify-center items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  ref={contentRef}
                  role="group"
                  aria-label="Content Selection"
                >
                  {(['characters', 'numbers', 'symbols'] as ContentType[]).map((type) => {
                    let accessKey = '';
                    if (type === 'characters') accessKey = 'H';
                    if (type === 'numbers') accessKey = 'N';
                    if (type === 'symbols') accessKey = 'Y';
                    const isSelected = selectedContentTypes.includes(type);

                    return (
                      <Button
                        key={type}
                        variant={isSelected ? 'primary' : 'ghost'}
                        size="sm"
                        className={`relative capitalize ${isSelected ? '' : 'text-gray-600 dark:text-gray-300'}`}
                        onClick={() => toggleContentType(type)}
                        tabIndex={-1} // Managed by custom navigation
                      >
                        {context.isAccessKeyMenuVisible && <AccessKeyLabel label={accessKey} />}
                        {type}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2" ref={actionButtonsRef}>
              <Button ref={backRef} variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button ref={generateBtnRef} onClick={handleStartGenerate} disabled={isLoadingSnippet}>
                {isLoadingSnippet ? 'Generating...' : 'Start Practice'}
              </Button>
            </div>
          </div>
        )}

        {setupTab === 'upload' && (
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
              className="w-full h-32 p-2 font-mono text-sm bg-slate-100 dark:bg-slate-600 dark:text-slate-50 dark:placeholder-slate-400 border border-slate-300 dark:border-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 custom-scrollbar"
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
              <div className="flex items-center gap-2" ref={actionButtonsRef}>
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