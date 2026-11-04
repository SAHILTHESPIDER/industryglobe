import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface HapticsPlugin {
    impact(options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
}

const Haptics = registerPlugin<HapticsPlugin>('Haptics');

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Capacitor haptic when the native plugin is installed. A short vibration on the web. */
export const tap = (style: 'LIGHT' | 'MEDIUM' | 'HEAVY' = 'LIGHT') => {
    if (prefersReducedMotion()) return;
    if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style }).catch(() => undefined);
        return;
    }
    navigator.vibrate?.(style === 'HEAVY' ? 22 : 10);
};

export const useLightHaptic = () => {
    useEffect(() => { tap('LIGHT'); }, []);
};
