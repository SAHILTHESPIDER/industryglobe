import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** Rolls a number up. Pass `format` for money or compact labels. */
export const CountUp = ({ value, format = (next: number) => String(next), duration = 650 }: { value: number; format?: (value: number) => string; duration?: number }) => {
    const calm = useReducedMotion();
    const [shown, setShown] = useState(calm ? value : 0);
    const shownRef = useRef(shown);
    useEffect(() => {
        if (calm) {
            shownRef.current = value;
            setShown(value);
            return;
        }
        const from = shownRef.current;
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const next = Math.round(from + (value - from) * eased);
            shownRef.current = next;
            setShown(next);
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, calm, duration]);
    return <>{format(shown)}</>;
};
