import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { formatCompact, formatMoney } from './bits';
import './motion.css';

interface HapticsPlugin {
    impact(options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
}

const Haptics = registerPlugin<HapticsPlugin>('Haptics');

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Native haptic when the Capacitor plugin is installed. A short vibration otherwise. */
export const tap = (style: 'LIGHT' | 'MEDIUM' | 'HEAVY' = 'LIGHT') => {
    if (reduced()) return;
    if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style }).catch(() => undefined);
        return;
    }
    navigator.vibrate?.(style === 'HEAVY' ? 22 : 10);
};

export const RollNumber = ({ value, money = false }: { value: number; money?: boolean }) => {
    const calm = useReducedMotion();
    const [shown, setShown] = useState(calm ? value : 0);
    useEffect(() => {
        if (calm) {
            setShown(value);
            return;
        }
        const from = shown;
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const t = Math.min(1, (now - start) / 650);
            const eased = 1 - Math.pow(1 - t, 3);
            setShown(Math.round(from + (value - from) * eased));
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, calm]);
    return <>{money ? formatMoney(shown) : formatCompact(shown)}</>;
};

export const Confetti = () => {
    const calm = useReducedMotion();
    if (calm) return null;
    const bits = Array.from({ length: 18 }, (_, index) => index);
    return (
        <div className="yt-confetti" aria-hidden>
            {bits.map(index => <i key={index} style={{ left: `${(index * 17) % 100}%`, animationDelay: `${(index % 6) * 0.06}s`, background: ['#f6c453', '#ff2e43', '#fff', '#7eb6e6'][index % 4] }} />)}
        </div>
    );
};

export const ScreenFade = ({ screen, children }: { screen: string; children: React.ReactNode }) => {
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

export const SubscribeTap = ({ on, children, className, onClick, subscribeId, ...label }: { on: boolean; children: React.ReactNode; className?: string; onClick?: () => void; subscribeId?: string; 'aria-label'?: string }) => {
    const calm = useReducedMotion();
    return (
        <motion.button
            className={className}
            onClick={onClick}
            data-yt-subscribe={subscribeId}
            aria-label={label['aria-label']}
            whileTap={calm ? undefined : { scale: 0.9 }}
            animate={calm ? undefined : { scale: on ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 0.22 }}
        >
            {children}
        </motion.button>
    );
};

export const LikeBurst = ({ on, children, className, onClick }: { on: boolean; children: React.ReactNode; className?: string; onClick?: () => void }) => {
    const calm = useReducedMotion();
    return (
        <motion.button className={className} onClick={onClick} whileTap={calm ? undefined : { scale: 0.88 }} animate={calm || !on ? undefined : { scale: [1, 1.16, 1] }} transition={{ duration: 0.2 }}>
            {on && !calm ? <span className="yt-heart" aria-hidden>♥</span> : null}
            {children}
        </motion.button>
    );
};

export const AnimatedSpark = ({ values, color = '#ff2e43' }: { values: number[]; color?: string }) => {
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

export const PremiereCountdown = ({ weeks }: { weeks: number | null }) => {
    const calm = useReducedMotion();
    const label = weeks == null ? 'Date not set' : weeks <= 0 ? 'Premiering now' : `${weeks}w`;
    return (
        <motion.div className="yt-premiere" animate={calm || weeks == null || weeks > 0 ? undefined : { scale: [1, 1.04, 1] }} transition={{ repeat: weeks === 0 ? 3 : 0, duration: 0.6 }}>
            <b>{label}</b>
            <small>{weeks != null && weeks > 0 ? 'until the premiere' : 'premiere'}</small>
        </motion.div>
    );
};

export const useAwardHaptic = () => {
    useEffect(() => { tap('HEAVY'); }, []);
};
