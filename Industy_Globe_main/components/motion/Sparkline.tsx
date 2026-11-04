import { motion, useReducedMotion } from 'motion/react';

/** Draws its line in. Pass the same series the static spark used. */
export const Sparkline = ({ values, color = '#ff2e43' }: { values: number[]; color?: string }) => {
    const calm = useReducedMotion();
    const max = Math.max(...values, 1);
    const w = 220;
    const h = 54;
    const pts = values.map((v, i) => [i * (w / Math.max(1, values.length - 1)), h - 4 - (v / max) * (h - 8)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
            <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={color} opacity=".18" />
            <motion.path d={d} fill="none" stroke={color} strokeWidth="2" initial={calm ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
        </svg>
    );
};
