import React from 'react';
import type { LandmarkKind } from '../../../services/marketing/launchCatalog';
import type { PlatformBrand } from '../../../types';
import { brandAccent, typefaceById } from '../../../services/ownPlatform/brand';
import { BrandMark } from '../../ownPlatform/BrandMark';

const FACE: Record<LandmarkKind, { x: number; y: number; w: number; h: number; light: boolean; up?: boolean }> = {
    burj: { x: 182, y: 200, w: 36, h: 160, light: true, up: true },
    eiffel: { x: 162, y: 268, w: 76, h: 36, light: true },
    empire: { x: 178, y: 250, w: 44, h: 120, light: true, up: true },
    bigben: { x: 176, y: 250, w: 48, h: 110, light: true, up: true },
    gateway: { x: 155, y: 300, w: 90, h: 70, light: false },
    sealink: { x: 120, y: 318, w: 160, h: 36, light: true },
    indiagate: { x: 150, y: 300, w: 100, h: 60, light: false },
    tokyotower: { x: 182, y: 180, w: 36, h: 140, light: true, up: true },
    opera: { x: 130, y: 300, w: 140, h: 48, light: false },
    christ: { x: 150, y: 178, w: 100, h: 36, light: false },
    mbs: { x: 110, y: 176, w: 180, h: 40, light: false },
    cntower: { x: 176, y: 200, w: 48, h: 120, light: true, up: true },
    lotte: { x: 182, y: 160, w: 36, h: 180, light: true, up: true },
    pyramids: { x: 70, y: 250, w: 120, h: 70, light: false },
    colosseum: { x: 110, y: 248, w: 180, h: 50, light: false },
    generic: { x: 150, y: 220, w: 100, h: 70, light: true },
};

const wins = (x: number, y: number, cols: number, rows: number, gapX = 8, gapY = 14) =>
    Array.from({ length: cols * rows }, (_, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        return <rect key={`${x}-${index}`} className="tower-win" x={x + col * gapX} y={y + row * gapY} width="3.2" height="6" rx="0.4" style={{ animationDelay: `${(row * 0.14) + col * 0.05}s` }} />;
    });

/** A recognisable landmark. The lockup is in SVG space so it stays on the facade as the drawing scales. */
export const LandmarkArt: React.FC<{ kind: LandmarkKind; brand: PlatformBrand; label: string; title?: string }> = ({ kind, brand, label, title }) => {
    const face = FACE[kind];
    const accent = brandAccent(brand);
    const type = typefaceById(brand.typefaceId);
    const ink = face.light ? '#fff' : '#041018';
    return (
        <div className={`landmark kind-${kind}`} data-landmark={kind}>
            <svg className="sky-bleed" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#050914" />
                        <stop offset="0.55" stopColor="#102848" />
                        <stop offset="1" stopColor="#1a4e86" />
                    </linearGradient>
                </defs>
                <rect width="1000" height="400" fill="url(#nightSky)" />
                {Array.from({ length: 28 }, (_, i) => (
                    <circle key={i} cx={20 + (i * 73) % 980} cy={12 + (i * 41) % 220} r={i % 3 === 0 ? 1.6 : 0.8} fill="#fff" opacity="0.75" />
                ))}
            </svg>
            <svg viewBox="0 0 400 520" className="landmark-svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                <defs>
                    <linearGradient id="goldBeam" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0" stopColor="#E4B15A" stopOpacity="0" />
                        <stop offset="0.5" stopColor="#fff6d8" stopOpacity="0.95" />
                        <stop offset="1" stopColor="#9ec5ff" stopOpacity="0" />
                    </linearGradient>
                    <clipPath id="beamClip">
                        <rect x="168" y="40" width="64" height="420" />
                    </clipPath>
                </defs>
                {kind === 'burj' && (
                    <g>
                        <polygon points="200,28 206,118 194,118" fill="#f4f7ff" />
                        <polygon points="186,118 214,118 208,200 192,200" fill="#d5e4f8" />
                        <polygon points="176,200 224,200 216,290 184,290" fill="#243650" />
                        <polygon points="164,290 236,290 226,380 174,380" fill="#1c2d48" />
                        <polygon points="148,380 252,380 236,470 164,470" fill="#16263c" />
                        <polygon points="132,430 148,400 148,470 120,470" fill="#1a3050" />
                        <polygon points="268,430 252,400 252,470 280,470" fill="#1a3050" />
                        {wins(190, 210, 3, 12, 7, 16)}
                        <g clipPath="url(#beamClip)"><rect className="light-run" x="194" y="160" width="12" height="80" fill="url(#goldBeam)" /></g>
                    </g>
                )}
                {kind === 'eiffel' && (
                    <g>
                        <path d="M70 470 L150 300 L175 210 L192 120 L200 42 L208 120 L225 210 L250 300 L330 470 L286 470 L230 320 L214 250 L200 190 L186 250 L170 320 L114 470 Z" fill="#c9a36a" />
                        <path d="M128 470 L168 340 H232 L272 470 H236 L214 390 H186 L164 470 Z" fill="#07111f" />
                        <path d="M150 300 H250 M176 210 H224 M192 130 H208" stroke="#E4B15A" strokeWidth="6" />
                        <path d="M160 360 H240 M184 250 H216" stroke="#7a5a32" strokeWidth="2" />
                        <circle cx="200" cy="48" r="6" fill="#E4B15A" />
                        <g clipPath="url(#beamClip)"><rect className="light-run" x="194" y="90" width="12" height="50" fill="url(#goldBeam)" /></g>
                    </g>
                )}
                {kind === 'empire' && (
                    <g fill="#d5e2f4">
                        <rect x="150" y="300" width="100" height="170" />
                        <rect x="164" y="230" width="72" height="70" />
                        <rect x="178" y="170" width="44" height="60" />
                        <rect x="190" y="110" width="20" height="60" />
                        <rect x="196" y="36" width="8" height="74" fill="#f4f7ff" />
                        <polygon points="188,110 212,110 200,78" fill="#E4B15A" />
                        {wins(168, 250, 4, 10, 10, 16)}
                        <rect className="light-run" x="194" y="120" width="12" height="60" fill="url(#goldBeam)" />
                    </g>
                )}
                {kind === 'bigben' && (
                    <g>
                        <rect x="168" y="150" width="64" height="320" fill="#e6d3b0" />
                        <polygon points="168,150 200,62 232,150" fill="#d7c4a0" />
                        <rect x="196" y="40" width="8" height="28" fill="#E4B15A" />
                        <circle cx="200" cy="210" r="22" fill="#07111f" stroke="#E4B15A" strokeWidth="4" />
                        <path d="M200 210 L200 194 M200 210 L214 218" stroke="#E4B15A" strokeWidth="3" />
                        <ellipse cx="310" cy="250" rx="52" ry="78" fill="none" stroke="#9ec5ff" strokeWidth="4" />
                        {Array.from({ length: 8 }, (_, i) => <line key={i} x1="310" y1="250" x2={310 + Math.cos(i) * 46} y2={250 + Math.sin(i) * 70} stroke="#9ec5ff" strokeWidth="1.5" />)}
                        <circle cx="310" cy="250" r="8" fill="#E4B15A" />
                    </g>
                )}
                {kind === 'gateway' && (
                    <g fill="#f0e2c4">
                        <path d="M70 470 V210 H120 V280 Q200 90 280 280 V210 H330 V470 H270 V300 Q200 200 130 300 V470 Z" />
                        <circle cx="95" cy="198" r="16" />
                        <circle cx="305" cy="198" r="16" />
                        <rect x="176" y="150" width="48" height="22" />
                        <path d="M40 430 Q200 390 360 430" fill="none" stroke="#1a4e86" strokeWidth="16" />
                    </g>
                )}
                {kind === 'sealink' && (
                    <g>
                        <path d="M0 360 H400" stroke="#d7e6ff" strokeWidth="10" />
                        <path d="M70 360 V150 M300 360 V150" stroke="#f4f7ff" strokeWidth="8" />
                        <path d="M70 170 Q185 280 300 170" fill="none" stroke="#E4B15A" strokeWidth="3" />
                        {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${80 + i * 18} 352 L70 170`} stroke="#9ec5ff" strokeWidth="1.2" />)}
                        {Array.from({ length: 12 }, (_, i) => <path key={`r${i}`} d={`M${90 + i * 18} 352 L300 170`} stroke="#9ec5ff" strokeWidth="1.2" />)}
                        <path d="M0 400 Q100 450 200 400 T400 400 V470 H0 Z" fill="#0c3a6e" />
                        <rect className="light-run-x" x="40" y="348" width="80" height="8" fill="url(#goldBeam)" />
                    </g>
                )}
                {kind === 'indiagate' && (
                    <g fill="#f3e6c8">
                        <rect x="60" y="175" width="280" height="36" />
                        <rect x="80" y="211" width="46" height="259" />
                        <rect x="274" y="211" width="46" height="259" />
                        <path d="M126 470 V280 Q200 150 274 280 V470 H230 V310 Q200 250 170 310 V470 Z" />
                        <circle cx="200" cy="158" r="18" />
                        <rect x="186" y="112" width="28" height="28" />
                    </g>
                )}
                {kind === 'tokyotower' && (
                    <g fill="none" stroke="#e23d32" strokeWidth="4">
                        <path d="M120 470 L200 48 L280 470" />
                        <path d="M155 470 L200 150 L245 470" />
                        <path d="M145 360 H255 M165 250 H235 M182 150 H218" stroke="#fff" strokeWidth="5" />
                        <rect x="184" y="28" width="32" height="28" fill="#fff" stroke="#e23d32" />
                        <rect className="light-run" x="194" y="90" width="12" height="48" fill="url(#goldBeam)" stroke="none" />
                    </g>
                )}
                {kind === 'opera' && (
                    <g>
                        <path d="M20 390 Q70 180 130 340 Q175 150 210 330 Q255 120 310 340 Q350 200 385 390 Z" fill="#f7f4ee" />
                        <path d="M20 390 Q70 250 130 360 Q175 230 210 350 Q255 210 310 360 Q350 270 385 390" fill="none" stroke="#d9c7a2" strokeWidth="3" />
                        <path d="M0 400 H400 V470 H0 Z" fill="#0c3a6e" />
                    </g>
                )}
                {kind === 'christ' && (
                    <g>
                        <path d="M60 470 L200 250 L340 470 Z" fill="#163528" />
                        <circle cx="200" cy="150" r="18" fill="#f7f4ee" />
                        <rect x="188" y="168" width="24" height="78" fill="#f7f4ee" />
                        <rect x="112" y="188" width="176" height="18" rx="4" fill="#f7f4ee" />
                        <path d="M150 250 H250 L236 300 H164 Z" fill="#c9b48a" />
                    </g>
                )}
                {kind === 'mbs' && (
                    <g>
                        <rect x="78" y="230" width="40" height="240" fill="#d5e4f5" />
                        <rect x="180" y="190" width="40" height="280" fill="#e7eef8" />
                        <rect x="282" y="230" width="40" height="240" fill="#d5e4f5" />
                        {wins(88, 250, 3, 8, 10, 22)}
                        <path d="M50 210 Q200 120 350 210 L336 246 Q200 170 64 246 Z" fill="#E4B15A" />
                    </g>
                )}
                {kind === 'cntower' && (
                    <g fill="#e7eef8">
                        <polygon points="194,28 206,28 214,470 186,470" />
                        <ellipse cx="200" cy="168" rx="48" ry="18" fill="#9ec5ff" />
                        <ellipse cx="200" cy="168" rx="22" ry="8" fill="#07111f" />
                        <rect x="197" y="8" width="6" height="28" fill="#E4B15A" />
                        <rect className="light-run" x="196" y="40" width="8" height="50" fill="url(#goldBeam)" />
                    </g>
                )}
                {kind === 'lotte' && (
                    <g fill="#d5e2f4">
                        <polygon points="168,470 232,470 214,90 186,90" />
                        <polygon points="192,90 208,90 204,36 196,36" fill="#f4f7ff" />
                        {wins(192, 120, 2, 14, 10, 18)}
                        <rect className="light-run" x="194" y="70" width="12" height="60" fill="url(#goldBeam)" />
                    </g>
                )}
                {kind === 'pyramids' && (
                    <g>
                        <polygon points="30,420 150,160 270,420" fill="#e6c98a" />
                        <polygon points="150,160 190,230 110,230" fill="#f3e0b0" />
                        <polygon points="170,420 280,200 390,420" fill="#d4b06a" />
                        <polygon points="110,420 190,250 270,420" fill="#c9a15a" />
                        <path d="M300 360 Q330 330 355 360 L340 390 H315 Z" fill="#efe4c8" />
                    </g>
                )}
                {kind === 'colosseum' && (
                    <g>
                        <ellipse cx="200" cy="340" rx="150" ry="55" fill="#e7d7be" />
                        <path d="M50 330 V210 H350 V330" fill="#f3e6d0" />
                        <ellipse cx="200" cy="210" rx="150" ry="28" fill="#f7efe2" />
                        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={78 + i * 32} y="236" width="16" height="48" rx="8" fill="#07111f" />)}
                        {Array.from({ length: 8 }, (_, i) => <rect key={`b${i}`} x={78 + i * 32} y="296" width="16" height="34" fill="#07111f" />)}
                    </g>
                )}
                {kind === 'generic' && (
                    <g fill="#16304e">
                        {[30, 80, 140, 200, 250, 310].map((x, i) => (
                            <rect key={x} x={x} y={250 - (i % 3) * 50} width="46" height={220 + (i % 3) * 50} />
                        ))}
                        {wins(214, 180, 3, 10, 10, 18)}
                    </g>
                )}
                <foreignObject x={face.x} y={face.y} width={face.w} height={face.h}>
                    <div {...{ xmlns: 'http://www.w3.org/1999/xhtml', className: `facade-lock${face.up ? ' up' : ''}`, style: { color: ink, fontFamily: type.css, background: face.light ? '#041018cc' : '#f7f4eecc', borderColor: accent } }}>
                        <BrandMark id={brand.markId} color={face.light ? '#fff' : accent} size={18} letter={label} />
                        <b style={{ color: face.light ? '#fff' : accent }}>{label}</b>
                    </div>
                </foreignObject>
            </svg>
            {title ? (
                <div className="title-card" style={{ borderColor: accent }}>
                    <div className="poster-face" style={{ background: accent }}>
                        <BrandMark id={brand.markId} color="#fff" size={28} letter={label} />
                    </div>
                    <b style={{ fontFamily: type.css }}>{title}</b>
                    <span>Now on {label}</span>
                </div>
            ) : null}
        </div>
    );
};
