import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Tap bounce. Set `heart` for a like pop. Reduced motion keeps a plain button. */
export const BounceButton = ({
    on = false, heart = false, className, onClick, children, subscribeId, label,
}: {
    on?: boolean;
    heart?: boolean;
    className?: string;
    onClick?: () => void;
    children: ReactNode;
    subscribeId?: string;
    label?: string;
}) => {
    const calm = useReducedMotion();
    return (
        <motion.button
            className={className}
            onClick={onClick}
            data-yt-subscribe={subscribeId}
            aria-label={label}
            whileTap={calm ? undefined : { scale: heart ? 0.88 : 0.9 }}
            animate={calm ? undefined : { scale: on ? [1, heart ? 1.16 : 1.08, 1] : 1 }}
            transition={{ duration: heart ? 0.2 : 0.22 }}
        >
            {heart && on && !calm ? <span className="motion-heart" aria-hidden>♥</span> : null}
            {children}
        </motion.button>
    );
};
