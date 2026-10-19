import React from 'react';
import { Player } from '../../types';
import { MARKET_COUNTRIES } from '../../services/ownPlatform/catalog';
import { calendarEntries, postponeRelease, updateReleaseSlot } from '../../services/ownPlatform/studio';
import { headingFont } from './ui';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

export const ReleaseCalendar: React.FC<Props> = ({ player, onPlayer }) => {
    const state = player.ownPlatform;
    if (!state) return null;
    const slot = state.releaseSlot;
    const rows = calendarEntries(player);
    const weeks = Array.from({ length: 8 }, (_, offset) => offset);
    const country = MARKET_COUNTRIES.find(row => row.id === slot?.countryId) || MARKET_COUNTRIES[0];
    const yours = rows.find(row => row.yours);
    const clashes = rows.filter(row => row.clash && !row.yours);

    return (
        <div className="space-y-4" data-screen="release-calendar">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#ff4d4d]">Release date</div>
                    <h3 className="text-3xl lg:text-5xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Where it opens, and who else is there</h3>
                    <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Pick the country, the language, and the week. Other houses already have dates. A clash is the same week in the same country or region. You can postpone.</p>
                </div>
                <button onClick={() => onPlayer(postponeRelease(player))} className="px-5 py-3 rounded-full bg-[#ff3b30] text-xs font-black uppercase tracking-wider">Postpone a week</button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Title
                    <input value={slot?.title || ''} onChange={(event) => onPlayer(updateReleaseSlot(player, { title: event.target.value.slice(0, 80) }))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white" />
                </label>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Country
                    <select value={slot?.countryId || country.id} onChange={(event) => onPlayer(updateReleaseSlot(player, { countryId: event.target.value }))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white">
                        {MARKET_COUNTRIES.map(row => <option key={row.id} value={row.id}>{row.flag} {row.name}</option>)}
                    </select>
                </label>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Language
                    <select value={slot?.language || country.languages[0]?.name} onChange={(event) => onPlayer(updateReleaseSlot(player, { language: event.target.value }))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white">
                        {country.languages.map(language => <option key={language.name} value={language.name}>{language.name}</option>)}
                        {!country.languages.some(language => language.name === slot?.language) && slot?.language && <option value={slot.language}>{slot.language}</option>}
                    </select>
                </label>
                <div className="rounded-2xl border border-white/10 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">Your week</div>
                    <div className="font-black text-xl">Week {player.currentWeek + (slot?.weekOffset || 0)}</div>
                    <div className="text-xs text-zinc-400">{country.regionId.replace('_', ' ')} · {slot?.language}</div>
                </div>
            </div>
            {yours?.clash && (
                <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                    Clash on week {player.currentWeek + yours.weekOffset}. {clashes.map(row => `${row.house} opens ${row.title} in ${row.language}`).join(' · ')}. Postpone, or open somewhere else.
                </div>
            )}
            <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
                {weeks.map(offset => {
                    const items = rows.filter(row => row.weekOffset === offset);
                    return (
                        <div key={offset} className="min-w-[240px] lg:min-w-0 rounded-3xl border border-white/10 bg-[#10131a] p-3">
                            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Week {player.currentWeek + offset}</div>
                            <div className="space-y-2 mt-2">
                                {items.length === 0 && <div className="text-xs text-zinc-600">Clear.</div>}
                                {items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => item.yours ? undefined : onPlayer(updateReleaseSlot(player, { weekOffset: offset, countryId: item.countryId, language: item.language }))}
                                        className={`w-full text-left rounded-2xl px-3 py-2 border ${item.yours ? 'border-[#ff3b30] bg-[#ff3b30]/15' : item.clash ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/10 bg-black/20'}`}
                                    >
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{item.yours ? 'You' : item.house}</div>
                                        <div className="font-bold text-sm">{item.title}</div>
                                        <div className="text-[11px] text-zinc-400">{item.language} · {MARKET_COUNTRIES.find(row => row.id === item.countryId)?.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
