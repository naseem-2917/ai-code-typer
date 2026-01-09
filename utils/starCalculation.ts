/**
 * Star Rating Calculation Utility
 * 
 * Calculates performance stars (1-5 integers only)
 * - No half-stars or decimals
 * - Weighted: 60% accuracy, 40% speed
 * - Realistic caps to prevent score inflation
 */

/**
 * Calculate star rating from performance metrics
 * 
 * @param wpm - Words per minute achieved
 * @param accuracy - Accuracy percentage (0-100)
 * @param goalWpm - Target WPM goal
 * @param goalAccuracy - Target accuracy goal
 * @returns Integer star rating (1-5)
 */
export function calculateStars(
    wpm: number,
    accuracy: number,
    goalWpm: number,
    goalAccuracy: number
): number {
    // Cap ratios to prevent artificial inflation
    const wpmRatio = Math.min(wpm / goalWpm, 1.2);      // Max 120% of goal
    const accRatio = Math.min(accuracy / goalAccuracy, 1.0); // Max 100% (no bonus)

    // Weighted calculation: 60% accuracy, 40% speed
    const rawScore = (accRatio * 0.6 + wpmRatio * 0.4) * 5;

    // Round to nearest integer (no half-stars)
    const stars = Math.round(rawScore);

    // Clamp strictly to 1-5 range
    return Math.min(Math.max(stars, 1), 5);
}

/**
 * Get motivational message based on star rating
 * 
 * @param stars - Star rating (1-5)
 * @returns Encouraging message
 */
export function getStarMessage(stars: number): string {
    switch (stars) {
        case 5:
            return "🌟 PERFECT! You're a typing master!";
        case 4:
            return "⭐ EXCELLENT! Outstanding performance!";
        case 3:
            return "👍 GREAT JOB! You're improving!";
        case 2:
            return "💪 GOOD TRY! Keep practicing!";
        default:
            return "🎯 KEEP GOING! You've got this!";
    }
}
