import { CartoonFace } from '../types';

export const PORTRAIT_SKIN = ['#F3C7A6', '#E0AC84', '#C68642', '#8D5524', '#F6D7B8', '#A86B45', '#6B3A22', '#D9A07A'];
export const PORTRAIT_HAIR = ['#1C140F', '#3B2416', '#6B3E26', '#C9A227', '#E8E0D4', '#8B1E3F', '#2C3E50'];
export const PORTRAIT_SHIRT = ['#1A1260', '#4F3BFF', '#E4B15A', '#123524', '#7F1D1D', '#0F2744', '#3F3F46', '#134E4A'];

export const DEFAULT_FACE: CartoonFace = {
    skin: 0,
    hair: 1,
    hairStyle: 0,
    eyes: 0,
    mouth: 0,
    accessory: 0,
    shirt: 1,
};

const at = <T,>(list: T[], index: number) => list[((index % list.length) + list.length) % list.length];

/** Same drawing as the in-game cartoon face, as an SVG string the rest of the app can use as an image. */
export const cartoonSvg = (face: CartoonFace, size = 80): string => {
    const skin = at(PORTRAIT_SKIN, face.skin || 0);
    const hair = at(PORTRAIT_HAIR, face.hair || 0);
    const shirt = at(PORTRAIT_SHIRT, face.shirt || 0);
    const style = Math.abs(face.hairStyle || 0) % 6;
    const eyes = Math.abs(face.eyes || 0) % 4;
    const mouth = Math.abs(face.mouth || 0) % 4;
    const accessory = Math.abs(face.accessory || 0) % 4;
    const pupil = eyes === 2 ? 1.4 : 2.1;
    const brow = eyes === 1 ? 0 : eyes === 3 ? 3 : 1.5;
    const eyeH = eyes === 0 ? 2 : 4.4;
    const hairPath = style === 4
        ? `<circle cx="40" cy="36" r="22" fill="${hair}"/>`
        : style === 0
            ? `<path d="M22 40c0-16 8-24 18-24s18 8 18 24c-2-8-8-12-18-12s-16 4-18 12z" fill="${hair}"/>`
            : style === 1
                ? `<path d="M20 44c2-20 10-28 22-28 8 0 16 6 18 18-8-6-14-4-22 0-6 3-12 4-18 10z" fill="${hair}"/>`
                : style === 2
                    ? `<path d="M18 52c0-22 8-32 22-32s22 10 22 32c-2-10-10-14-22-14S20 42 18 52z" fill="${hair}"/>`
                    : style === 3
                        ? `<path d="M24 38c2-14 10-22 16-22s14 8 16 22c-4-8-10-10-16-10s-12 2-16 10z" fill="${hair}"/><circle cx="54" cy="28" r="7" fill="${hair}"/>`
                        : `<ellipse cx="40" cy="30" rx="14" ry="5" fill="${skin}" opacity="0.35"/>`;
    const mouthPath = mouth === 0
        ? `<path d="M33 58q7 6 14 0" fill="none" stroke="#7a3b32" stroke-width="1.6" stroke-linecap="round"/>`
        : mouth === 1
            ? `<path d="M34 59h12" fill="none" stroke="#7a3b32" stroke-width="1.6" stroke-linecap="round"/>`
            : mouth === 2
                ? `<ellipse cx="40" cy="59" rx="4" ry="2.4" fill="#7a3b32"/>`
                : `<path d="M32 57q8 2 16 0" fill="none" stroke="#7a3b32" stroke-width="1.6" stroke-linecap="round"/>`;
    const accessoryPath = accessory === 1
        ? `<g fill="none" stroke="#1c1917" stroke-width="1.6"><circle cx="32" cy="48" r="6.5"/><circle cx="48" cy="48" r="6.5"/><path d="M38.5 48h3"/></g>`
        : accessory === 2
            ? `<circle cx="59" cy="52" r="2" fill="#E4B15A"/>`
            : accessory === 3
                ? `<path d="M33 66h14l-7 6z" fill="#E4B15A"/>`
                : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" class="cartoon" width="${size}" height="${size}" viewBox="0 0 80 80" role="img" aria-label="Illustrated portrait"><circle cx="40" cy="40" r="38" fill="${shirt}"/><path d="M18 62c6 12 38 12 44 0v16H18z" fill="${shirt}"/><path d="M24 58c4 8 28 8 32 0 2 10-4 16-16 16S22 68 24 58z" fill="#0c0e16" opacity="0.35"/><ellipse cx="40" cy="46" rx="18" ry="20" fill="${skin}"/><ellipse cx="22" cy="48" rx="4" ry="6" fill="${skin}"/><ellipse cx="58" cy="48" rx="4" ry="6" fill="${skin}"/>${hairPath}<g class="eyes"><ellipse cx="32" cy="48" rx="4.2" ry="${eyeH}" fill="#fff"/><ellipse cx="48" cy="48" rx="4.2" ry="${eyeH}" fill="#fff"/><circle cx="33" cy="48.5" r="${pupil}" fill="#1a120c"/><circle cx="49" cy="48.5" r="${pupil}" fill="#1a120c"/><circle cx="34" cy="47.6" r="0.7" fill="#fff"/><circle cx="50" cy="47.6" r="0.7" fill="#fff"/></g><path d="M28 ${44 - brow}q4-3 8 0" fill="none" stroke="${hair}" stroke-width="1.4" stroke-linecap="round"/><path d="M44 ${44 - brow}q4-3 8 0" fill="none" stroke="${hair}" stroke-width="1.4" stroke-linecap="round"/>${mouthPath}${accessoryPath}</svg>`;
};

export const cartoonDataUrl = (face: CartoonFace, size = 160): string =>
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(cartoonSvg(face, size))}`;
