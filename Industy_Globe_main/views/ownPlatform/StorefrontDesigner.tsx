import React, { useState } from 'react';
import { OwnPlatformState, Player } from '../../types';
import { StorefrontLayout } from '../../services/ownPlatform/catalog';
import {
    STOREFRONT_CATEGORIES,
    storefrontAccess,
    storefrontEffectLine,
    storefrontMeta,
    storefrontsInCategory,
} from '../../services/ownPlatform/storefronts';
import { markById } from '../../services/ownPlatform/brand';
import { headingFont } from './ui';

type ViewerMode = 'phone' | 'tv' | 'web';

interface Props {
    player: Player;
    state: OwnPlatformState;
    locked: boolean;
    onChange: (next: OwnPlatformState) => void;
}

const POSTERS = [
    { title: 'Dead Signal', color: '#3a1d4a' },
    { title: 'Low Tide', color: '#0e3a3a' },
    { title: 'Paper Cranes', color: '#4a2a14' },
    { title: 'Grey Hour', color: '#1c2433' },
    { title: 'Third Mainland', color: '#3a2a12' },
    { title: 'North of Roma', color: '#3a1218' },
];

const Poster: React.FC<{ title: string; color: string; tall?: boolean }> = ({ title, color, tall }) => (
    <div className="rounded-md overflow-hidden flex items-end p-1.5 min-w-0" style={{ background: `linear-gradient(160deg, ${color}, #07080d)`, minHeight: tall ? 92 : 54 }}>
        <span className="text-[9px] font-black uppercase leading-tight text-white/90">{title}</span>
    </div>
);

const LayoutBody: React.FC<{ layout: StorefrontLayout; accent: string }> = ({ layout, accent }) => {
    const hero = POSTERS[0];
    if (layout.id === 'billboard' || layout.id === 'prestige') {
        return <Poster title={hero.title} color={layout.id === 'prestige' ? '#1a1a1a' : hero.color} tall />;
    }
    if (layout.id === 'grid') {
        return <div className="grid grid-cols-3 gap-1">{POSTERS.map(row => <Poster key={row.title} title={row.title} color={row.color} />)}</div>;
    }
    if (layout.id === 'search-first') {
        return (
            <div>
                <div className="rounded-full bg-white/10 px-2 py-1.5 text-[10px] text-zinc-400 mb-2">Search the shelf</div>
                {POSTERS.slice(0, 3).map(row => <div key={row.title} className="text-[10px] py-1 border-b border-white/10">{row.title}</div>)}
            </div>
        );
    }
    if (layout.id === 'trending') {
        return (
            <div className="space-y-1">
                {POSTERS.slice(0, 4).map((row, index) => (
                    <div key={row.title} className="flex items-center gap-2 text-[10px]">
                        <span style={{ color: accent }} className="font-black">{index + 1}</span>
                        <span>{row.title}</span>
                    </div>
                ))}
            </div>
        );
    }
    if (layout.id === 'genre-rooms' || layout.id === 'kids-gate') {
        const rooms = layout.id === 'kids-gate' ? ['Stories', 'Songs'] : ['Horror', 'Romance', 'Sport'];
        return <div className="grid grid-cols-3 gap-1">{rooms.map((room, index) => <div key={room} className="rounded-lg p-2 text-[10px] font-bold" style={{ background: POSTERS[index].color }}>{room}</div>)}</div>;
    }
    if (layout.id === 'continue') {
        return POSTERS.slice(0, 2).map(row => (
            <div key={row.title} className="mb-2">
                <div className="text-[10px]">{row.title}</div>
                <div className="h-1 rounded-full bg-white/10 mt-1"><div className="h-full rounded-full" style={{ width: '46%', background: accent }} /></div>
            </div>
        ));
    }
    if (layout.id === 'sports-lane') {
        return (
            <div>
                <div className="text-[10px] font-black mb-1" style={{ color: accent }}>LIVE · MATCH NIGHT</div>
                <div className="grid grid-cols-3 gap-1">{POSTERS.slice(0, 3).map(row => <Poster key={row.title} title={row.title} color={row.color} />)}</div>
            </div>
        );
    }
    if (layout.id === 'local-first') {
        return (
            <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">In this country</div>
                <div className="grid grid-cols-3 gap-1">{POSTERS.slice(0, 3).map(row => <Poster key={row.title} title={row.title} color={row.color} />)}</div>
            </div>
        );
    }
    if (layout.id === 'bundles') {
        return (
            <div className="flex flex-wrap gap-1">
                {['Films', 'Sport', 'Kids'].map(label => <span key={label} className="text-[10px] rounded-full px-2 py-1 border border-white/15">{label}</span>)}
            </div>
        );
    }
    if (layout.id === 'editorial') {
        return (
            <div>
                <div className="text-[11px] font-black uppercase mb-1" style={{ color: accent }}>Tonight’s pick</div>
                <Poster title={hero.title} color={hero.color} tall />
            </div>
        );
    }
    return (
        <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Because you watched</div>
            <div className="grid grid-cols-3 gap-1">{POSTERS.slice(0, 3).map(row => <Poster key={row.title} title={row.title} color={row.color} />)}</div>
        </div>
    );
};

const Frame: React.FC<{ mode: ViewerMode; name: string; layout: StorefrontLayout; accent: string }> = ({ mode, name, layout, accent }) => {
    const body = (
        <div className="bg-[#07080d] text-white p-2 h-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: accent }}>{name}</span>
                <span className="text-[9px] text-zinc-500">{layout.name}</span>
            </div>
            <LayoutBody layout={layout} accent={accent} />
        </div>
    );
    if (mode === 'tv') {
        return <div className="rounded-xl border-8 border-zinc-800 bg-black overflow-hidden aspect-video">{body}</div>;
    }
    if (mode === 'web') {
        return (
            <div className="rounded-xl border border-white/15 overflow-hidden bg-[#10121a]">
                <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10">
                    <i className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                    <i className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
                    <i className="w-2 h-2 rounded-full bg-[#28C840]" />
                    <span className="ml-2 text-[9px] text-zinc-500 truncate">watch.{name.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'service'}.tv</span>
                </div>
                <div className="aspect-video">{body}</div>
            </div>
        );
    }
    return <div className="mx-auto w-[210px] max-w-full rounded-[28px] border-4 border-zinc-700 overflow-hidden bg-black aspect-[9/16] max-h-[420px]">{body}</div>;
};

export const StorefrontDesigner: React.FC<Props> = ({ player, state, locked, onChange }) => {
    const [mode, setMode] = useState<ViewerMode>('phone');
    const [previewId, setPreviewId] = useState(state.storefrontId);
    const progress = {
        fame: player.stats?.fame || 0,
        cash: state.books?.cash || 0,
        subscribers: state.subscribers || 0,
        weeksLive: state.weeksLive || 0,
        currentId: state.storefrontId,
    };
    const layouts = STOREFRONT_CATEGORIES.flatMap(category => storefrontsInCategory(category));
    const preview = layouts.find(row => row.id === previewId) || layouts[0];
    const accent = markById(state.brand?.markId).accent;
    const access = storefrontAccess(preview.id, progress);

    const choose = (layout: StorefrontLayout) => {
        setPreviewId(layout.id);
        const gate = storefrontAccess(layout.id, progress);
        if (!locked && gate.unlocked) onChange({ ...state, storefrontId: layout.id });
    };

    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4" data-screen="storefront-designer">
            <div className="order-2 lg:order-1 space-y-4">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Storefront</div>
                    <h2 className="text-3xl lg:text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>How the shelf greets them</h2>
                    <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Preview first. A locked layout can still be looked at. The green line is what the weekly forecast uses for new viewers and for how many of them stay.</p>
                </div>
                {STOREFRONT_CATEGORIES.map(category => (
                    <div key={category}>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">{category}</div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {storefrontsInCategory(category).map(layout => {
                                const gate = storefrontAccess(layout.id, progress);
                                const active = state.storefrontId === layout.id;
                                const looking = preview.id === layout.id;
                                return (
                                    <button
                                        key={layout.id}
                                        type="button"
                                        onClick={() => choose(layout)}
                                        className={`text-left rounded-2xl border p-4 ${active ? 'border-[#4F3BFF] bg-[#4F3BFF]/15' : looking ? 'border-white/30 bg-white/5' : 'border-white/10 bg-[#12151c]'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-black text-xl uppercase" style={{ fontFamily: headingFont }}>{layout.name}</div>
                                            {!gate.unlocked && <span className="text-[10px] uppercase tracking-wider text-amber-200">Locked</span>}
                                            {active && <span className="text-[10px] uppercase tracking-wider text-emerald-300">On air</span>}
                                        </div>
                                        <p className="text-sm text-zinc-400 mt-1">{layout.blurb}</p>
                                        <p className="text-sm text-emerald-200 mt-2">{storefrontEffectLine(layout)}.</p>
                                        {!gate.unlocked && <p className="text-xs text-amber-200/90 mt-2">{gate.because}</p>}
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-2">{storefrontMeta(layout.id).category} · tier {gate.tier}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <aside className="order-1 lg:order-2 lg:sticky lg:top-3 self-start rounded-3xl border border-white/10 bg-[#0c0e16]/90 p-4">
                <div className="flex gap-1 mb-3">
                    {(['phone', 'tv', 'web'] as ViewerMode[]).map(id => (
                        <button key={id} type="button" onClick={() => setMode(id)} className={`flex-1 rounded-full py-2 text-[11px] font-black uppercase tracking-wider ${mode === id ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}>
                            {id === 'tv' ? 'TV' : id === 'web' ? 'Web' : 'Phone'}
                        </button>
                    ))}
                </div>
                <Frame mode={mode} name={state.name || 'Empire+'} layout={preview} accent={accent} />
                <div className="mt-3 text-sm font-bold">{preview.name}</div>
                <p className="text-sm text-emerald-200 mt-1">{storefrontEffectLine(preview)}.</p>
                <p className="text-xs text-zinc-400 mt-2">{access.unlocked ? 'This is what opening night will use.' : access.because}</p>
            </aside>
        </div>
    );
};
