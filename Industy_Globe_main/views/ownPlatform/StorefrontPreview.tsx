import React from 'react';
import type { StorefrontLayout } from '../../services/ownPlatform/catalog';

export type PreviewDevice = 'desktop' | 'tv' | 'phone';

const POSTERS = [
    { title: 'Dead Signal', tone: '#312e81' },
    { title: 'Monsoon Office', tone: '#b45309' },
    { title: 'Third Mainland', tone: '#047857' },
    { title: 'Paper Cranes', tone: '#be123c' },
    { title: 'Low Tide Club', tone: '#0369a1' },
    { title: 'North of Roma', tone: '#c2410c' },
    { title: 'Grey Hour', tone: '#3f3f46' },
    { title: 'Salt on the Lens', tone: '#57534e' },
];

const Poster: React.FC<{ title: string; tone: string; tall?: boolean }> = ({ title, tone, tall }) => (
    <div className={`rounded-md overflow-hidden flex items-end p-1.5 text-[9px] font-black leading-tight ${tall ? 'h-24' : 'h-14'} min-w-0`} style={{ background: `linear-gradient(160deg, ${tone}, #09090b)` }}>
        <span className="line-clamp-2">{title}</span>
    </div>
);

const Screen: React.FC<{ layout: StorefrontLayout; name: string; localLanguage: string }> = ({ layout, name, localLanguage }) => {
    const id = layout.id;
    const hero = POSTERS[0];
    if (id === 'billboard') {
        return (
            <div className="h-full bg-black text-white flex flex-col">
                <div className="flex-1 relative" style={{ background: `linear-gradient(90deg, #000 0%, transparent 40%), linear-gradient(160deg, ${hero.tone}, #111)` }}>
                    <div className="absolute top-2 left-2 text-[9px] tracking-[0.2em] uppercase opacity-70">{name}</div>
                    <div className="absolute bottom-2 left-2 right-2">
                        <div className="text-[10px] uppercase tracking-widest text-white/70">Tonight</div>
                        <div className="text-lg font-black leading-none">{hero.title}</div>
                        <div className="mt-1 h-1.5 w-16 rounded-full bg-white" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-1 p-1.5">{POSTERS.slice(1, 5).map(poster => <Poster key={poster.title} {...poster} />)}</div>
            </div>
        );
    }
    if (id === 'rails') {
        return (
            <div className="h-full bg-[#0c0c10] text-white p-2 space-y-1.5 overflow-hidden">
                <div className="text-[10px] font-black">{name}</div>
                {['Because you watched', 'New this week', 'Critically adored'].map((rail, index) => (
                    <div key={rail}>
                        <div className="text-[8px] text-zinc-400 mb-0.5">{rail}</div>
                        <div className="grid grid-cols-4 gap-1">{POSTERS.slice(index, index + 4).map(poster => <Poster key={rail + poster.title} {...poster} />)}</div>
                    </div>
                ))}
            </div>
        );
    }
    if (id === 'kids-gate') {
        return (
            <div className="h-full text-[#1c1917] p-2" style={{ background: 'linear-gradient(180deg, #fde68a, #86efac)' }}>
                <div className="flex items-center justify-between">
                    <div className="text-sm font-black">Kids</div>
                    <div className="text-[8px] font-bold bg-white/70 rounded-full px-1.5 py-0.5">Grown-ups</div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {POSTERS.slice(0, 4).map(poster => (
                        <div key={poster.title} className="rounded-2xl h-16 flex items-end p-1.5 text-[10px] font-black text-white" style={{ background: poster.tone }}>{poster.title}</div>
                    ))}
                </div>
            </div>
        );
    }
    if (id === 'local-first') {
        const local = POSTERS[1];
        return (
            <div className="h-full bg-[#0c0c10] text-white p-2">
                <div className="text-[10px] font-black">{name}</div>
                <div className="text-[8px] uppercase tracking-wider text-amber-200 mt-1">{localLanguage} first</div>
                <div className="mt-1 rounded-lg h-16 flex items-end p-2 font-black" style={{ background: `linear-gradient(160deg, ${local.tone}, #111)` }}>{local.title}</div>
                <div className="text-[8px] text-zinc-400 mt-1.5">Then the rest of the world</div>
                <div className="grid grid-cols-4 gap-1 mt-0.5">{POSTERS.slice(2, 6).map(poster => <Poster key={poster.title} {...poster} />)}</div>
            </div>
        );
    }
    if (id === 'editorial') {
        return (
            <div className="h-full bg-[#f5f0e6] text-[#1c1917] p-2">
                <div className="text-[8px] tracking-[0.25em] uppercase">{name}</div>
                <div className="text-lg font-black leading-none mt-1">The film everyone will argue about</div>
                <div className="text-[9px] mt-1 opacity-70">{hero.title} · a note from the editors</div>
            </div>
        );
    }
    if (id === 'grid') {
        return (
            <div className="h-full bg-[#0c0c10] p-2">
                <div className="grid grid-cols-4 gap-1">{POSTERS.map(poster => <Poster key={poster.title} {...poster} tall />)}</div>
            </div>
        );
    }
    if (id === 'genre-rooms') {
        return (
            <div className="h-full bg-[#0c0c10] text-white grid grid-cols-3 gap-1 p-2">
                {['Horror', 'Romance', 'Sport'].map((room, index) => (
                    <div key={room} className="rounded-xl flex items-end p-1.5 font-black text-xs" style={{ background: POSTERS[index].tone }}>{room}</div>
                ))}
            </div>
        );
    }
    if (id === 'continue') {
        return (
            <div className="h-full bg-[#0c0c10] text-white p-2 space-y-1">
                <div className="text-[10px] font-black">Continue watching</div>
                {POSTERS.slice(0, 3).map((poster, index) => (
                    <div key={poster.title}>
                        <div className="text-[9px]">{poster.title}</div>
                        <div className="h-1 rounded-full bg-white/10 mt-0.5"><div className="h-full rounded-full bg-rose-400" style={{ width: `${35 + index * 20}%` }} /></div>
                    </div>
                ))}
            </div>
        );
    }
    if (id === 'sports-lane') {
        return (
            <div className="h-full bg-[#07111f] text-white p-2">
                <div className="text-[8px] text-emerald-300">LIVE</div>
                <div className="text-sm font-black">City 2 · Harbor 2</div>
                <div className="text-[9px] text-zinc-400">64:12 · then the catalogue</div>
                <div className="grid grid-cols-3 gap-1 mt-2">{POSTERS.slice(0, 3).map(poster => <Poster key={poster.title} {...poster} />)}</div>
            </div>
        );
    }
    if (id === 'prestige') {
        return (
            <div className="h-full bg-black text-white flex flex-col items-center justify-center text-center p-3">
                <div className="text-[8px] tracking-[0.3em] uppercase text-zinc-500">{name}</div>
                <div className="text-lg font-black mt-2">{hero.title}</div>
                <div className="text-[9px] text-zinc-500 mt-1">One poster. Then quiet.</div>
            </div>
        );
    }
    if (id === 'trending') {
        return (
            <div className="h-full bg-[#0c0c10] text-white p-2 space-y-1">
                <div className="text-[10px] font-black">Trending now</div>
                {POSTERS.slice(0, 4).map((poster, index) => (
                    <div key={poster.title} className="flex items-center gap-2 text-[10px]">
                        <span className="text-zinc-500 w-3">{index + 1}</span>
                        <span className="font-bold">{poster.title}</span>
                    </div>
                ))}
            </div>
        );
    }
    if (id === 'bundles') {
        return (
            <div className="h-full bg-[#0c0c10] text-white p-2">
                <div className="text-[10px] font-black">Add a channel</div>
                <div className="flex flex-wrap gap-1 mt-2">
                    {['Sport+', 'Kids', 'Prestige', 'Local'].map(chip => (
                        <span key={chip} className="text-[9px] rounded-full bg-white/10 px-2 py-1">{chip}</span>
                    ))}
                </div>
            </div>
        );
    }
    return (
        <div className="h-full bg-[#0c0c10] text-white p-3 flex flex-col justify-center">
            <div className="text-[8px] text-zinc-500">{name}</div>
            <div className="mt-2 h-8 rounded-full bg-white/10 px-3 flex items-center text-[10px] text-zinc-400">Search the catalogue</div>
        </div>
    );
};

const Frame: React.FC<{ device: PreviewDevice; children: React.ReactNode }> = ({ device, children }) => {
    if (device === 'phone') {
        return (
            <div data-testid="storefront-device-phone" className="mx-auto w-[168px] rounded-[22px] border-[6px] border-zinc-800 bg-black overflow-hidden shadow-lg" style={{ height: 280 }}>
                <div className="h-3 bg-black" />
                <div className="h-[250px] overflow-hidden">{children}</div>
            </div>
        );
    }
    if (device === 'tv') {
        return (
            <div data-testid="storefront-device-tv" className="mx-auto w-full max-w-[520px]">
                <div className="rounded-xl border-[8px] border-zinc-900 bg-black overflow-hidden shadow-lg aspect-video">{children}</div>
                <div className="mx-auto h-2 w-16 bg-zinc-800 rounded-b" />
            </div>
        );
    }
    return (
        <div data-testid="storefront-device-desktop" className="mx-auto w-full max-w-[560px] rounded-xl border border-white/10 bg-[#1c1f2e] overflow-hidden shadow-lg">
            <div className="h-6 flex items-center gap-1 px-2">
                <i className="w-2 h-2 rounded-full bg-rose-400" />
                <i className="w-2 h-2 rounded-full bg-amber-300" />
                <i className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="h-52 bg-black">{children}</div>
        </div>
    );
};

export const StorefrontPreview: React.FC<{ layout: StorefrontLayout; device: PreviewDevice; name: string; localLanguage: string }> = ({ layout, device, name, localLanguage }) => (
    <Frame device={device}>
        <Screen layout={layout} name={name} localLanguage={localLanguage} />
    </Frame>
);
