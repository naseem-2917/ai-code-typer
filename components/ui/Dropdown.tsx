import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback, ReactElement, useMemo } from 'react';
import { CheckIcon } from '../icons/CheckIcon';

// This interface is needed for the ref in PracticePage
export interface DropdownRef {
  close: () => void;
}

interface DropdownProps {
  trigger: ReactElement;
  children: React.ReactNode;
}

// DropdownItemProps is defined here for use in DropdownItem and Dropdown
interface DropdownItemProps {
  onClick: () => void;
  children: React.ReactNode;
  isActive?: boolean;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
}

export const Dropdown = forwardRef<DropdownRef, DropdownProps>(({ trigger, children }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  const menuItems = useMemo(() => 
    React.Children.toArray(children).filter(child => 
      React.isValidElement(child) && (child.type === DropdownItem)
    ) as React.ReactElement<DropdownItemProps>[], 
  [children]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  
  // FIX: Corrected typo from useImperpartiaveHandle to useImperativeHandle
  useImperativeHandle(ref, () => ({
    close: closeDropdown,
  }));

  const handleTriggerClick = () => {
    setIsOpen(prev => !prev);
  };
  
  useEffect(() => {
    if (isOpen) {
      const activeChildIndex = menuItems.findIndex(child => child.props.isActive);
      setHighlightedIndex(activeChildIndex > -1 ? activeChildIndex : 0);
      menuRef.current?.focus();
      
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          closeDropdown();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, menuItems, closeDropdown]);
  
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && menuRef.current) {
        const itemNodes = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'));
        const highlightedElement = itemNodes[highlightedIndex] as HTMLElement;
        if (highlightedElement) {
            highlightedElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [isOpen, highlightedIndex]);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (menuItems.length === 0) return;

    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % menuItems.length);
            break;
        case 'ArrowUp':
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            if (highlightedIndex >= 0) {
                menuItems[highlightedIndex]?.props.onClick();
                // We let the onClick handler manage focus, so we only close here.
                setIsOpen(false);
            }
            break;
        case 'Escape':
        case 'Tab':
            e.preventDefault();
            closeDropdown();
            break;
    }
  };

  let itemCounter = -1;
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === DropdownItem) {
        itemCounter++;
        const currentIndex = itemCounter;
        const originalOnClick = (child.props as any).onClick;
        return React.cloneElement(child as React.ReactElement<any>, {
          isHighlighted: currentIndex === highlightedIndex,
          onMouseEnter: () => setHighlightedIndex(currentIndex),
          onClick: () => {
              if (originalOnClick) originalOnClick();
              // FIX: Only close the dropdown menu; do not call closeDropdown() which
              // steals focus back to the trigger button. This allows the parent
              // component to properly manage and restore focus.
              setIsOpen(false);
          }
        });
    }
    return child;
  });

  const clonedTrigger = React.cloneElement(trigger as any, {
    ref: triggerRef,
    onClick: (e: React.MouseEvent) => {
        handleTriggerClick();
        if ((trigger.props as any).onClick) {
            (trigger.props as any).onClick(e);
        }
    },
    'aria-haspopup': 'true',
    'aria-expanded': isOpen,
  });

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {clonedTrigger}
      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none border border-slate-200 dark:border-slate-700 z-10 animate-fade-in-up"
        >
          <div 
            ref={menuRef}
            onKeyDown={handleMenuKeyDown}
            tabIndex={-1}
            className="py-1 focus:outline-none" 
            role="menu" 
            aria-orientation="vertical"
          >
            {childrenWithProps}
          </div>
        </div>
      )}
    </div>
  );
});

export const DropdownItem: React.FC<DropdownItemProps> = ({ onClick, children, isActive = false, isHighlighted = false, onMouseEnter }) => {
  const stateClasses = isHighlighted
    ? 'bg-primary-500 text-white'
    : 'text-gray-700 dark:text-gray-200';
  
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      onMouseEnter={onMouseEnter}
      className={`flex items-center justify-between px-4 py-2 text-sm focus:outline-none transition-colors ${stateClasses}`}
      role="menuitem"
      tabIndex={-1}
    >
      <span className={isActive ? 'font-semibold' : 'font-normal'}>{children}</span>
      {isActive && <CheckIcon className="w-4 h-4 text-primary-500" />}
    </a>
  );
};