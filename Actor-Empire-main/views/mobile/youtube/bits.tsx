import React from 'react';

export const formatCompact = (num: number) => {
    if (!Number.isFinite(num)) return '0';
    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${(num / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
    return Math.floor(num).toLocaleString();
};

export const formatMoney = (num: number) => {
    const sign = num < 0 ? '-' : '';
    return `${sign}$${formatCompact(Math.abs(num))}`;
};

export const Logo = ({ small = false, onClick }: { small?: boolean; onClick?: () => void }) => (
    <button type="button" className={`logo${small ? ' sm' : ''}`} onClick={onClick} aria-label="YouTube Empire">
        <svg className="tab" viewBox="0 0 44 32" aria-hidden>
            <defs>
                <linearGradient id={small ? 'ytlg2' : 'ytlg'} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ff4256" />
                    <stop offset="1" stopColor="#c3001f" />
                </linearGradient>
            </defs>
            <path d="M6 4h28l6 6v14a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V10a6 6 0 0 1 6-6z" fill={`url(#${small ? 'ytlg2' : 'ytlg'})`} />
            <path d="M4 4.6l5 0-3 4H1.2zM14 4h5l-3 4.6h-5zM24 4h5l-3 4.6h-5z" fill="#fff" opacity=".28" />
            <path d="M17 12.5l11 6.5-11 6.5z" fill="#fff" />
        </svg>
        <span className="wm">You<b>Tube</b></span>
        <span className="studio-tag">EMPIRE</span>
    </button>
);

export const Av = ({ kind, size = 36, label }: { kind: 'me' | 'studio' | 'eplus' | 'letter'; size?: number; label?: string }) => {
    if (kind === 'studio') return <div className="av avs" style={{ width: size, height: size }}><svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5}><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#fff" /></svg></div>;
    if (kind === 'eplus') return <div className="av ave" style={{ width: size, height: size, fontSize: size * 0.36 }}>E+</div>;
    const text = (label || 'A').slice(0, 1).toUpperCase();
    return <div className="av" style={{ width: size, height: size, background: kind === 'me' ? 'linear-gradient(135deg,#ff5a6c,#7c3aed)' : 'linear-gradient(135deg,#10b981,#0ea5e9)', fontSize: size * 0.38 }}>{text}</div>;
};

const TONES = ['poster-hero', 'poster-song', 'poster-interview', 'poster-bts', 'poster-scifi', 'poster-series', 'poster-live', 'poster-short'];
export const toneFor = (seed: string) => TONES[Math.abs(hash(seed)) % TONES.length];
const hash = (value: string) => {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
    return h;
};

export const Thumb = ({
    tone = 'poster-hero', ratio = '16/9', badge, badgeC = 'red', title, sub, dur, progress,
}: {
    tone?: string; ratio?: string; badge?: string; badgeC?: string; title?: string; sub?: string; dur?: string; progress?: number;
}) => (
    <div className="th" style={{ aspectRatio: ratio }}>
        <div className={`bg ${tone}`} />
        <div className="thgrad" />
        {badge && <span className={`tb tb-${badgeC}`}>{badge}</span>}
        {title && <div className="thbig">{title}{sub && <small>{sub}</small>}</div>}
        {dur && <span className="dur">{dur}</span>}
        {progress ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,.25)' }}><i style={{ display: 'block', height: '100%', width: `${progress}%`, background: 'var(--red)' }} /></div> : null}
    </div>
);

export const Spark = ({ values, color = '#ff2e43' }: { values: number[]; color?: string }) => {
    const max = Math.max(...values, 1);
    const w = 220;
    const h = 54;
    const pts = values.map((v, i) => [i * (w / Math.max(1, values.length - 1)), h - 4 - (v / max) * (h - 8)]);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
            <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={color} opacity=".18" />
            <path d={d} fill="none" stroke={color} strokeWidth="2" />
        </svg>
    );
};

export const Gauge = ({ value, color = '#ff2e43', label }: { value: number; color?: string; label: string }) => {
    const r = 42;
    const c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, value));
    return (
        <div className="gauge">
            <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="48" cy="48" r={r} stroke="#23232d" strokeWidth="9" fill="none" />
                <circle cx="48" cy="48" r={r} stroke={color} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={`${c * v / 100} ${c}`} />
            </svg>
            <div className="c"><div><b>{Math.round(v)}</b><div className="lbl">{label}</div></div></div>
        </div>
    );
};
