import React from 'react';
import { PlatformBrand } from '../../types';
import { brandAccent, frameById, markById, typefaceById } from '../../services/ownPlatform/brand';
import { BrandMark } from './BrandMark';

interface Props {
    brand: PlatformBrand;
    name: string;
    size?: 'sm' | 'md' | 'lg';
    locked?: boolean;
}

const shown = (name: string) => {
    const clean = (name.trim() || 'EMPIRE').toUpperCase();
    return clean.endsWith('+') ? clean : `${clean}+`;
};

/** One of the four lockups, using the chosen mark and typeface. */
export const BrandLockup: React.FC<Props> = ({ brand, name, size = 'md', locked }) => {
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
        letterSpacing: brand.typefaceId === 'mono' ? '-0.04em' : brand.typefaceId === 'script' ? '0' : '0.01em',
        textTransform: brand.typefaceId === 'script' ? 'none' : 'uppercase',
        fontStyle: brand.typefaceId === 'script' ? 'italic' : 'normal',
        color: accent,
    };
    const frame = frameById(brand.frameId);
    const glyph = <BrandMark id={mark.id} color={accent} size={markSize} letter={label} />;
    const icon = frame === 'none' ? glyph : (
        <span
            className={`mark-frame ${frame}`}
            style={{
                width: markSize + (size === 'sm' ? 8 : 16),
                height: markSize + (size === 'sm' ? 8 : 16),
                borderColor: accent,
                boxShadow: `0 0 16px ${accent}55`,
            }}
        >
            {glyph}
        </span>
    );

    const badge = locked ? <span className="lock-badge">Locked at launch</span> : null;
    const wrap = (node: React.ReactNode) => <div className="lockup-wrap">{node}{badge}</div>;
    if (brand.lockupId === 'word') {
        return wrap(<div style={{ ...text, borderBottom: `3px solid ${accent}`, paddingBottom: 4, display: 'inline-block' }}>{label}</div>);
    }
    if (brand.lockupId === 'stacked') {
        return wrap(
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                {icon}
                <div style={text}>{label}</div>
            </div>,
        );
    }
    if (brand.lockupId === 'badge') {
        return wrap(
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: size === 'sm' ? '4px 8px' : '8px 12px', borderRadius: 999, background: mark.ink, border: `1px solid ${accent}` }}>
                {icon}
                <div style={{ ...text, fontSize: Math.max(14, fontSize * 0.55) }}>{label}</div>
            </div>,
        );
    }
    return wrap(
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon}
            <div style={text}>{label}</div>
        </div>,
    );
};
