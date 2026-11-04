import { motion, useReducedMotion } from 'motion/react';

/** Premiere-style countdown. Pulses only when the count has reached zero. */
export const CountdownMark = ({ weeks, unit = 'w', ready = 'Premiering now', waiting = 'Date not set', caption = 'premiere' }: {
    weeks: number | null;
    unit?: string;
    ready?: string;
    waiting?: string;
    caption?: string;
}) => {
    const calm = useReducedMotion();
    const label = weeks == null ? waiting : weeks <= 0 ? ready : `${weeks}${unit}`;
    return (
        <motion.div className="motion-countdown" animate={calm || weeks == null || weeks > 0 ? undefined : { scale: [1, 1.04, 1] }} transition={{ repeat: weeks === 0 ? 3 : 0, duration: 0.6 }}>
            <b>{label}</b>
            <small>{weeks != null && weeks > 0 ? `until the ${caption}` : caption}</small>
        </motion.div>
    );
};
