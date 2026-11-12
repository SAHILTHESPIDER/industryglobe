import React from 'react';
import { PlatformBrand } from '../../types';
import { brandAccent, markById, typefaceById } from '../../services/ownPlatform/brand';
import { BrandMark } from './BrandMark';

interface Props {
    brand: PlatformBrand;
    name: string;
    size?: 'sm' | 'md' | 'lg';
}

const shown = (name: string) => {
    const clean = (name.trim() || 'EMPIRE').toUpperCase();
    return clean.endsWith('+') ? clean : `${clean}+`;
};

/** One of the four lockups, using the chosen mark and typeface. */
export const BrandLockup: React.FC<Props> = ({ brand, name, size = 'md' }) => {
    const mark = markById(brand.markId);
    const face = typefaceById(brand.typefaceId);
    const accent = brandAccent(brand);
    const label = shown(name);
    const markSize = size === 'lg' ? 42 : size === 'sm' ? 18 : 28;
    const fontSize = size === 'lg' ? 40 : size === 'sm' ? 16 : 26;
    const text: React.CSSProperties = {
        fontFamily: face.css,
        fontWeight: 800,
        fontSize,
        lineHeight: 0.9,
        letterSpacing: brand.typefaceId === 'mono' ? '-0.04em' : '0.01em',
        textTransform: 'uppercase',
        color: accent,
    };
    const icon = <BrandMark id={mark.id} color={accent} size={markSize} letter={label} />;

    if (brand.lockupId === 'word') {
        return <div style={{ ...text, borderBottom: `3px solid ${accent}`, paddingBottom: 4, display: 'inline-block' }}>{label}</div>;
    }
    if (brand.lockupId === 'stacked') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                {icon}
                <div style={text}>{label}</div>
            </div>
        );
    }
    if (brand.lockupId === 'badge') {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: size === 'sm' ? '4px 8px' : '8px 12px', borderRadius: 999, background: mark.ink, border: `1px solid ${accent}` }}>
                {icon}
                <div style={{ ...text, fontSize: Math.max(14, fontSize * 0.55) }}>{label}</div>
            </div>
        );
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon}
            <div style={text}>{label}</div>
        </div>
    );
};
