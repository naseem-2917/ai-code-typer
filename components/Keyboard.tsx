import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

interface KeyboardProps {
    nextKey: string;
    activeKey?: string;
    isShiftActive?: boolean;
    showHandGuide?: boolean;
}

const keyRows = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
    [' '],
];

const shiftKeyRows = [
    ['~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', 'Backspace'],
    ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}', '|'],
    ['CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"', 'Enter'],
    ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?', 'Shift'],
    [' '],
];

const specialKeys: { [key: string]: string } = {
    ' ': ' ', '\n': 'Enter', '\t': 'Tab',
};

const leftHandBaseKeys = new Set(['`', '1', '2', '3', '4', '5', 'q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b']);
const rightHandBaseKeys = new Set(['6', '7', '8', '9', '0', '-', '=', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\', 'h', 'j', 'k', 'l', ';', "'", 'n', 'm', ',', '.', '/']);

const shiftMap: { [key: string]: string } = {
    '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
    '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=',
    '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/'
};

const keyWidths: { [key: string]: string } = {
    Backspace: 'flex-grow-[2]', Tab: 'flex-grow-[1.5]', '\\': 'flex-grow-[1.5]',
    '|': 'flex-grow-[1.5]', CapsLock: 'flex-grow-[1.8]', Enter: 'flex-grow-[2.2]',
    Shift: 'flex-grow-[2.5]', ' ': 'flex-grow-[8]'
};

const keyToFingerMap: { [key: string]: string } = {
    // Left Hand - Pinky
    '`': 'left-pinky', '~': 'left-pinky',
    '1': 'left-pinky', '!': 'left-pinky',
    'Tab': 'left-pinky',
    'q': 'left-pinky', 'Q': 'left-pinky',
    'CapsLock': 'left-pinky',
    'a': 'left-pinky', 'A': 'left-pinky',
    'Shift_left': 'left-pinky',
    'z': 'left-pinky', 'Z': 'left-pinky',

    // Left Hand - Ring
    '2': 'left-ring', '@': 'left-ring',
    'w': 'left-ring', 'W': 'left-ring',
    's': 'left-ring', 'S': 'left-ring',
    'x': 'left-ring', 'X': 'left-ring',

    // Left Hand - Middle
    '3': 'left-middle', '#': 'left-middle',
    'e': 'left-middle', 'E': 'left-middle',
    'd': 'left-middle', 'D': 'left-middle',
    'c': 'left-middle', 'C': 'left-middle',

    // Left Hand - Index
    '4': 'left-index', '$': 'left-index',
    'r': 'left-index', 'R': 'left-index',
    'f': 'left-index', 'F': 'left-index',
    'v': 'left-index', 'V': 'left-index',
    '5': 'left-index', '%': 'left-index',
    't': 'left-index', 'T': 'left-index',
    'g': 'left-index', 'G': 'left-index',
    'b': 'left-index', 'B': 'left-index',

    // Right Hand - Index
    '6': 'right-index', '^': 'right-index',
    'y': 'right-index', 'Y': 'right-index',
    'h': 'right-index', 'H': 'right-index',
    'n': 'right-index', 'N': 'right-index',
    '7': 'right-index', '&': 'right-index',
    'u': 'right-index', 'U': 'right-index',
    'j': 'right-index', 'J': 'right-index',
    'm': 'right-index', 'M': 'right-index',

    // Right Hand - Middle
    '8': 'right-middle', '*': 'right-middle',
    'i': 'right-middle', 'I': 'right-middle',
    'k': 'right-middle', 'K': 'right-middle',
    ',': 'right-middle', '<': 'right-middle',

    // Right Hand - Ring
    '9': 'right-ring', '(': 'right-ring',
    'o': 'right-ring', 'O': 'right-ring',
    'l': 'right-ring', 'L': 'right-ring',
    '.': 'right-ring', '>': 'right-ring',

    // Right Hand - Pinky
    '0': 'right-pinky', ')': 'right-pinky',
    '-': 'right-pinky', '_': 'right-pinky',
    '=': 'right-pinky', '+': 'right-pinky',
    'Backspace': 'right-pinky',
    'p': 'right-pinky', 'P': 'right-pinky',
    '[': 'right-pinky', '{': 'right-pinky',
    ']': 'right-pinky', '}': 'right-pinky',
    '\\': 'right-pinky', '|': 'right-pinky',
    'Enter': 'right-pinky',
    ';': 'right-pinky', ':': 'right-pinky',
    "'": 'right-pinky', '"': 'right-pinky',
    'Shift_right': 'right-pinky',
    '/': 'right-pinky', '?': 'right-pinky',

    // Thumbs
    ' ': 'thumb',
};

const fingerColorClasses: { [key: string]: string } = {
    'left-pinky': 'bg-blue-500 text-white',
    'left-ring': 'bg-green-500 text-white',
    'left-middle': 'bg-yellow-500 text-black',
    'left-index': 'bg-red-500 text-white',
    'thumb': 'bg-purple-500 text-white',
    'right-index': 'bg-red-500 text-white',
    'right-middle': 'bg-yellow-500 text-black',
    'right-ring': 'bg-green-500 text-white',
    'right-pinky': 'bg-blue-500 text-white',
    'special': 'bg-slate-300 dark:bg-slate-600'
};

const Keyboard: React.FC<KeyboardProps> = ({ nextKey, activeKey, isShiftActive: propIsShiftActive, showHandGuide: propShowHandGuide }) => {
    const context = useContext(AppContext);
    const showHandGuide = propShowHandGuide ?? context?.showHandGuide ?? true;

    const targetKey = activeKey ?? nextKey;

    const isShifted = propIsShiftActive ?? (/[A-Z!@#$%^&*()_+{}|:"<>?~]/.test(targetKey) || Object.keys(shiftMap).includes(targetKey));
    const currentRows = isShifted ? shiftKeyRows : keyRows;

    let keyToHighlight = targetKey;
    if (targetKey === ' ') keyToHighlight = ' ';
    if (targetKey === '\n') keyToHighlight = 'Enter';
    if (targetKey === '\t') keyToHighlight = 'Tab';

    let shiftToHighlight: 'left' | 'right' | 'none' = 'none';
    if (isShifted) {
        const baseKey = shiftMap[targetKey] || targetKey.toLowerCase();
        if (leftHandBaseKeys.has(baseKey)) shiftToHighlight = 'right';
        else if (rightHandBaseKeys.has(baseKey)) shiftToHighlight = 'left';
    }

    const getKeyColorClass = (key: string) => {
        const finger = keyToFingerMap[key];
        return finger ? fingerColorClasses[finger] : fingerColorClasses['special'];
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-1 sm:p-2 bg-slate-200 dark:bg-slate-800 rounded-lg shadow-lg">
            <div className="flex flex-col gap-1">
                {currentRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1 w-full justify-center">
                        {row.map((key, keyIndex) => {
                            let isHighlighted = keyToHighlight === key;

                            let keyIdentifier = key;
                            if (key === 'Shift') {
                                const isLeftShift = keyIndex === 0;
                                keyIdentifier = isLeftShift ? 'Shift_left' : 'Shift_right';

                                if (isShifted) {
                                    if (isLeftShift && shiftToHighlight === 'left') isHighlighted = true;
                                    if (!isLeftShift && shiftToHighlight === 'right') isHighlighted = true;
                                }
                            }

                            const isSpacebar = key === ' ';
                            const colorClass = showHandGuide
                                ? getKeyColorClass(keyIdentifier)
                                : 'bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm';

                            const highlightClass = 'bg-[#3A3A3A] text-white dark:bg-[#E5E5E5] dark:text-black shadow-lg scale-105 ring-2 ring-primary-300 dark:ring-primary-700 z-10';

                            if (isSpacebar) {
                                return (
                                    <div
                                        key={`${rowIndex}-${keyIndex}`}
                                        className={`h-8 sm:h-10 md:h-12 rounded-md transition-all duration-100 flex-shrink-0 ${keyWidths[key]} ${isHighlighted
                                            ? highlightClass + ' animate-pulse'
                                            : showHandGuide ? fingerColorClasses['thumb'] : colorClass
                                            }`}
                                    />
                                );
                            }

                            return (
                                <div
                                    key={`${rowIndex}-${keyIndex}`}
                                    className={`
                                        h-8 sm:h-10 md:h-12 flex-1 flex items-center justify-center 
                                        rounded-md font-sans text-sm sm:text-base font-medium
                                        transition-all duration-100 select-none flex-shrink-0
                                        ${keyWidths[key] || 'min-w-[1.5rem] sm:min-w-[2rem] md:min-w-[2.5rem]'}
                                        ${isHighlighted
                                            ? highlightClass
                                            : colorClass
                                        }
                                    `}
                                >
                                    {key}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Keyboard;