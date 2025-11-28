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
  const lengthRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const generateBtnRef = useRef<HTMLButtonElement>(null);
  const pasteTextAreaRefFocus = useRef<HTMLTextAreaElement>(null);
  const selectFileRef = useRef<HTMLButtonElement>(null);
  const useCodeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedLength(snippetLength);
      setSelectedLevel(snippetLevel);
      setSelectedMode(practiceMode);
      // Reset content types if needed, or keep default
    }
  }, [isOpen, snippetLength, snippetLevel, practiceMode]);

  const handleStartGenerate = () => {
    setLastPracticeAction('generate');
    setPracticeMode(selectedMode);
    setSnippetLength(selectedLength);
    setSnippetLevel(selectedLevel);
    onStart(selectedLength, selectedLevel, null, selectedMode, selectedContentTypes);
  };

  const handleCustomCodeSubmit = (code: string) => {
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const langId = e.target.value;
    const lang = uploadLanguages.find(l => l.id === langId) || uploadLanguages[0];
    setSelectedLanguage(lang);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Practice Setup" size="md">
      <div className="space-y-6">
        <SegmentedControl
          options={tabOptions}
          selectedValue={setupTab}
          onSelect={(value) => setSetupTab(value as 'generate' | 'upload')}
          className="mb-4"
        />

        {setupTab === 'generate' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mode</label>
              <SegmentedControl
                options={modeOptions}
                selectedValue={selectedMode}
                onSelect={(value) => setSelectedMode(value as PracticeMode)}
              />
            </div>

            {selectedMode === 'code' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <Select
                  ref={languageRef}
                  value={selectedLanguage.id}
                  onChange={(e) => {
                    const lang = generateLanguages.find(l => l.id === e.target.value) || generateLanguages[0];
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
                onSelect={(value) => setSelectedLength(value as SnippetLength)}
              />
            </div>

            {selectedMode === 'code' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty Level</label>
                <SegmentedControl
                  ref={levelRef}
                  options={levelOptions}
                  selectedValue={selectedLevel}
                  onSelect={(value) => setSelectedLevel(value as SnippetLevel)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Selection</label>
                <div className="flex gap-4">
                  {(['characters', 'numbers', 'symbols'] as ContentType[]).map((type) => (
                    <label key={type} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedContentTypes.includes(type)}
                        onChange={() => {
                          setSelectedContentTypes(prev => {
                            if (prev.includes(type)) {
                              if (prev.length === 1) return prev;
                              return prev.filter(t => t !== type);
                            } else {
                              return [...prev, type];
                            }
                          });
                        }}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
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