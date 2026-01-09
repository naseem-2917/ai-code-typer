/**
 * Finger Mapping Utility
 * 
 * Maps each keyboard key to the correct hand and finger
 * Based on standard touch typing technique
 */

export type Finger = 'pinky' | 'ring' | 'middle' | 'index' | 'thumb';
export type Hand = 'left' | 'right';

export interface FingerInfo {
    hand: Hand;
    finger: Finger;
    color: string;
    row: number; // 0 = number row, 1 = top, 2 = home, 3 = bottom
}

// Color scheme for each finger
const FINGER_COLORS = {
    pinky: '#ef4444',   // Red
    ring: '#f97316',    // Orange
    middle: '#eab308',  // Yellow
    index: '#22c55e',   // Green
    thumb: '#8b5cf6',   // Purple
};

// Complete keyboard mapping
const fingerMap: Record<string, FingerInfo> = {
    // === LEFT HAND ===

    // Left Pinky - Row 0 (Numbers)
    '`': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    '~': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    '1': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    '!': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },

    // Left Pinky - Letters
    'q': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    'a': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 2 },
    'z': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 3 },

    // Left Ring
    '2': { hand: 'left', finger: 'ring', color: FINGER_COLORS.ring, row: 0 },
    '@': { hand: 'left', finger: 'ring', color: FINGER_COLORS.ring, row: 0 },
    'w': { hand: 'left', finger: 'ring', color: FINGER_COLORS.ring, row: 1 },
    's': { hand: 'left', finger: 'ring', color: FINGER_COLORS.ring, row: 2 },
    'x': { hand: 'left', finger: 'ring', color: FINGER_COLORS.ring, row: 3 },

    // Left Middle
    '3': { hand: 'left', finger: 'middle', color: FINGER_COLORS.middle, row: 0 },
    '#': { hand: 'left', finger: 'middle', color: FINGER_COLORS.middle, row: 0 },
    'e': { hand: 'left', finger: 'middle', color: FINGER_COLORS.middle, row: 1 },
    'd': { hand: 'left', finger: 'middle', color: FINGER_COLORS.middle, row: 2 },
    'c': { hand: 'left', finger: 'middle', color: FINGER_COLORS.middle, row: 3 },

    // Left Index (includes reach keys)
    '4': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    '$': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    '5': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    '%': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    'r': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 1 },
    't': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 1 },
    'f': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 2 },
    'g': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 2 },
    'v': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 3 },
    'b': { hand: 'left', finger: 'index', color: FINGER_COLORS.index, row: 3 },

    // === RIGHT HAND ===

    // Right Index (includes reach keys)
    '6': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    '^': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    '7': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    '&': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 0 },
    'y': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 1 },
    'u': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 1 },
    'h': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 2 },
    'j': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 2 },
    'n': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 3 },
    'm': { hand: 'right', finger: 'index', color: FINGER_COLORS.index, row: 3 },

    // Right Middle
    '8': { hand: 'right', finger: 'middle', color: FINGER_COLORS.middle, row: 0 },
    '*': { hand: 'right', finger: 'middle', color: FINGER_COLORS.middle, row: 0 },
    'i': { hand: 'right', finger: 'middle', color: FINGER_COLORS.middle, row: 1 },
    'k': { hand: 'right', finger: 'middle', color: FINGER_COLORS.middle, row: 2 },
    ',': { hand: 'right', finger: 'middle', color: FINGER_COLORS.middle, row: 3 },
    '<': { hand: 'right', finger: 'middle', color: FINGER_COLORS.middle, row: 3 },

    // Right Ring
    '9': { hand: 'right', finger: 'ring', color: FINGER_COLORS.ring, row: 0 },
    '(': { hand: 'right', finger: 'ring', color: FINGER_COLORS.ring, row: 0 },
    'o': { hand: 'right', finger: 'ring', color: FINGER_COLORS.ring, row: 1 },
    'l': { hand: 'right', finger: 'ring', color: FINGER_COLORS.ring, row: 2 },
    '.': { hand: 'right', finger: 'ring', color: FINGER_COLORS.ring, row: 3 },
    '>': { hand: 'right', finger: 'ring', color: FINGER_COLORS.ring, row: 3 },

    // Right Pinky
    '0': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    ')': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    '-': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    '_': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    '=': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    '+': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 0 },
    'p': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    '[': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    '{': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    ']': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    '}': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    '\\': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    '|': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },
    ';': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 2 },
    ':': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 2 },
    "'": { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 2 },
    '"': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 2 },
    '/': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 3 },
    '?': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 3 },

    // === THUMBS (Spacebar) ===
    ' ': { hand: 'right', finger: 'thumb', color: FINGER_COLORS.thumb, row: 4 },

    // === SPECIAL KEYS ===
    '\n': { hand: 'right', finger: 'pinky', color: FINGER_COLORS.pinky, row: 2 }, // Enter
    '\t': { hand: 'left', finger: 'pinky', color: FINGER_COLORS.pinky, row: 1 },  // Tab
};

/**
 * Get finger info for a given character
 */
export function getFingerInfo(char: string): FingerInfo | null {
    const key = char.toLowerCase();

    // Check if we have mapping for lowercase
    if (fingerMap[key]) {
        return fingerMap[key];
    }

    // Check original (for special chars)
    if (fingerMap[char]) {
        return fingerMap[char];
    }

    return null;
}

/**
 * Get all finger colors
 */
export function getFingerColors() {
    return FINGER_COLORS;
}
