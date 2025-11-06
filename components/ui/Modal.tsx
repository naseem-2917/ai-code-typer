import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './Card';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const modalRoot = document.getElementById('modal-root');

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.getElementById('root');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      root?.classList.add('modal-open-blur');
      document.addEventListener('keydown', handleKeyDown);
      // Timeout to prevent closing on the same click that opens it
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    }

    return () => {
      root?.classList.remove('modal-open-blur');
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !modalRoot) {
    return null;
  }

  const modalContent = (
    <div className="fixed top-0 left-0 w-[100vw] h-[100vh] z-[9999] flex items-center justify-center bg-black/70">
      <Card ref={modalRef} className="w-full max-w-md p-6 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
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
      </Card>
    </div>
  );

  return createPortal(modalContent, modalRoot);
};