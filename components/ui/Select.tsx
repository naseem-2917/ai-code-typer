import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'disabled'> {
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export interface SelectRef {
  focus: () => void;
  toggle: () => void;
  getTriggerElement: () => HTMLButtonElement | null;
}

export const Select = forwardRef<SelectRef, SelectProps>(({ options, className = '', value, onChange, disabled = false, ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(Math.max(0, options.findIndex(o => o.value === value)));

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    setHighlightedIndex(Math.max(0, options.findIndex(o => o.value === value)));
  }, [value, options]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'Escape':
            setIsOpen(false);
            triggerRef.current?.focus();
            break;
          case 'ArrowUp': {
            e.preventDefault();
            const newIndex = (highlightedIndex - 1 + options.length) % options.length;
            setHighlightedIndex(newIndex)
            break;
          }
          case 'ArrowDown': {
            e.preventDefault();
            const newIndex = (highlightedIndex + 1) % options.length;
            setHighlightedIndex(newIndex);
            break;
          }
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < options.length) {
              onChange(options[highlightedIndex].value);
            }
            setIsOpen(false);
            triggerRef.current?.focus();
            break;
        }
      };

      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, highlightedIndex, options, onChange]);

  useImperativeHandle(ref, () => ({
    focus: () => triggerRef.current?.focus(),
    toggle: () => {
      if (disabled) return;
      setIsOpen(prev => !prev);
      if (!isOpen) {
        setHighlightedIndex(Math.max(0, options.findIndex(o => o.value === value)));
      }
    },
    getTriggerElement: () => triggerRef.current,
  }));

  useEffect(() => {
    if (isOpen) {
      const listElement = containerRef.current?.querySelector('ul');
      const highlightedElement = listElement?.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (!disabled && !isOpen && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            e.preventDefault();
            e.stopPropagation(); // Ensure we stop propagation
            const currentIndex = options.findIndex(o => o.value === value);
            const direction = e.key === 'ArrowRight' ? 1 : -1;

            let newIndex;
            if (currentIndex !== -1) {
              newIndex = (currentIndex + direction + options.length) % options.length;
            } else {
              // If current value is invalid, start from 0
              newIndex = 0;
            }
            onChange(options[newIndex].value);
          }
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-400 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-slate-200 dark:border-slate-700"
          tabIndex={-1}
          role="listbox"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 transition-colors ${highlightedIndex === index
                  ? 'text-white bg-primary-600'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={value === option.value}
            >
              <span className={`block truncate ${value === option.value ? 'font-semibold' : 'font-normal'}`}>
                {option.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});