import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';

interface KeyboardProps {
    nextKey: string;
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

const Keyboard: React.FC<KeyboardProps> = ({ nextKey }) => {
    const context = useContext(AppContext);
    if (!context) throw new Error("AppContext not found");
    const { showHandGuide } = context;

    const isShifted = /[A-Z]/.test(nextKey) || Object.keys(shiftMap).includes(nextKey);
    const currentRows = isShifted ? shiftKeyRows : keyRows;
    const keyToHighlight = specialKeys[nextKey] || nextKey;

    let shiftToHighlight: 'left' | 'right' | 'none' = 'none';
    if (isShifted) {
        const baseKey = shiftMap[nextKey] || nextKey.toLowerCase();
        if (leftHandBaseKeys.has(baseKey)) shiftToHighlight = 'right';
        else if (rightHandBaseKeys.has(baseKey)) shiftToHighlight = 'left';
    }

    const getKeyColorClass = (key: string) => {
        const finger = keyToFingerMap[key];
        return finger ? fingerColorClasses[finger] : fingerColorClasses['special'];
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 bg-slate-200 dark:bg-slate-800 rounded-lg shadow-lg">
            <div className="flex flex-col gap-1 sm:gap-2">
                {currentRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-1 sm:gap-2 w-full justify-center">
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

                            if (isSpacebar) {
                                return (
                                    <div
                                        key={`${rowIndex}-${keyIndex}`}
                                        className={`h-12 rounded-md transition-all duration-100 ${keyWidths[key]} ${isHighlighted
                                                ? 'key-highlight shadow-lg scale-105 animate-key-glow'
                                                : showHandGuide ? fingerColorClasses['thumb'] : colorClass
                                            }`}
                                    />
                                );
                            }

                            return (
                                <div
                                    key={`${rowIndex}-${keyIndex}`}
                                    className={`
                                        h-12 flex-1 flex items-center justify-center 
                                        rounded-md font-sans text-sm sm:text-base font-medium
                                        transition-all duration-100 select-none
                                        ${keyWidths[key] || 'min-w-[2rem] sm:min-w-[2.5rem]'}
                                        ${isHighlighted
                                            ? 'key-highlight shadow-lg scale-110 -translate-y-1 animate-key-glow'
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