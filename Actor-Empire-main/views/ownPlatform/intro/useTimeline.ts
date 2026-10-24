import { useEffect, useRef, useState } from 'react';

export const usePrefersReducedMotion = () => {
    const [reduced, setReduced] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setReduced(media.matches);
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);
    return reduced;
};

/** rAF clock. `duration` is where reduced-motion lands (the held final scene). */
export const useTimeline = (duration: number) => {
    const reducedMotion = usePrefersReducedMotion();
    const tRef = useRef(reducedMotion ? duration : 0);
    const pausedRef = useRef(reducedMotion);
    const [t, setT] = useState(tRef.current);

    const seek = (next: number) => {
        tRef.current = Math.max(0, next);
        setT(tRef.current);
    };
    const pause = () => { pausedRef.current = true; };
    const play = () => { pausedRef.current = false; };

    useEffect(() => {
        if (reducedMotion) {
            tRef.current = duration;
            pausedRef.current = true;
            setT(duration);
            return;
        }
        let frame = 0;
        let last = performance.now();
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!pausedRef.current) {
                tRef.current += dt;
                setT(tRef.current);
            }
            frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frame);
    }, [duration, reducedMotion]);

    return { t, tRef, seek, pause, play, reducedMotion };
};
