import React, { useEffect, useRef, useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttons: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  }[];
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, title, message, buttons }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, buttons.length);
  }, [buttons]);

  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0); // Reset focus to the first button
      setTimeout(() => buttonRefs.current[0]?.focus(), 100);

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const newIndex = (focusedIndex + direction + buttons.length) % buttons.length;
            setFocusedIndex(newIndex);
            buttonRefs.current[newIndex]?.focus();
        }
      };

      const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, buttons.length, focusedIndex]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card ref={modalRef} className="w-full max-w-md p-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
        <div className="flex justify-end items-center gap-3">
          {buttons.map((btn, index) => (
            <Button
              key={btn.label}
              ref={el => { buttonRefs.current[index] = el; }}
              onClick={btn.onClick}
              variant={btn.variant || 'primary'}
              onFocus={() => setFocusedIndex(index)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};