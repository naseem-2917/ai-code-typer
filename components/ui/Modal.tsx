import React, { useEffect, useRef, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';
import { Button } from './Button';
import { AppContext } from '../../context/AppContext';
import { useAccessKey } from '../../hooks/useAccessKey';

// Context to let children know they're inside a modal
export const ModalContext = createContext(false);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const modalRoot = document.getElementById('modal-root');

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const context = useContext(AppContext);

  // Alt+X to close modal
  useAccessKey('X', onClose, { disabled: !isOpen });

  // Auto-register modal with global state
  useEffect(() => {
    if (isOpen) {
      context?.registerModalOpen();
      return () => {
        context?.registerModalClose();
      };
    }
  }, [isOpen, context]);

  useEffect(() => {
    const root = document.getElementById('root');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    if (isOpen) {
      root?.classList.add('modal-open-blur');
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      root?.classList.remove('modal-open-blur');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !modalRoot) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed top-0 left-0 w-[100vw] h-[100vh] z-[9999] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <Card ref={modalRef} className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar p-6 animate-fade-in-up">
        <ModalContext.Provider value={true}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-m-2"
              aria-label="Close"
              title="Close (Alt+X)"
              accessKeyChar="X"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          <div>{children}</div>
        </ModalContext.Provider>
      </Card>
    </div>
  );

  return createPortal(modalContent, modalRoot);
};