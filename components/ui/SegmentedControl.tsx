import React, { forwardRef, useContext } from 'react';
import { Button } from './Button';
import { AppContext } from '../../context/AppContext';
import { AccessKeyLabel } from './AccessKeyLabel';
import { ModalContext } from './Modal';

interface SegmentedControlProps {
    options: { label: string, value: string }[];
    selectedValue: string;
    onSelect: (value: any) => void;
    disabled?: boolean;
    accessKeyChars?: (string | undefined)[];
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(({
    options,
    selectedValue,
    onSelect,
    disabled = false,
    accessKeyChars,
}, ref) => {
    const context = useContext(AppContext);
    const isInsideModal = useContext(ModalContext);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        const currentIndex = options.findIndex(opt => opt.value === selectedValue);

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % options.length;
            onSelect(options[nextIndex].value);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + options.length) % options.length;
            onSelect(options[prevIndex].value);
        }
    };

    // Show label if: visible, has key, AND (inside modal OR no modal open)
    const shouldShowLabels = context?.isAccessKeyMenuVisible && (isInsideModal || !context?.isAnyModalOpen);

    return (
        <div
            ref={ref}
            role="group"
            tabIndex={disabled ? -1 : 0}
            className="flex justify-center items-center gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            onKeyDown={handleKeyDown}
        >
            {options.map(({ label, value }, index) => (
                <Button
                    key={value}
                    variant={selectedValue === value ? 'primary' : 'ghost'}
                    size="sm"
                    className={`relative ${selectedValue === value ? '' : 'text-gray-600 dark:text-gray-300'}`}
                    onClick={() => onSelect(value)}
                    disabled={disabled}
                    tabIndex={-1} // Prevent individual buttons from being tab stops
                >
                    {shouldShowLabels && accessKeyChars?.[index] && (
                        <AccessKeyLabel label={accessKeyChars[index]!} />
                    )}
                    {label}
                </Button>
            ))}
        </div>
    );
});