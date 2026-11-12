import React from 'react';
import { CartoonFace as Face } from '../../types';

const SKIN = ['#F3C7A6', '#E0AC84', '#C68642', '#8D5524', '#F6D7B8', '#A86B45', '#6B3A22', '#D9A07A'];
const HAIR = ['#1C140F', '#3B2416', '#6B3E26', '#C9A227', '#E8E0D4', '#8B1E3F', '#2C3E50'];
const SHIRT = ['#1A1260', '#4F3BFF', '#E4B15A', '#123524', '#7F1D1D', '#0F2744', '#3F3F46', '#134E4A'];

interface Props {
    face: Face;
    size?: number;
    label?: string;
}

/** Drawn face. Hair, skin, and features come from the seed, never a photo. */
export const CartoonAvatar: React.FC<Props> = ({ face, size = 64, label }) => {
    const skin = SKIN[face.skin % SKIN.length];
    const hair = HAIR[face.hair % HAIR.length];
    const shirt = SHIRT[face.shirt % SHIRT.length];
    const style = face.hairStyle % 6;
    const eyes = face.eyes % 4;
    const mouth = face.mouth % 4;
    const accessory = face.accessory % 4;
    const pupil = eyes === 2 ? 1.4 : 2.1;
    const brow = eyes === 1 ? 0 : eyes === 3 ? 3 : 1.5;
    return (
        <svg
            className="cartoon"
            width={size}
            height={size}
            viewBox="0 0 80 80"
            role="img"
            aria-label={label || 'Illustrated portrait'}
        >
            <circle cx="40" cy="40" r="38" fill={shirt} />
            <path d="M18 62c6 12 38 12 44 0v16H18z" fill={shirt} />
            <path d="M24 58c4 8 28 8 32 0 2 10-4 16-16 16S22 68 24 58z" fill="#0c0e16" opacity="0.35" />
            <ellipse cx="40" cy="46" rx="18" ry="20" fill={skin} />
            <ellipse cx="22" cy="48" rx="4" ry="6" fill={skin} />
            <ellipse cx="58" cy="48" rx="4" ry="6" fill={skin} />
            {style === 4 && <circle cx="40" cy="36" r="22" fill={hair} />}
            {style === 0 && <path d="M22 40c0-16 8-24 18-24s18 8 18 24c-2-8-8-12-18-12s-16 4-18 12z" fill={hair} />}
            {style === 1 && <path d="M20 44c2-20 10-28 22-28 8 0 16 6 18 18-8-6-14-4-22 0-6 3-12 4-18 10z" fill={hair} />}
            {style === 2 && <path d="M18 52c0-22 8-32 22-32s22 10 22 32c-2-10-10-14-22-14S20 42 18 52z" fill={hair} />}
            {style === 3 && (
                <>
                    <path d="M24 38c2-14 10-22 16-22s14 8 16 22c-4-8-10-10-16-10s-12 2-16 10z" fill={hair} />
                    <circle cx="54" cy="28" r="7" fill={hair} />
                </>
            )}
            {style === 5 && <ellipse cx="40" cy="30" rx="14" ry="5" fill={skin} opacity="0.35" />}
            <g className="eyes">
                <ellipse cx="32" cy="48" rx="4.2" ry={eyes === 0 ? 2 : 4.4} fill="#fff" />
                <ellipse cx="48" cy="48" rx="4.2" ry={eyes === 0 ? 2 : 4.4} fill="#fff" />
                <circle cx="33" cy="48.5" r={pupil} fill="#1a120c" />
                <circle cx="49" cy="48.5" r={pupil} fill="#1a120c" />
                <circle cx="34" cy="47.6" r="0.7" fill="#fff" />
                <circle cx="50" cy="47.6" r="0.7" fill="#fff" />
            </g>
            <path d={`M28 ${44 - brow}q4-3 8 0`} fill="none" stroke={hair} strokeWidth="1.4" strokeLinecap="round" />
            <path d={`M44 ${44 - brow}q4-3 8 0`} fill="none" stroke={hair} strokeWidth="1.4" strokeLinecap="round" />
            {mouth === 0 && <path d="M33 58q7 6 14 0" fill="none" stroke="#7a3b32" strokeWidth="1.6" strokeLinecap="round" />}
            {mouth === 1 && <path d="M34 59h12" fill="none" stroke="#7a3b32" strokeWidth="1.6" strokeLinecap="round" />}
            {mouth === 2 && <ellipse cx="40" cy="59" rx="4" ry="2.4" fill="#7a3b32" />}
            {mouth === 3 && <path d="M32 57q8 2 16 0" fill="none" stroke="#7a3b32" strokeWidth="1.6" strokeLinecap="round" />}
            {accessory === 1 && (
                <g fill="none" stroke="#1c1917" strokeWidth="1.6">
                    <circle cx="32" cy="48" r="6.5" />
                    <circle cx="48" cy="48" r="6.5" />
                    <path d="M38.5 48h3" />
                </g>
            )}
            {accessory === 2 && <circle cx="59" cy="52" r="2" fill="#E4B15A" />}
            {accessory === 3 && <path d="M33 66h14l-7 6z" fill="#E4B15A" />}
        </svg>
    );
};
