import React from 'react';

interface StarRatingProps {
    stars: number; // 1-5 integers only
    animated?: boolean;
}

/**
 * Star Rating Display Component
 * 
 * Displays 1-5 stars with smooth animations
 * - Proper SVG stars (not emoji)
 * - Filled stars: golden yellow with glow
 * - Unfilled stars: subtle gray outline
 */
export const StarRating: React.FC<StarRatingProps> = ({ stars, animated = false }) => {
    return (
        <div className="flex gap-3 mb-8 justify-center">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    filled={i <= stars}
                    delay={animated ? i * 150 : 0}
                    animated={animated}
                />
            ))}
        </div>
    );
};

interface StarProps {
    filled: boolean;
    delay: number;
    animated: boolean;
}

/**
 * Individual Star Component with SVG
 */
const Star: React.FC<StarProps> = ({ filled, delay, animated }) => {
    return (
        <div
            className="relative"
            style={{
                animation: animated && filled ? `star-pop 0.6s ease ${delay}ms both` : 'none',
            }}
        >
            {/* Add keyframes via style tag */}
            <style>{`
                @keyframes star-pop {
                    0% { transform: scale(0) rotate(-30deg); opacity: 0; }
                    50% { transform: scale(1.3) rotate(10deg); opacity: 1; }
                    70% { transform: scale(0.9) rotate(-5deg); }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes star-glow {
                    0%, 100% { filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.6)); }
                    50% { filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.9)); }
                }
                @keyframes unfilled-fade {
                    0% { opacity: 0; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                className={`transition-all duration-300 ${filled
                        ? 'drop-shadow-lg'
                        : ''
                    }`}
                style={{
                    animation: filled && animated
                        ? `star-glow 2s ease-in-out ${delay + 600}ms infinite`
                        : !filled && animated
                            ? `unfilled-fade 0.4s ease ${delay}ms both`
                            : 'none',
                }}
            >
                {filled ? (
                    /* Filled Star - Golden with gradient */
                    <>
                        <defs>
                            <linearGradient id={`starGradient-${delay}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fcd34d" />
                                <stop offset="50%" stopColor="#fbbf24" />
                                <stop offset="100%" stopColor="#f59e0b" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                            fill={`url(#starGradient-${delay})`}
                            stroke="#f59e0b"
                            strokeWidth="0.5"
                            strokeLinejoin="round"
                        />
                    </>
                ) : (
                    /* Unfilled Star - Gray outline */
                    <path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill="none"
                        stroke="#d1d5db"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                )}
            </svg>
        </div>
    );
};
