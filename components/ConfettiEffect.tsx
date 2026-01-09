import React, { useEffect, useState } from 'react';

/**
 * Confetti Effect Component
 * 
 * Displays celebration confetti animation
 * - Triggers on high scores (4-5 stars)
 * - Lightweight CSS animation
 * - Auto-cleanup after 3 seconds
 */
export const ConfettiEffect: React.FC = () => {
    const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

    useEffect(() => {
        // Generate random confetti particles
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
        const newParticles = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.5,
            color: colors[Math.floor(Math.random() * colors.length)],
        }));

        setParticles(newParticles);

        // Cleanup after animation
        const timeout = setTimeout(() => {
            setParticles([]);
        }, 3000);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-50">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute w-2 h-2 rounded-full animate-confetti"
                    style={{
                        left: `${particle.left}%`,
                        top: '-10px',
                        backgroundColor: particle.color,
                        animationDelay: `${particle.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};
