import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/** Fast cross-fade between screens. The key should change when the screen changes. */
export const ScreenFade = ({ screen, children }: { screen: string; children: ReactNode }) => {
    const calm = useReducedMotion();
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={screen}
                initial={calm ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={calm ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};
