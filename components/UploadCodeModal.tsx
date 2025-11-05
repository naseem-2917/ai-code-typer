import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { UploadIcon } from './icons/UploadIcon';

interface UploadCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeSubmit: (code: string) => void;
  onUploadFileClick?: () => void;
}

export const UploadCodeModal: React.FC<UploadCodeModalProps> = ({ isOpen, onClose, onCodeSubmit, onUploadFileClick }) => {
  const [pastedCode, setPastedCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Refs for keyboard navigation
  const selectFileRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const useCodeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
        setPastedCode('');
        setTimeout(() => pasteTextAreaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;

        const elements = [selectFileRef.current, backRef.current, useCodeRef.current].filter(Boolean) as HTMLElement[];
        if (elements.length === 0) return;

        const activeElement = document.activeElement as HTMLElement;

        if (activeElement === pasteTextAreaRef.current && e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            elements[0]?.focus();
            return;
        }

        const currentIndex = elements.indexOf(activeElement);
        if (currentIndex > -1) { // A button is focused
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                pasteTextAreaRef.current?.focus();
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const direction = e.key === 'ArrowRight' ? 1 : -1;
                const newIndex = (currentIndex + direction + elements.length) % elements.length;
                elements[newIndex]?.focus();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text && text.trim()) {
            const codeWithNormalizedNewlines = text.replace(/\r\n?/g, '\n');
            onCodeSubmit(codeWithNormalizedNewlines);
        } else {
            alert("The selected file is empty or contains only whitespace.");
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedCode.trim()) return;
    const codeWithNormalizedNewlines = pastedCode.replace(/\r\n?/g, '\n');
    onCodeSubmit(codeWithNormalizedNewlines);
  };
  
  const handleClose = () => {
    setPastedCode('');
    onClose();
  }

  const handleUploadButtonClick = () => {
    onUploadFileClick?.();
    fileInputRef.current?.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Use Custom Code">
      <div className="space-y-4">
        <textarea
          ref={pasteTextAreaRef}
          value={pastedCode}
          onChange={(e) => setPastedCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              e.stopPropagation();
              handlePasteSubmit();
            }
          }}
          placeholder="Paste your code here..."
          className="w-full h-48 p-2 font-mono text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Paste code area"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".js,.ts,.py,.java,.cpp,.go,.rs,.txt"
        />
        <div className="flex justify-between items-center flex-wrap gap-2">
          <Button ref={selectFileRef} variant="ghost" onClick={handleUploadButtonClick}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Select File
          </Button>
          <div className="flex items-center gap-2">
            <Button ref={backRef} variant="secondary" onClick={handleClose}>
              Back
            </Button>
            <Button ref={useCodeRef} onClick={handlePasteSubmit} disabled={!pastedCode.trim()}>
              Use This Code
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};