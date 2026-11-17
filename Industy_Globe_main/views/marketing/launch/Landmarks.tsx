import React, { useId } from 'react';
import type { LandmarkKind } from '../../../services/marketing/launchCatalog';
import type { PlatformBrand } from '../../../types';
import { brandAccent, mixHex, typefaceById } from '../../../services/ownPlatform/brand';
import './surfaces.css';

interface CopyBox { x: string; y: string; w: string; h: string; mode?: 'up' | 'wide' | 'deck' }

const COPY: Record<LandmarkKind, CopyBox> = {
    burj: { x: '43%', y: '22%', w: '14%', h: '52%', mode: 'up' },
    eiffel: { x: '30%', y: '46%', w: '40%', h: '14%', mode: 'wide' },
    empire: { x: '40%', y: '28%', w: '20%', h: '46%', mode: 'up' },
    bigben: { x: '41%', y: '40%', w: '18%', h: '36%', mode: 'up' },
    gateway: { x: '22%', y: '28%', w: '56%', h: '22%', mode: 'wide' },
    sealink: { x: '12%', y: '62%', w: '76%', h: '12%', mode: 'deck' },
    indiagate: { x: '22%', y: '26%', w: '56%', h: '20%', mode: 'wide' },
    tokyotower: { x: '32%', y: '40%', w: '36%', h: '16%', mode: 'wide' },
    opera: { x: '18%', y: '52%', w: '64%', h: '16%', mode: 'wide' },
    christ: { x: '22%', y: '8%', w: '56%', h: '16%', mode: 'wide' },
    mbs: { x: '14%', y: '30%', w: '72%', h: '14%', mode: 'deck' },
    cntower: { x: '30%', y: '28%', w: '40%', h: '14%', mode: 'wide' },
    lotte: { x: '42%', y: '20%', w: '16%', h: '54%', mode: 'up' },
    pyramids: { x: '12%', y: '42%', w: '40%', h: '22%', mode: 'wide' },
    colosseum: { x: '16%', y: '40%', w: '68%', h: '16%', mode: 'wide' },
    generic: { x: '28%', y: '32%', w: '44%', h: '28%', mode: 'wide' },
};

const SIL: Record<LandmarkKind, string> = {
    burj: 'M200 6 L205 48 L212 130 L204 142 L220 230 L210 242 L232 340 L220 352 L244 460 L258 508 L142 508 L156 460 L180 352 L168 340 L190 242 L180 230 L196 142 L188 130 L195 48 Z',
    eiffel: 'M70 500 L150 310 L178 190 L196 70 L200 36 L204 70 L222 190 L250 310 L330 500 L286 500 L230 330 L214 230 L200 160 L186 230 L170 330 L114 500 Z',
    empire: 'M156 508 L156 300 L170 300 L170 230 L184 230 L184 160 L194 150 L194 48 L206 48 L206 150 L216 160 L216 230 L230 230 L230 300 L244 300 L244 508 Z',
    bigben: 'M168 508 L168 150 L200 70 L232 150 L232 508 Z',
    gateway: 'M60 508 L60 210 L110 210 L110 300 Q200 120 290 300 L290 210 L340 210 L340 508 L270 508 L270 330 Q200 230 130 330 L130 508 Z',
    sealink: 'M20 360 H380 V392 H20 Z',
    indiagate: 'M50 200 H350 V240 H320 V508 H270 V320 Q200 230 130 320 V508 H80 V240 H50 Z',
    tokyotower: 'M120 500 L200 40 L280 500 L245 500 L200 180 L155 500 Z',
    opera: 'M20 400 Q80 180 140 340 Q180 150 210 330 Q250 140 320 340 Q360 200 390 400 L390 430 L20 430 Z',
    christ: 'M150 200 H250 L236 280 H164 Z M188 150 H212 V230 H188 Z M120 168 H280 V190 H120 Z',
    mbs: 'M70 200 Q200 120 330 200 L318 236 Q200 168 82 236 Z',
    cntower: 'M194 20 H206 L214 500 H186 Z M152 168 H248 V196 H152 Z',
    lotte: 'M168 508 L186 80 L214 80 L232 508 Z',
    pyramids: 'M30 430 L150 170 L270 430 Z',
    colosseum: 'M50 250 H350 V340 Q350 430 200 450 Q50 430 50 340 Z',
    generic: 'M40 500 V280 H90 V220 H140 V300 H190 V160 H250 V240 H300 V200 H360 V500 Z',
};

const Led: React.FC<{ box: CopyBox; label: string; title?: string; font: string; accent: string }> = ({ box, label, title, font, accent }) => (
    <foreignObject x="0" y="0" width="400" height="520">
        <div {...{ xmlns: 'http://www.w3.org/1999/xhtml', className: 'led', style: { ['--ink' as string]: accent, ['--lift' as string]: mixHex(accent, '#ffffff', 0.45), fontFamily: font } }}>
            <div className={`led-copy ${box.mode || ''}`} style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
                <b>{label}</b>
                {box.mode === 'up' ? null : <em>{title || 'NOW SHOWING'}</em>}
            </div>
        </div>
    </foreignObject>
);

const Spark: React.FC<{ points: Array<[number, number]> }> = ({ points }) => (
    <g>
        {points.map(([x, y], index) => <circle key={`${x}-${y}`} className="spark" cx={x} cy={y} r={index % 3 === 0 ? 2.4 : 1.4} style={{ animationDelay: `${(index % 7) * 0.18}s` }} />)}
    </g>
);

/** The monument is the screen: LEDs, projection, or a full wrap, clipped to its real outline. */
export const LandmarkArt: React.FC<{ kind: LandmarkKind; brand: PlatformBrand; label: string; title?: string }> = ({ kind, brand, label, title }) => {
    const raw = useId().replace(/:/g, '');
    const accent = brandAccent(brand);
    const font = typefaceById(brand.typefaceId).css;
    const iron = mixHex(accent, '#f4e2b0', 0.35);
    const box = COPY[kind];
    return (
        <div className={`lx landmark kind-${kind}`} data-landmark={kind}>
            <svg className="sky-bleed" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id={`sky-${raw}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#050914" />
                        <stop offset="0.6" stopColor="#102848" />
                        <stop offset="1" stopColor="#1a4e86" />
                    </linearGradient>
                </defs>
                <rect width="1000" height="400" fill={`url(#sky-${raw})`} />
                {Array.from({ length: 24 }, (_, i) => (
                    <circle key={i} cx={16 + (i * 79) % 980} cy={14 + (i * 37) % 200} r={i % 4 === 0 ? 1.5 : 0.7} fill="#fff" opacity="0.8" />
                ))}
            </svg>
            <svg viewBox="0 0 400 520" className="landmark-svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                <defs>
                    <clipPath id={`sil-${raw}`}><path d={SIL[kind]} /></clipPath>
                </defs>
                {!['eiffel', 'tokyotower', 'christ'].includes(kind) && (
                    <g clipPath={`url(#sil-${raw})`}>
                        <Led box={box} label={label} title={title} font={font} accent={accent} />
                    </g>
                )}
                {(kind === 'eiffel' || kind === 'tokyotower') && (
                    <text x="130" y={kind === 'eiffel' ? 292 : 270} textLength="140" lengthAdjust="spacingAndGlyphs" fontSize="32" fill="#fff" fontFamily={font} fontWeight="800" style={{ filter: `drop-shadow(0 0 6px ${accent}) drop-shadow(0 0 16px ${accent})` }}>{label}</text>
                )}
                {kind === 'burj' && (
                    <g fill="none" stroke="#0006" strokeWidth="2">
                        {[96, 150, 200, 260, 320, 380, 450].map(y => <line key={y} x1={200 - (y / 18)} y1={y} x2={200 + (y / 18)} y2={y} />)}
                        <polygon points="200,6 204,40 196,40" fill="#f7fbff" stroke="none" />
                    </g>
                )}
                {kind === 'eiffel' && (
                    <g fill="none" stroke={iron} strokeWidth="2.4" strokeLinejoin="round">
                        <path d="M78 500 L168 300 L190 170 L200 42 L210 170 L232 300 L322 500" strokeWidth="4" />
                        <path d="M120 500 L184 320 L200 210 L216 320 L280 500" />
                        <path d="M146 360 H254 M168 250 H232 M186 160 H214" stroke={accent} strokeWidth="5" />
                        {Array.from({ length: 8 }, (_, i) => {
                            const y = 180 + i * 38;
                            const half = 28 + i * 12;
                            return <path key={y} d={`M${200 - half} ${y} L200 ${y + 28} L${200 + half} ${y}`} />;
                        })}
                        <Spark points={[[200, 48], [168, 250], [232, 250], [150, 360], [250, 360], [120, 460], [280, 460], [190, 160], [210, 160], [184, 320], [216, 320]]} />
                    </g>
                )}
                {kind === 'tokyotower' && (
                    <g fill="none" stroke={mixHex(accent, '#e23d32', 0.4)} strokeWidth="3">
                        <path d="M130 500 L200 36 L270 500" />
                        <path d="M160 500 L200 150 L240 500" />
                        <path d="M150 380 H250 M170 260 H230 M186 160 H214" stroke="#fff" strokeWidth="4" />
                        <Spark points={[[200, 48], [170, 260], [230, 260], [150, 380], [250, 380], [186, 160], [214, 160]]} />
                    </g>
                )}
                {kind === 'sealink' && (
                    <g fill="none" stroke="#e7eef8" strokeWidth="3">
                        <path d="M70 360 V150 M330 360 V150" strokeWidth="7" />
                        <path d="M70 168 Q200 250 330 168" stroke={accent} strokeWidth="3" />
                        {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${86 + i * 16} 352 L70 168`} stroke="#9ec5ff" />)}
                        {Array.from({ length: 10 }, (_, i) => <path key={`r${i}`} d={`M${150 + i * 16} 352 L330 168`} stroke="#9ec5ff" />)}
                        <path d="M0 400 Q100 450 200 400 T400 400 V500 H0 Z" fill="#0c3a6e" stroke="none" />
                    </g>
                )}
                {kind === 'bigben' && (
                    <g>
                        <circle cx="200" cy="210" r="22" fill="#07111f" stroke="#E4B15A" strokeWidth="4" />
                        <path d="M200 210 V194 M200 210 L214 218" stroke="#E4B15A" strokeWidth="2" />
                        <ellipse cx="310" cy="250" rx="48" ry="72" fill="none" stroke="#9ec5ff" strokeWidth="3" />
                        <Spark points={Array.from({ length: 8 }, (_, i) => [310 + Math.cos(i) * 36, 250 + Math.sin(i) * 52] as [number, number])} />
                    </g>
                )}
                {kind === 'opera' && <path d="M30 390 Q90 230 150 350 Q190 200 220 345 Q260 190 330 350 Q370 250 385 390" fill="none" stroke="#f7f4ee" strokeWidth="3" />}
                {kind === 'christ' && (
                    <g fill="#f7f4ee">
                        <circle cx="200" cy="132" r="16" />
                        <rect x="188" y="148" width="24" height="70" />
                        <rect x="118" y="176" width="164" height="16" rx="4" />
                        <path d="M70 500 L200 250 L330 500 Z" fill="#143224" />
                    </g>
                )}
                {kind === 'cntower' && <ellipse cx="200" cy="180" rx="46" ry="16" fill="none" stroke="#d7e6ff" strokeWidth="3" />}
                {kind === 'gateway' && <path d="M40 470 Q200 420 360 470" fill="none" stroke="#1a4e86" strokeWidth="14" />}
                {kind !== 'christ' && <path d={SIL[kind]} fill="none" stroke="#ffffff22" strokeWidth="1.2" />}
            </svg>
            {kind === 'christ' && <div className="sky-title" style={{ fontFamily: font, ['--glow' as string]: accent }}>{title || label}</div>}
            {(kind === 'burj' || kind === 'empire' || kind === 'lotte' || kind === 'cntower') && (
                <>
                    <i className="spot spot-a" />
                    <i className="spot spot-b" />
                </>
            )}
        </div>
    );
};
