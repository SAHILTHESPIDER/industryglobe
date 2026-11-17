import React, { useEffect, useId, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { CampaignScene } from '../../../services/marketing/sceneRegistry';
import { landmarkFor, type LandmarkKind } from '../../../services/marketing/launchCatalog';
import { BrandMark } from '../../ownPlatform/BrandMark';

const GLYPH: Record<string, string[]> = {
    A: ['01110', '10001', '11111', '10001', '10001'],
    B: ['11110', '10001', '11110', '10001', '11110'],
    C: ['01111', '10000', '10000', '10000', '01111'],
    D: ['11110', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '11110', '10000', '11111'],
    F: ['11111', '10000', '11110', '10000', '10000'],
    G: ['01111', '10000', '10111', '10001', '01110'],
    H: ['10001', '10001', '11111', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '11111'],
    J: ['00111', '00010', '00010', '10010', '01100'],
    K: ['10001', '10010', '11100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10001', '10001'],
    N: ['10001', '11001', '10101', '10011', '10001'],
    O: ['01110', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '11110', '10000', '10000'],
    Q: ['01110', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '11110', '10100', '10001'],
    S: ['01111', '10000', '01110', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10101', '11011', '10001'],
    X: ['10001', '01010', '00100', '01010', '10001'],
    Y: ['10001', '01010', '00100', '00100', '00100'],
    Z: ['11111', '00010', '00100', '01000', '11111'],
};

const glyphPoints = (label: string, originX: number, originY: number, scaleX: number, scaleY: number) => {
    const letters = label.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10) || 'TITLE';
    const cols = 5;
    const rows = 5;
    const gap = 1;
    const width = letters.length * (cols + gap);
    const points: { x: number; y: number }[] = [];
    letters.split('').forEach((letter, index) => {
        (GLYPH[letter] || GLYPH.E).forEach((row, y) => {
            row.split('').forEach((cell, x) => {
                if (cell === '1') {
                    points.push({
                        x: originX + ((index * (cols + gap) + x + 0.5) / width) * scaleX,
                        y: originY + ((y + 0.5) / rows) * scaleY,
                    });
                }
            });
        });
    });
    return points;
};

const playPoints = (originX: number, originY: number, size: number) => {
    const points: { x: number; y: number }[] = [];
    const rows = 9;
    for (let row = 0; row < rows; row += 1) {
        const inset = Math.abs(row - 4);
        const count = 5 - inset;
        for (let col = 0; col < count; col += 1) {
            points.push({
                x: originX + (col / 5) * size,
                y: originY + (row / rows) * size,
            });
        }
    }
    return points;
};

const Drones: React.FC<{ label: string; mark: string; letter: string; reduce: boolean; accent: string }> = ({ label, mark, letter, reduce, accent }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        const markCloud = mark === 'play'
            ? playPoints(0.08, 0.08, 0.18)
            : glyphPoints(letter || 'S', 0.06, 0.16, 0.16, 0.2);
        const word = glyphPoints(label, 0.30, 0.12, 0.64, 0.24);
        const targets = [...markCloud, ...word];
        let seed = 11;
        const rnd = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        const drones = targets.map(point => ({
            sx: rnd(),
            sy: rnd() * 0.85,
            tx: point.x,
            ty: point.y,
            phase: rnd() * Math.PI * 2,
        }));
        let frame = 0;
        let alive = true;
        const started = performance.now();
        const paint = (now: number) => {
            if (!alive) return;
            const bounds = canvas.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            const width = Math.max(1, Math.floor(bounds.width * ratio));
            const height = Math.max(1, Math.floor(bounds.height * ratio));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            ctx.clearRect(0, 0, width, height);
            const formed = reduce ? 1 : Math.min(1, (now - started) / 3200);
            const ease = formed * formed * (3 - 2 * formed);
            const hold = formed === 1 && now - started > 4600;
            drones.forEach((drone, index) => {
                const bob = formed === 1 && !reduce && !hold ? Math.sin(now / 700 + drone.phase) * 1.4 * ratio : 0;
                const x = (drone.sx + (drone.tx - drone.sx) * ease) * width;
                const y = (drone.sy + (drone.ty - drone.sy) * ease) * height + bob;
                const radius = (index < markCloud.length ? 2.6 : 2.15) * ratio;
                const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 5);
                glow.addColorStop(0, '#fff');
                glow.addColorStop(0.35, accent);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(x, y, radius * 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            });
            if (!reduce && !hold) frame = requestAnimationFrame(paint);
        };
        frame = requestAnimationFrame(paint);
        return () => {
            alive = false;
            cancelAnimationFrame(frame);
        };
    }, [label, mark, letter, reduce, accent]);
    return <canvas ref={ref} className="drone-canvas" />;
};

const FitArt: React.FC<{ title: string; poster?: string; frame: string; accent: string; markId?: string; letter: string; lockupId?: string }> = ({ title, poster, frame, accent, markId, letter, lockupId = 'beside' }) => {
    const tall = frame === '1:9';
    const showMark = Boolean(markId) && lockupId !== 'word' && !poster;
    const budget = showMark ? 108 : 148;
    const size = tall
        ? `${Math.max(1.15, Math.min(2.4, 14 / Math.max(1, title.length)))}vh`
        : `${Math.max(9, Math.min(38, budget / Math.max(1, title.length)))}cqw`;
    return (
        <div className={`art lock-${lockupId} ${tall ? 'ratio-tall' : ''}`} style={{ background: poster ? '#05060a' : tall ? 'repeating-linear-gradient(#05060c 0 2px, #121826 2px 3px)' : `linear-gradient(165deg, #120c08 0%, ${accent} 48%, #07080c 100%)` }}>
            {poster ? <img src={poster} alt="" /> : (
                <>
                    {showMark && markId ? (
                        <span className="mark"><BrandMark id={markId} color="#fff" size={64} letter={letter} /></span>
                    ) : null}
                    <b style={{ fontSize: size }}>{title}</b>
                </>
            )}
            <i className="glass" />
            <i className="bloom" style={{ background: `radial-gradient(circle, ${accent}, transparent 68%)` }} />
            <i className="sheen" />
        </div>
    );
};

interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
    transform: string;
}

const surfacesFor = (scene: CampaignScene, kind: LandmarkKind): Box[] => {
    if (scene.effect === 'drone') return [];
    if (scene.effect === 'led') {
        if (kind === 'burj') return [{ x: 47.4, y: 26, w: 5.2, h: 58, transform: 'perspective(380px) rotateY(-8deg)' }];
        if (kind === 'eiffel' || kind === 'tokyotower') return [{ x: 44, y: 38, w: 12, h: 22, transform: 'perspective(500px) rotateY(-8deg)' }];
        return [{ x: 44, y: 30, w: 12, h: 36, transform: 'perspective(480px) rotateY(-12deg)' }];
    }
    if (scene.effect === 'billboard') {
        return [{ x: 16, y: 24, w: 66, h: 22, transform: 'perspective(680px) rotateX(18deg) rotateY(-26deg) rotateZ(-1.5deg)' }];
    }
    if (scene.effect === 'banner') {
        return [{ x: 36.4, y: 23, w: 29.2, h: 66, transform: 'perspective(860px) rotateY(5deg)' }];
    }
    if (scene.effect === 'stunt') {
        return [{ x: 28, y: 14, w: 46, h: 24, transform: 'perspective(720px) rotateY(-16deg) rotateX(12deg)' }];
    }
    if (scene.effect === 'festival') {
        return [{ x: 22, y: 20, w: 56, h: 28, transform: 'perspective(900px) rotateX(7deg) rotateY(-4deg)' }];
    }
    if (scene.formatId === 'airport_screens') {
        return [
            { x: 3, y: 34, w: 22, h: 24, transform: 'perspective(480px) rotateY(42deg) rotateX(4deg)' },
            { x: 29, y: 28, w: 42, h: 30, transform: 'perspective(760px) rotateY(-4deg) rotateX(6deg)' },
            { x: 75, y: 35, w: 22, h: 22, transform: 'perspective(480px) rotateY(-42deg) rotateX(4deg)' },
        ];
    }
    if (scene.formatId === 'mall_screens') {
        return [
            { x: 30, y: 16, w: 40, h: 24, transform: 'perspective(640px) rotateX(14deg)' },
            { x: 6, y: 40, w: 18, h: 14, transform: 'perspective(480px) rotateY(32deg)' },
        ];
    }
    return [
        { x: 6, y: 30, w: 22, h: 28, transform: 'perspective(560px) rotateY(32deg) rotateX(4deg)' },
        { x: 38, y: 20, w: 50, h: 34, transform: 'perspective(700px) rotateY(-20deg) rotateX(6deg)' },
    ];
};

const uidOf = (scene: CampaignScene, instance: string) => `${instance}${scene.id}`.replace(/[^a-z0-9]/gi, '');

const SkyDefs: React.FC<{ uid: string; accent: string }> = ({ uid, accent }) => (
    <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#07060f" />
            <stop offset="0.42" stopColor="#1a1230" />
            <stop offset="0.72" stopColor="#3a2218" />
            <stop offset="1" stopColor="#07080c" />
        </linearGradient>
        <radialGradient id={`moon-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff6e4" />
            <stop offset="0.45" stopColor="#f0d7a4" />
            <stop offset="1" stopColor="#f0d7a400" />
        </radialGradient>
        <linearGradient id={`haze-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0000" />
            <stop offset="1" stopColor="#12080a88" />
        </linearGradient>
        <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a3048" />
            <stop offset="1" stopColor="#05070c" />
        </linearGradient>
        <linearGradient id={`floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a241c" />
            <stop offset="0.4" stopColor="#120e0c" />
            <stop offset="1" stopColor="#050403" />
        </linearGradient>
        <linearGradient id={`led-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#05060a" />
            <stop offset="0.5" stopColor={accent} />
            <stop offset="1" stopColor="#05060a" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.6" result="b" />
            <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#0000" />
        </linearGradient>
    </defs>
);

const Windows: React.FC<{ x: number; y: number; cols: number; rows: number; accent: string; uid: string }> = ({ x, y, cols, rows, accent, uid }) => (
    <g filter={`url(#glow-${uid})`}>
        {Array.from({ length: cols * rows }, (_, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const on = (index * 7 + cols) % 5 !== 0;
            return (
                <rect
                    key={index}
                    className={on ? 'flicker' : ''}
                    x={x + col * 2.1}
                    y={y + row * 2.4}
                    width="1.1"
                    height="1.4"
                    fill={on ? accent : '#1a140c'}
                    opacity={on ? 0.85 : 0.35}
                    style={{ animationDelay: `${(index % 6) * 0.25}s` }}
                />
            );
        })}
    </g>
);

const Burj: React.FC<{ accent: string; uid: string }> = ({ accent, uid }) => {
    const steps: [number, number, number, number][] = [
        [22, 98, 78, 90],
        [30, 90, 70, 80],
        [36, 80, 64, 68],
        [41, 68, 59, 56],
        [45, 56, 55, 44],
        [47.2, 44, 52.8, 30],
        [48.4, 30, 51.6, 16],
        [49.3, 16, 50.7, 7],
    ];
    return (
        <g>
            <ellipse cx="50" cy="98" rx="34" ry="1.8" fill="#000" opacity="0.45" />
            {steps.map(([x, y, x2, y2], index) => (
                <polygon key={y} points={`${x},${y} ${x2},${y} ${x2 - 0.35},${y2} ${x + 0.35},${y2}`} fill={index % 2 ? '#0e1522' : '#243044'} stroke="#9eb4d0" strokeWidth="0.18" />
            ))}
            <polygon points="49.6,7 50.4,7 50,1.5" fill="#f7fbff" filter={`url(#glow-${uid})`} />
            {steps.slice(0, 7).map(([x, y, x2]) => (
                <line key={y} x1={x + 0.3} y1={y + 0.15} x2={x2 - 0.3} y2={y + 0.15} stroke={accent} strokeWidth="0.45" filter={`url(#glow-${uid})`} />
            ))}
            <g opacity="0.3" transform="translate(0 99) scale(1 -0.12)">
                {steps.slice(0, 4).map(([x, y, x2, y2]) => (
                    <polygon key={y} points={`${x},${y} ${x2},${y} ${x2},${y2} ${x},${y2}`} fill="#7eb0d4" />
                ))}
            </g>
        </g>
    );
};

const Eiffel: React.FC<{ uid: string }> = ({ uid }) => (
    <g fill="#2a2118" stroke="#c4a574" strokeWidth="0.15">
        <path fillRule="evenodd" d="M50 8 L52.2 22 H60 L68 42 H76 L88 96 H72 L66 70 H34 L28 96 H12 L24 42 H32 L40 22 H47.8 Z M36 96 L42 72 H58 L64 96 H56 L52 80 H48 L44 96 Z M44 42 H56 L53 28 H47 Z" />
        <rect x="41" y="40" width="18" height="1.6" fill="#e6d2a4" />
        <rect x="34" y="66" width="32" height="1.5" fill="#e6d2a4" />
        <polygon points="49.2,3 50.8,3 51.4,9 48.6,9" fill="#fff4d4" filter={`url(#glow-${uid})`} />
        {[0, 1, 2, 3, 4].map(index => (
            <line key={index} x1={28 + index * 4} y1={96 - index * 8} x2={72 - index * 4} y2={70} stroke="#8a7048" strokeWidth="0.12" />
        ))}
    </g>
);

const Gateway: React.FC<{ uid: string; accent: string }> = ({ uid, accent }) => (
    <g>
        <path d="M8 90 Q28 78 50 90 T92 90 V100 H8 Z" fill={`url(#water-${uid})`} />
        {Array.from({ length: 18 }, (_, index) => (
            <circle key={index} className="flicker" cx={10 + index * 4.2} cy={86 - Math.sin(index / 2.4) * 4} r="0.55" fill={accent} filter={`url(#glow-${uid})`} style={{ animationDelay: `${index * 0.12}s` }} />
        ))}
        <g fill="#3a2c22" stroke="#c4a070" strokeWidth="0.2">
            <rect x="14" y="46" width="7" height="46" />
            <rect x="79" y="46" width="7" height="46" />
            <polygon points="14,46 17.5,32 21,46" />
            <polygon points="79,46 82.5,32 86,46" />
            <path d="M36 52 Q50 30 64 52 V58 H36 Z" />
            <path fillRule="evenodd" d="M22 96 H78 V54 H70 V48 H60 V42 H40 V48 H30 V54 H22 Z M38 96 V66 Q50 54 62 66 V96 H54 V74 Q50 68 46 74 V96 Z" />
        </g>
        <path d="M38 96 V66 Q50 54 62 66 V96" fill="none" stroke={accent} strokeWidth="0.35" opacity="0.7" filter={`url(#glow-${uid})`} />
    </g>
);

const Prague: React.FC<{ uid: string; accent: string }> = ({ uid, accent }) => (
    <g>
        <polygon points="0,86 6,64 12,86" fill="#1a100c" />
        <polygon points="8,88 16,58 18,34 20,58 28,88" fill="#140e0c" />
        <polygon points="18,34 19,18 20,34" fill="#e8d7b0" />
        <polygon points="24,90 30,62 32,40 34,62 40,90" fill="#1a1210" />
        <polygon points="68,90 74,56 76,28 78,56 84,90" fill="#120e10" />
        <polygon points="82,92 88,60 90,26 92,60 98,92" fill="#100c10" />
        <circle cx="76" cy="26" r="1.1" fill={accent} filter={`url(#glow-${uid})`} />
        <circle cx="90" cy="24" r="1.1" fill={accent} filter={`url(#glow-${uid})`} />
        <rect x="36" y="22" width="30" height="70" fill="#241814" stroke="#6a5040" strokeWidth="0.25" />
        <Windows x={38} y={26} cols={8} rows={10} accent="#f0c98a" uid={uid} />
        <polygon points="36,22 51,12 66,22" fill="#2a1c16" />
    </g>
);

const Empire: React.FC = () => (
    <g fill="#141820">
        <polygon points="40,96 40,46 34,46 34,32 42,32 42,16 50,8 58,16 58,32 66,32 66,46 60,46 60,96" />
        <rect x="49" y="4" width="2" height="6" fill="#f2e6c8" />
        <rect x="18" y="58" width="14" height="38" />
        <rect x="70" y="50" width="16" height="46" />
    </g>
);

const BigBen: React.FC<{ uid: string; accent: string }> = ({ uid, accent }) => (
    <g fill="#221c16">
        <rect x="44" y="28" width="12" height="68" />
        <polygon points="44,28 50,8 56,28" />
        <circle cx="50" cy="40" r="4.2" fill="#0c0c10" stroke={accent} strokeWidth="0.4" filter={`url(#glow-${uid})`} />
        <rect x="30" y="70" width="40" height="26" />
    </g>
);

const TokyoTower: React.FC = () => (
    <g>
        <path d="M50 6 L58 30 H68 L78 96 H22 L32 30 H42 Z" fill="#7a2430" />
        <path d="M46 30 H54 L60 55 H40 Z" fill="#efe6d6" />
        <path d="M36 55 H64 L70 78 H30 Z" fill="#7a2430" />
        <rect x="38" y="40" width="24" height="2" fill="#efe6d6" />
    </g>
);

const Opera: React.FC = () => (
    <g fill="#e6dcc8">
        <path d="M6 84 Q22 48 34 84 Z" />
        <path d="M24 86 Q40 36 54 86 Z" />
        <path d="M46 84 Q64 42 84 84 Z" />
        <path d="M68 88 Q82 58 96 88 Z" />
        <rect x="4" y="84" width="92" height="8" fill="#1a2430" />
    </g>
);

const Christ: React.FC = () => (
    <g fill="#d8d2c6">
        <polygon points="8,96 50,62 92,96" fill="#1a1c18" />
        <rect x="48.6" y="40" width="2.8" height="28" />
        <rect x="40" y="48" width="20" height="2.4" />
        <circle cx="50" cy="38" r="2.2" />
    </g>
);

const MarinaBay: React.FC<{ accent: string; uid: string }> = ({ accent, uid }) => (
    <g fill="#121820">
        <rect x="22" y="40" width="10" height="52" />
        <rect x="45" y="34" width="10" height="58" />
        <rect x="68" y="42" width="10" height="50" />
        <path d="M16 40 Q50 28 84 40 L80 46 Q50 36 20 46 Z" fill={accent} opacity="0.85" filter={`url(#glow-${uid})`} />
    </g>
);

const CnTower: React.FC<{ accent: string }> = ({ accent }) => (
    <g fill="#d8dee8">
        <polygon points="48,96 49.2,40 50.8,40 52,96" />
        <ellipse cx="50" cy="36" rx="10" ry="3.2" fill={accent} />
        <polygon points="49.4,36 50,6 50.6,36" />
    </g>
);

const Lotte: React.FC<{ accent: string }> = ({ accent }) => (
    <g fill="#121820">
        <polygon points="42,96 46,20 54,20 58,96" />
        <polygon points="47,20 50,6 53,20" fill={accent} />
        <rect x="47.2" y="34" width="5.6" height="8" fill="#0c0c10" />
    </g>
);

const Pyramids: React.FC = () => (
    <g fill="#3a2e1c">
        <polygon points="8,90 28,58 48,90" />
        <polygon points="30,92 58,48 86,92" />
        <polygon points="62,90 80,66 96,90" />
    </g>
);

const Colosseum: React.FC = () => (
    <g fill="#3a3028">
        <ellipse cx="50" cy="70" rx="34" ry="16" />
        <ellipse cx="50" cy="70" rx="22" ry="9" fill="#1a120e" />
        {Array.from({ length: 9 }, (_, index) => (
            <rect key={index} x={20 + index * 7} y="62" width="3" height="8" fill="#0c0a08" />
        ))}
    </g>
);

const IndiaGate: React.FC = () => (
    <g fill="#3a342c">
        <rect x="18" y="70" width="64" height="8" />
        <rect x="24" y="46" width="8" height="28" />
        <rect x="68" y="46" width="8" height="28" />
        <path fillRule="evenodd" d="M32 78 V52 H68 V78 H58 V64 Q50 56 42 64 V78 Z" />
        <rect x="46" y="38" width="8" height="10" />
    </g>
);

const SeaLink: React.FC<{ accent: string; uid: string }> = ({ accent, uid }) => (
    <g stroke={accent} fill="none" strokeWidth="0.35" filter={`url(#glow-${uid})`}>
        <path d="M0 78 H100" stroke="#8ab" />
        <path d="M30 78 V48 M70 78 V48" stroke="#d8dee8" strokeWidth="0.8" />
        {Array.from({ length: 7 }, (_, index) => (
            <line key={index} x1="30" y1="50" x2={8 + index * 6} y2="78" />
        ))}
        {Array.from({ length: 7 }, (_, index) => (
            <line key={index} x1="70" y1="50" x2={48 + index * 6} y2="78" />
        ))}
    </g>
);

const GenericSky: React.FC<{ cityId: string; accent: string }> = ({ cityId, accent }) => {
    let seed = 7;
    for (const char of cityId) seed = (seed * 33 + char.charCodeAt(0)) >>> 0;
    const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    return (
        <g>
            {Array.from({ length: 9 }, (_, index) => {
                const height = 28 + rnd() * 48;
                const width = 7 + rnd() * 6;
                const x = 4 + index * 10.4;
                return (
                    <g key={index}>
                        <rect x={x} y={96 - height} width={width} height={height} fill={index % 2 ? '#10131a' : '#18140f'} />
                        <rect x={x + 1} y={98 - height} width={width - 2} height="1.2" fill={accent} opacity="0.8" />
                    </g>
                );
            })}
        </g>
    );
};

const Landmark: React.FC<{ kind: LandmarkKind; cityId: string; accent: string; uid: string; distant?: boolean }> = ({ kind, cityId, accent, uid, distant }) => {
    const body = (() => {
        switch (kind) {
            case 'burj': return <Burj accent={accent} uid={uid} />;
            case 'eiffel': return <Eiffel uid={uid} />;
            case 'empire': return <Empire />;
            case 'bigben': return <BigBen uid={uid} accent={accent} />;
            case 'gateway': return <Gateway uid={uid} accent={accent} />;
            case 'sealink': return <SeaLink accent={accent} uid={uid} />;
            case 'indiagate': return <IndiaGate />;
            case 'tokyotower': return <TokyoTower />;
            case 'opera': return <Opera />;
            case 'christ': return <Christ />;
            case 'mbs': return <MarinaBay accent={accent} uid={uid} />;
            case 'cntower': return <CnTower accent={accent} />;
            case 'lotte': return <Lotte accent={accent} />;
            case 'pyramids': return <Pyramids />;
            case 'colosseum': return <Colosseum />;
            default: return <GenericSky cityId={cityId} accent={accent} />;
        }
    })();
    if (!distant) return body;
    return <g transform="translate(50 42) scale(0.34) translate(-50 -78)">{body}</g>;
};

const Airport: React.FC<{ uid: string; accent: string; kind: LandmarkKind; cityId: string }> = ({ uid, accent, kind, cityId }) => (
    <g>
        <rect x="0" y="0" width="100" height="24" fill="#05060e" />
        <Landmark kind={kind} cityId={cityId} accent={accent} uid={uid} distant />
        <polygon points="0,16 100,16 100,34 0,38" fill="#12161e" />
        {Array.from({ length: 8 }, (_, index) => (
            <line key={index} x1="50" y1="22" x2={index * 14} y2="0" stroke="#3a4458" strokeWidth="0.35" />
        ))}
        <rect x="0" y="62" width="100" height="38" fill={`url(#floor-${uid})`} />
        <polygon points="20,64 80,64 96,100 4,100" fill="#ffffff10" />
        <rect x="27" y="36" width="1.6" height="28" fill="#8a93a4" />
        <rect x="71" y="36" width="1.6" height="28" fill="#8a93a4" />
        <rect x="8" y="26" width="20" height="4" rx="0.6" fill="#0c0c10" stroke={accent} strokeWidth="0.2" />
        <text x="18" y="29" textAnchor="middle" fontSize="2.2" fill={accent} fontFamily="ui-monospace, monospace">GATE</text>
    </g>
);

const Mall: React.FC<{ uid: string; accent: string }> = ({ uid, accent }) => (
    <g>
        <rect width="100" height="100" fill="#140e12" />
        <ellipse cx="50" cy="8" rx="26" ry="4.5" fill="#f3ddc0" opacity="0.45" filter={`url(#glow-${uid})`} />
        {[34, 50, 66, 82].map(y => (
            <g key={y}>
                <path d={`M6 ${y} H94`} stroke="#5c4638" strokeWidth="0.55" />
                <path d={`M6 ${y} H94`} stroke="#e6d2b8" strokeWidth="0.12" transform="translate(0 1.1)" />
            </g>
        ))}
        <polygon points="18,86 34,86 40,48 28,48" fill="#2a211c" stroke="#e4d2b8" strokeWidth="0.3" />
        <polygon points="82,86 66,86 60,48 72,48" fill="#2a211c" stroke="#e4d2b8" strokeWidth="0.3" />
        {Array.from({ length: 9 }, (_, index) => (
            <line key={index} x1={20 + index * 0.55} y1={82 - index * 3.6} x2={32 + index * 0.45} y2={82 - index * 3.6} stroke="#f0e2cc" strokeWidth="0.35" />
        ))}
        {Array.from({ length: 9 }, (_, index) => (
            <line key={index} x1={80 - index * 0.55} y1={82 - index * 3.6} x2={68 - index * 0.45} y2={82 - index * 3.6} stroke="#f0e2cc" strokeWidth="0.35" />
        ))}
        <line className="esc" x1="24" y1="84" x2="34" y2="50" stroke={accent} strokeWidth="0.45" strokeDasharray="0.8 1.3" />
        <ellipse cx="50" cy="90" rx="36" ry="6" fill="#0c0908" />
    </g>
);

const Street: React.FC<{ uid: string; accent: string; kind: LandmarkKind; cityId: string }> = ({ uid, accent, kind, cityId }) => (
    <g>
        <polygon points="0,100 0,18 26,34 30,100" fill="#0c1016" />
        <polygon points="100,100 100,14 72,30 68,100" fill="#12141c" />
        <Windows x={4} y={24} cols={6} rows={12} accent="#9ecbff" uid={uid} />
        <Windows x={78} y={22} cols={6} rows={12} accent={accent} uid={uid} />
        <polygon points="30,100 68,100 58,42 42,42" fill="#16130f" />
        <line x1="50" y1="44" x2="49" y2="100" stroke={accent} strokeWidth="0.35" strokeDasharray="2 2.4" opacity="0.8" />
        <Landmark kind={kind} cityId={cityId} accent={accent} uid={uid} distant />
        {cityId === 'ber' && (
            <g>
                <line x1="50" y1="8" x2="50" y2="28" stroke="#d8dee8" strokeWidth="0.35" />
                <circle cx="50" cy="16" r="2.4" fill="#c5d4e8" filter={`url(#glow-${uid})`} />
            </g>
        )}
    </g>
);

const Arena: React.FC<{ uid: string; accent: string }> = ({ uid, accent }) => (
    <g>
        <ellipse cx="50" cy="78" rx="48" ry="18" fill="#1a1014" />
        <ellipse cx="50" cy="74" rx="36" ry="12" fill="#120c10" stroke="#3a2428" strokeWidth="0.4" />
        <ellipse cx="50" cy="72" rx="24" ry="7" fill="#241418" />
        <polygon points="8,80 38,64 44,68 16,88" fill="#d9cbb8" />
        <polygon points="10,80 36,66 38,68 14,84" fill="#f2e6d4" />
        <polygon points="6,8 22,70 12,72" fill={accent} opacity="0.16" />
        <polygon points="94,6 76,68 86,70" fill="#fff" opacity="0.12" />
        <circle cx="8" cy="10" r="1.4" fill="#fff" filter={`url(#glow-${uid})`} />
        <circle cx="92" cy="8" r="1.4" fill={accent} filter={`url(#glow-${uid})`} />
    </g>
);

const Festival: React.FC<{ uid: string; accent: string; kind: LandmarkKind; cityId: string }> = ({ uid, accent, kind, cityId }) => (
    <g>
        <Landmark kind={kind} cityId={cityId} accent={accent} uid={uid} />
        <rect x="14" y="14" width="72" height="2.2" fill="#4a4034" />
        <rect x="16" y="14" width="1.6" height="36" fill="#4a4034" />
        <rect x="82" y="14" width="1.6" height="36" fill="#4a4034" />
        <polygon points="18,16 42,46 36,48" fill="#fff" opacity="0.14" />
        <polygon points="82,16 58,46 64,48" fill={accent} opacity="0.2" />
        {Array.from({ length: 26 }, (_, index) => {
            const row = Math.floor(index / 13);
            const col = index % 13;
            return <ellipse key={index} cx={8 + col * 6.8} cy={76 + row * 9} rx="2.6" ry="4.2" fill="#07060a" />;
        })}
        {Array.from({ length: 16 }, (_, index) => (
            <circle key={index} className="flicker" cx={10 + (index % 8) * 10} cy={74 + Math.floor(index / 8) * 8} r="0.55" fill={index % 2 ? accent : '#fff'} filter={`url(#glow-${uid})`} style={{ animationDelay: `${(index % 5) * 0.18}s` }} />
        ))}
    </g>
);

const Rooftop: React.FC<{ uid: string; accent: string; kind: LandmarkKind; cityId: string }> = ({ uid, accent, kind, cityId }) => (
    <g>
        <Landmark kind={kind} cityId={cityId} accent={accent} uid={uid} distant={kind === 'burj' || kind === 'eiffel'} />
        <rect x="8" y="64" width="84" height="6" fill="#1a1612" />
        <rect x="18" y="54" width="5" height="10" fill="#2a241c" />
        <ellipse cx="20.5" cy="53" rx="4" ry="1.6" fill="#3a342c" />
        {[28, 50, 72].map(x => (
            <ellipse key={x} cx={x} cy="72" rx="7" ry="2.1" fill="#ffd59a" opacity="0.9" filter={`url(#glow-${uid})`} />
        ))}
        <polygon points="22,70 34,48 40,48" fill="#ffd59a" opacity="0.18" />
        <polygon points="78,70 64,48 58,48" fill="#ffd59a" opacity="0.16" />
    </g>
);

const PlaceSvg: React.FC<{ scene: CampaignScene; accent: string; kind: LandmarkKind; instance: string }> = ({ scene, accent, kind, instance }) => {
    const uid = uidOf(scene, instance);
    let body: React.ReactNode;
    if (scene.formatId === 'airport_screens') body = <Airport uid={uid} accent={accent} kind={kind} cityId={scene.cityId} />;
    else if (scene.formatId === 'mall_screens') body = <Mall uid={uid} accent={accent} />;
    else if (scene.formatId === 'city_screens') body = <Street uid={uid} accent={accent} kind={kind} cityId={scene.cityId} />;
    else if (scene.effect === 'stunt') body = (
        <>
            <Landmark kind={kind} cityId={scene.cityId} accent={accent} uid={uid} distant />
            <Arena uid={uid} accent={accent} />
        </>
    );
    else if (scene.effect === 'festival') body = <Festival uid={uid} accent={accent} kind={kind} cityId={scene.cityId} />;
    else if (scene.effect === 'banner') body = scene.cityId === 'prg'
        ? <Prague uid={uid} accent={accent} />
        : <Landmark kind={kind} cityId={scene.cityId} accent={accent} uid={uid} />;
    else if (scene.effect === 'billboard') body = <Rooftop uid={uid} accent={accent} kind={kind} cityId={scene.cityId} />;
    else if (scene.effect === 'drone') body = (
        <g transform="translate(0 28) scale(1 0.7)">
            <Landmark kind={kind} cityId={scene.cityId} accent={accent} uid={uid} />
        </g>
    );
    else body = <Landmark kind={kind} cityId={scene.cityId} accent={accent} uid={uid} />;
    return (
        <svg className="place-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <SkyDefs uid={uid} accent={accent} />
            <rect width="100" height="100" fill={`url(#sky-${uid})`} />
            <circle cx="78" cy="14" r="7" fill={`url(#moon-${uid})`} />
            {scene.effect === 'drone' && Array.from({ length: 18 }, (_, index) => (
                <circle key={index} cx={(index * 17) % 96 + 2} cy={(index * 13) % 40 + 4} r="0.28" fill="#fff" opacity="0.8" />
            ))}
            {body}
            <rect x="0" y="72" width="100" height="28" fill={`url(#haze-${uid})`} />
        </svg>
    );
};

export const SceneStage: React.FC<{ scene: CampaignScene; title: string; poster?: string; replayKey?: number; accent?: string; markId?: string; letter?: string; lockupId?: string }> = ({ scene, title, poster, replayKey = 0, accent = '#E4B15A', markId, letter = 'S', lockupId }) => {
    const instance = useId();
    const reduce = useReducedMotion();
    const posed = typeof navigator !== 'undefined' && (navigator.webdriver || new URLSearchParams(window.location.search).get('still') === '1');
    const word = (title || 'TITLE').toUpperCase();
    const kind = landmarkFor(scene.cityId, scene.effect === 'drone' ? 'drone' : undefined).kind;
    const boxes = surfacesFor(scene, kind);
    const moving = !reduce && !posed;
    return (
        <div className="stage" data-effect={scene.effect} data-city={scene.cityId} data-place={kind} data-photo-slot={scene.backdrop ? 'filled' : 'empty'} key={replayKey}>
            <PlaceSvg scene={scene} accent={accent} kind={kind} instance={instance} />
            {scene.backdrop ? <div className="scene-photo" style={{ backgroundImage: `url(${scene.backdrop})` }} /> : null}
            {scene.effect === 'drone' && <Drones label={word} mark={markId || 'play'} letter={letter} reduce={!moving} accent={accent} />}
            {scene.effect === 'stunt' && moving && <i className="streak" />}
            {boxes.map((box, index) => (
                <div
                    key={`${box.x}-${box.y}`}
                    className={`surface-rig ${scene.effect === 'banner' && moving ? 'banner-drop' : ''}`}
                    style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                >
                    <div className={`tilt ${scene.frame === '1:9' ? 'ratio-1-9' : ''}`} style={{ transform: box.transform, ['--glow' as string]: accent }}>
                        <FitArt title={word} poster={poster} frame={scene.frame} accent={accent} markId={index === 0 ? markId : undefined} letter={letter} lockupId={lockupId} />
                        {scene.effect === 'led' && moving && <i className="led-scan" style={{ background: `linear-gradient(transparent, ${accent}, #fff, transparent)` }} />}
                    </div>
                    {(scene.effect === 'billboard' || scene.effect === 'screen') && index === boxes.length - 1 && (
                        <div className="mirror" aria-hidden="true">
                            <FitArt title={word} poster={poster} frame={scene.frame} accent={accent} letter={letter} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
