import { useReducedMotion } from 'motion/react';

const COLORS = ['#f6c453', '#ff2e43', '#fff', '#7eb6e6'];

/** Short burst. Renders nothing when the user prefers reduced motion. */
export const Confetti = ({ count = 18 }: { count?: number }) => {
    const calm = useReducedMotion();
    if (calm) return null;
    return (
        <div className="motion-confetti" aria-hidden>
            {Array.from({ length: count }, (_, index) => (
                <i key={index} style={{ left: `${(index * 17) % 100}%`, animationDelay: `${(index % 6) * 0.06}s`, background: COLORS[index % COLORS.length] }} />
            ))}
        </div>
    );
};
