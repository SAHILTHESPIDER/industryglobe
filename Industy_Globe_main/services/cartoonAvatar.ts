import type { CartoonFace } from '../types';

/**
 * Same illustrated face as the company officers in CartoonFace.tsx.
 * Hair, skin, and features come from a seed. These are not photographs.
 * The seed is a name only so the portrait stays stable. It is not a likeness.
 */

const SKIN = ['#F3C7A6', '#E0AC84', '#C68642', '#8D5524', '#F6D7B8', '#A86B45', '#6B3A22', '#D9A07A'];
const HAIR = ['#1C140F', '#3B2416', '#6B3E26', '#C9A227', '#E8E0D4', '#8B1E3F', '#2C3E50'];
const SHIRT = ['#1A1260', '#4F3BFF', '#E4B15A', '#123524', '#7F1D1D', '#0F2744', '#3F3F46', '#134E4A'];

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

/** Matches services/ownPlatform/executives.ts faceFor, without importing that module. */
export const cartoonFaceFor = (seed: string): CartoonFace => {
    const value = hashString(seed || 'face');
    return {
        skin: value % 8,
        hair: (value >> 3) % 7,
        hairStyle: (value >> 6) % 6,
        eyes: (value >> 9) % 4,
        mouth: (value >> 11) % 4,
        accessory: (value >> 13) % 4,
        shirt: (value >> 15) % 8,
    };
};

const hairPath = (style: number, hair: string): string => {
    if (style === 4) return `<circle cx="40" cy="36" r="22" fill="${hair}"/>`;
    if (style === 0) return `<path d="M22 40c0-16 8-24 18-24s18 8 18 24c-2-8-8-12-18-12s-16 4-18 12z" fill="${hair}"/>`;
    if (style === 1) return `<path d="M20 44c2-20 10-28 22-28 8 0 16 6 18 18-8-6-14-4-22 0-6 3-12 4-18 10z" fill="${hair}"/>`;
    if (style === 2) return `<path d="M18 52c0-22 8-32 22-32s22 10 22 32c-2-10-10-14-22-14S20 42 18 52z" fill="${hair}"/>`;
    if (style === 3) return `<path d="M24 38c2-14 10-22 16-22s14 8 16 22c-4-8-10-10-16-10s-12 2-16 10z" fill="${hair}"/><circle cx="54" cy="28" r="7" fill="${hair}"/>`;
    return `<ellipse cx="40" cy="30" rx="14" ry="5" fill="#F3C7A6" opacity="0.35"/>`;
};

const mouthPath = (mouth: number): string => {
    if (mouth === 1) return `<path d="M34 59h12" fill="none" stroke="#7a3b32" stroke-width="1.6" stroke-linecap="round"/>`;
    if (mouth === 2) return `<ellipse cx="40" cy="59" rx="4" ry="2.4" fill="#7a3b32"/>`;
    if (mouth === 3) return `<path d="M32 57q8 2 16 0" fill="none" stroke="#7a3b32" stroke-width="1.6" stroke-linecap="round"/>`;
    return `<path d="M33 58q7 6 14 0" fill="none" stroke="#7a3b32" stroke-width="1.6" stroke-linecap="round"/>`;
};

export const cartoonSvg = (face: CartoonFace): string => {
    const skin = SKIN[face.skin % SKIN.length];
    const hair = HAIR[face.hair % HAIR.length];
    const shirt = SHIRT[face.shirt % SHIRT.length];
    const style = face.hairStyle % 6;
    const eyes = face.eyes % 4;
    const mouth = face.mouth % 4;
    const accessory = face.accessory % 4;
    const pupil = eyes === 2 ? 1.4 : 2.1;
    const brow = eyes === 1 ? 0 : eyes === 3 ? 3 : 1.5;
    const eyeH = eyes === 0 ? 2 : 4.4;
    const glasses = accessory === 1
        ? `<g fill="none" stroke="#1c1917" stroke-width="1.6"><circle cx="32" cy="48" r="6.5"/><circle cx="48" cy="48" r="6.5"/><path d="M38.5 48h3"/></g>`
        : accessory === 2
            ? `<circle cx="59" cy="52" r="2" fill="#E4B15A"/>`
            : accessory === 3
                ? `<path d="M33 66h14l-7 6z" fill="#E4B15A"/>`
                : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img"><circle cx="40" cy="40" r="38" fill="${shirt}"/><path d="M18 62c6 12 38 12 44 0v16H18z" fill="${shirt}"/><path d="M24 58c4 8 28 8 32 0 2 10-4 16-16 16S22 68 24 58z" fill="#0c0e16" opacity="0.35"/><ellipse cx="40" cy="46" rx="18" ry="20" fill="${skin}"/><ellipse cx="22" cy="48" rx="4" ry="6" fill="${skin}"/><ellipse cx="58" cy="48" rx="4" ry="6" fill="${skin}"/>${hairPath(style, hair)}<ellipse cx="32" cy="48" rx="4.2" ry="${eyeH}" fill="#fff"/><ellipse cx="48" cy="48" rx="4.2" ry="${eyeH}" fill="#fff"/><circle cx="33" cy="48.5" r="${pupil}" fill="#1a120c"/><circle cx="49" cy="48.5" r="${pupil}" fill="#1a120c"/><circle cx="34" cy="47.6" r="0.7" fill="#fff"/><circle cx="50" cy="47.6" r="0.7" fill="#fff"/><path d="M28 ${44 - brow}q4-3 8 0" fill="none" stroke="${hair}" stroke-width="1.4" stroke-linecap="round"/><path d="M44 ${44 - brow}q4-3 8 0" fill="none" stroke="${hair}" stroke-width="1.4" stroke-linecap="round"/>${mouthPath(mouth)}${glasses}</svg>`;
};

const CACHE = new Map<string, string>();

/** Data-URL portrait from the existing cartoon face set. Safe for <img src>. */
export const cartoonAvatarUrl = (seed: string): string => {
    const key = seed || 'face';
    const cached = CACHE.get(key);
    if (cached) return cached;
    const url = `data:image/svg+xml;utf8,${encodeURIComponent(cartoonSvg(cartoonFaceFor(key)))}`;
    CACHE.set(key, url);
    return url;
};
