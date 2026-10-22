import React from 'react';
import { LaunchRegionId } from '../../types';
import { MARKET_COUNTRIES, REGION_CITIES } from '../../services/ownPlatform/catalog';

export const headingFont = '"Barlow Condensed", "Arial Narrow", Impact, sans-serif';

export const Shell: React.FC<{ children: React.ReactNode; onBack: () => void; kicker: string; title: string; step: string }> = ({ children, onBack, kicker, title, step }) => (
    <div className="fixed inset-0 z-[180] bg-[#07080d] text-white overflow-hidden flex flex-col" data-screen="own-platform" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header className="shrink-0 px-4 lg:px-10 pt-4 pb-3 flex items-start justify-between gap-4 border-b border-white/5">
            <div className="min-w-0">
                <button onClick={onBack} className="ae-tap text-[11px] uppercase tracking-[0.22em] text-zinc-500 hover:text-white mb-2">Back</button>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff4d4d]">{kicker}</div>
                <h1 className="text-[clamp(1.6rem,7vw,3.75rem)] font-extrabold uppercase leading-[0.9] tracking-tight break-words" style={{ fontFamily: headingFont }}>{title}</h1>
            </div>
            {step ? <div className="text-sm font-bold text-zinc-400 shrink-0 pt-8">{step}</div> : null}
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
    </div>
);

export const FooterBar: React.FC<{
    leftLabel: string;
    leftValue: string;
    money: string;
    onBack?: () => void;
    onNext?: () => void;
    nextLabel: string;
    disabled?: boolean;
}> = ({ leftLabel, leftValue, money, onBack, onNext, nextLabel, disabled }) => (
    <div className="sticky bottom-0 z-10 shrink-0 border-t border-white/10 bg-[#0c0e14]/95 backdrop-blur px-4 lg:px-10 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-zinc-400">
            <div>
                <div className="text-[10px] text-zinc-500">{leftLabel}</div>
                <div className="text-white font-bold normal-case tracking-normal text-sm">{leftValue}</div>
            </div>
            <div className="hidden sm:block h-8 w-px bg-white/10" />
            <div>
                <div className="text-[10px] text-zinc-500">Money</div>
                <div className="text-white font-black text-sm">{money}</div>
            </div>
        </div>
        <div className="flex-1" />
        <div className="flex gap-2">
            {onBack && (
                <button onClick={onBack} className="px-5 py-3 rounded-full border border-white/15 text-xs font-bold tracking-[0.14em] uppercase text-zinc-300 hover:bg-white/5">Back</button>
            )}
            {onNext && (
                <button onClick={onNext} disabled={disabled} className="flex-1 lg:flex-none px-8 py-3 rounded-full bg-[#ff3b30] text-white text-xs font-black tracking-[0.16em] uppercase disabled:opacity-40">{nextLabel}</button>
            )}
        </div>
    </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; active?: boolean; onClick?: () => void }> = ({ children, className = '', active, onClick }) => (
    <div
        onClick={onClick}
        className={`rounded-3xl border bg-[#12151c] p-4 ${active ? 'border-[#ff3b30]' : 'border-white/10'} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
        {children}
    </div>
);

export const WorldDots: React.FC<{ selected: string[]; served?: Record<string, number> }> = ({ selected, served }) => (
    <svg viewBox="0 0 100 56" className="w-full h-44 lg:h-64 rounded-2xl bg-[#0b3a66]">
        <ellipse cx="22" cy="24" rx="16" ry="10" fill="#166534" opacity="0.55" />
        <ellipse cx="30" cy="40" rx="8" ry="12" fill="#166534" opacity="0.5" />
        <ellipse cx="50" cy="22" rx="10" ry="8" fill="#166534" opacity="0.5" />
        <ellipse cx="54" cy="34" rx="9" ry="12" fill="#166534" opacity="0.45" />
        <ellipse cx="74" cy="28" rx="14" ry="10" fill="#166534" opacity="0.5" />
        <ellipse cx="86" cy="42" rx="7" ry="5" fill="#166534" opacity="0.45" />
        {MARKET_COUNTRIES.map(country => {
            const on = selected.includes(country.id);
            const ratio = served?.[country.regionId] ?? (on ? 0.5 : 0);
            const fill = !on ? '#94a3b8' : ratio >= 0.9 ? '#4ade80' : ratio >= 0.45 ? '#facc15' : '#fb7185';
            return <rect key={country.id} x={country.x - 1.1} y={country.y * 0.56 - 1.1} width="2.2" height="2.2" rx="0.4" fill={fill} />;
        })}
    </svg>
);

export const NetworkMap: React.FC<{ regions: LaunchRegionId[]; served: Record<string, number> }> = ({ regions, served }) => (
    <svg viewBox="0 0 100 56" className="w-full h-48 lg:h-72 rounded-2xl bg-gradient-to-b from-[#0c4a6e] to-[#082f49]">
        <ellipse cx="22" cy="22" rx="18" ry="11" fill="#0f766e" opacity="0.35" />
        <ellipse cx="32" cy="40" rx="9" ry="12" fill="#0f766e" opacity="0.3" />
        <ellipse cx="50" cy="20" rx="12" ry="8" fill="#0f766e" opacity="0.3" />
        <ellipse cx="56" cy="36" rx="10" ry="13" fill="#0f766e" opacity="0.28" />
        <ellipse cx="76" cy="28" rx="16" ry="11" fill="#0f766e" opacity="0.3" />
        <ellipse cx="88" cy="44" rx="8" ry="5" fill="#0f766e" opacity="0.28" />
        {(Object.keys(REGION_CITIES) as LaunchRegionId[]).flatMap(regionId => REGION_CITIES[regionId].map(city => {
            const on = regions.includes(regionId);
            const ratio = served[regionId] ?? 0;
            const fill = !on ? '#64748b' : ratio >= 0.9 ? '#4ade80' : ratio >= 0.45 ? '#facc15' : '#fb7185';
            return <rect key={city.id} x={city.x - 1.2} y={city.y * 0.56 - 1.2} width="2.4" height="2.4" rx="0.3" fill={fill} />;
        }))}
    </svg>
);

export const Stepper: React.FC<{ value: number; onChange: (next: number) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => (
    <div className="flex items-center gap-3">
        <button disabled={disabled} onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 rounded-full border border-white/15 text-lg leading-none disabled:opacity-30">–</button>
        <div className="w-8 text-center font-black">{value}</div>
        <button disabled={disabled} onClick={() => onChange(value + 1)} className="w-8 h-8 rounded-full border border-white/15 text-lg leading-none disabled:opacity-30">+</button>
    </div>
);

export const MoneyBar: React.FC<{ ratio: number }> = ({ ratio }) => (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden w-28 sm:w-40">
        <div className="h-full bg-[#ff3b30]" style={{ width: `${Math.max(6, Math.min(100, ratio * 100))}%` }} />
    </div>
);
