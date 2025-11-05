import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
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
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Ensure refs array is the correct size
  useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, buttons.length);
  }, [buttons]);

  // Handle keyboard navigation and initial focus
  useEffect(() => {
    if (isOpen) {
      // Set initial focus on the 'Merge' button
      const focusTimeout = setTimeout(() => {
        buttonRefs.current[0]?.focus();
        setFocusedIndex(0);
      }, 100);

      const handleKeyDown = (event: KeyboardEvent) => {
        // The modal component itself handles 'Escape'
        if (!isOpen) return;
        
        // Allow the browser's default Tab and Shift+Tab behavior
        if (event.key === 'Tab') {
          return;
        }

        // We handle other keys, so prevent default browser actions like scrolling
        event.preventDefault();

        const focusableButtons = buttonRefs.current.filter(Boolean) as HTMLElement[];
        if (focusableButtons.length === 0) return;

        // Get the current index from the active element to avoid stale state issues
        const currentIndex = focusableButtons.findIndex(btn => btn === document.activeElement);

        if (event.key === 'Enter') {
          if (currentIndex !== -1) {
            focusableButtons[currentIndex].click();
          }
          return;
        }

        let newIndex = currentIndex === -1 ? 0 : currentIndex;
        if (event.key === 'ArrowRight') {
          newIndex = (currentIndex + 1) % focusableButtons.length;
        } else if (event.key === 'ArrowLeft') {
          newIndex = (currentIndex - 1 + focusableButtons.length) % focusableButtons.length;
        }
        
        // Manually shift focus, which will trigger the onFocus handler on the button
        focusableButtons[newIndex]?.focus();
      };
      
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(focusTimeout);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, buttons]); // Dependency array is stable for a reliable listener

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
      <div className="flex justify-center items-center gap-3">
        {buttons.map((btn, index) => (
          <Button
            key={btn.label}
            ref={el => { buttonRefs.current[index] = el; }}
            onClick={btn.onClick}
            // The visual highlight is driven by the state-managed `variant` prop for a strong
            // primary/secondary distinction, and the built-in `:focus` ring for accessibility.
            variant={index === focusedIndex ? 'primary' : 'secondary'}
            // Update state when focus changes, whether by mouse, tab, or arrow keys
            onFocus={() => setFocusedIndex(index)}
            // For a better UX, make hovering also set the actual browser focus
            onMouseEnter={() => buttonRefs.current[index]?.focus()}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </Modal>
  );
};
