import React, { useEffect, useState } from 'react';
import { Player } from '../../types';
import { MARKET_COUNTRIES } from '../../services/ownPlatform/catalog';
import {
    calendarEntries,
    moveCatalogueRelease,
    shiftCatalogueRelease,
    shiftRelease,
    updateReleaseSlot,
} from '../../services/ownPlatform/studio';
import { offsetForWeekNumber, RELEASE_HORIZON, releaseWeekLabel, releaseWeekParts } from '../../services/ownPlatform/weeks';
import { headingFont } from './ui';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

const WINDOW = 8;

export const ReleaseCalendar: React.FC<Props> = ({ player, onPlayer }) => {
    const state = player.ownPlatform;
    const slot = state?.releaseSlot;
    const [selectedId, setSelectedId] = useState('slot');
    const [windowStart, setWindowStart] = useState(0);
    const [weekDraft, setWeekDraft] = useState('1');
    const rows = calendarEntries(player);
    const country = MARKET_COUNTRIES.find(row => row.id === slot?.countryId) || MARKET_COUNTRIES[0];
    const catalogue = state?.catalogue || [];
    const selectedOffset = selectedId === 'slot'
        ? (slot?.weekOffset ?? 0)
        : Number(catalogue.find(row => row.id === selectedId)?.releaseWeekOffset ?? slot?.weekOffset ?? 0);
    const selectedLabel = releaseWeekLabel(player.currentWeek, selectedOffset);
    const clashes = rows.filter(row => row.clash && row.yours && (selectedId === 'slot' ? row.id === 'slot' : row.id === selectedId));
    const doubleBooked = rows.filter(row => row.yours && row.weekOffset === selectedOffset).length > 1;
    const weeks = Array.from({ length: WINDOW }, (_, index) => windowStart + index).filter(offset => offset <= RELEASE_HORIZON);

    useEffect(() => {
        setWeekDraft(String(releaseWeekParts(player.currentWeek, selectedOffset).week));
    }, [player.currentWeek, selectedOffset]);

    useEffect(() => {
        setWindowStart(start => {
            if (selectedOffset >= start && selectedOffset < start + WINDOW) return start;
            return Math.max(0, Math.min(RELEASE_HORIZON - (WINDOW - 1), selectedOffset - 3));
        });
    }, [selectedOffset]);

    if (!state || !slot) return null;

    const moveTo = (offset: number) => {
        if (selectedId === 'slot') onPlayer(updateReleaseSlot(player, { weekOffset: offset }));
        else onPlayer(moveCatalogueRelease(player, selectedId, offset));
    };
    const shift = (delta: number) => {
        if (selectedId === 'slot') onPlayer(shiftRelease(player, delta));
        else onPlayer(shiftCatalogueRelease(player, selectedId, delta));
    };
    const jumpToWeek = () => {
        const week = Math.round(Number(weekDraft));
        if (!Number.isFinite(week)) return;
        moveTo(offsetForWeekNumber(player.currentWeek, week));
    };

    return (
        <div className="space-y-4" data-screen="release-calendar">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#ff4d4d]">Release date</div>
                    <h3 className="text-3xl lg:text-5xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Any week this year</h3>
                    <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Pick the film, then put it on any week from this one through the same week next year. A locked streaming deal waits for that week before it earns a view. Other houses already have dates. A clash is the same week in the same country or region.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => shift(-1)} className="px-4 py-3 rounded-full border border-white/15 text-xs font-black uppercase tracking-wider">Bring forward</button>
                    <button onClick={() => shift(1)} className="px-4 py-3 rounded-full bg-[#ff3b30] text-xs font-black uppercase tracking-wider">Postpone a week</button>
                </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Which film
                    <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white">
                        <option value="slot">{slot.title || 'Opening night'}</option>
                        {catalogue.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}
                    </select>
                </label>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Title
                    <input value={slot.title || ''} onChange={(event) => onPlayer(updateReleaseSlot(player, { title: event.target.value.slice(0, 80) }))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white" />
                </label>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Country
                    <select value={slot.countryId || country.id} onChange={(event) => onPlayer(updateReleaseSlot(player, { countryId: event.target.value }))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white">
                        {MARKET_COUNTRIES.map(row => <option key={row.id} value={row.id}>{row.flag} {row.name}</option>)}
                    </select>
                </label>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Language
                    <select value={slot.language || country.languages[0]?.name} onChange={(event) => onPlayer(updateReleaseSlot(player, { language: event.target.value }))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white">
                        {country.languages.map(language => <option key={language.name} value={language.name}>{language.name}</option>)}
                        {!country.languages.some(language => language.name === slot.language) && slot.language && <option value={slot.language}>{slot.language}</option>}
                    </select>
                </label>
            </div>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <div className="rounded-2xl border border-white/10 px-3 py-3" data-release-week={selectedLabel}>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">Chosen week</div>
                    <div className="font-black text-xl">{selectedLabel}</div>
                    <div className="text-xs text-zinc-400">{country.regionId.replace('_', ' ')} · {slot.language}. Views begin then, including a deal that is already locked.</div>
                </div>
                <label className="text-[11px] uppercase tracking-wider text-zinc-500">
                    Jump to week
                    <span className="mt-1 flex gap-2">
                        <input
                            value={weekDraft}
                            inputMode="numeric"
                            onChange={(event) => setWeekDraft(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                            onKeyDown={(event) => { if (event.key === 'Enter') jumpToWeek(); }}
                            className="w-20 bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white"
                            aria-label="Week number"
                        />
                        <button onClick={jumpToWeek} className="px-4 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider">Move there</button>
                    </span>
                </label>
            </div>
            {clashes.length > 0 && (
                <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                    Clash on {selectedLabel}. {rows.filter(row => row.clash && !row.yours && row.weekOffset === selectedOffset).map(row => `${row.house} opens ${row.title} in ${row.language}`).join(' · ')}. Move the film, or open somewhere else.
                </div>
            )}
            {doubleBooked && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                    Two of your titles open on {selectedLabel}.
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <button disabled={windowStart <= 0} onClick={() => setWindowStart(start => Math.max(0, start - 4))} className="px-4 py-2 rounded-full border border-white/15 text-xs uppercase tracking-wider disabled:opacity-30">Earlier</button>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Showing {releaseWeekLabel(player.currentWeek, weeks[0] || 0)} – {releaseWeekLabel(player.currentWeek, weeks[weeks.length - 1] || 0)}</div>
                <button disabled={windowStart >= RELEASE_HORIZON - (WINDOW - 1)} onClick={() => setWindowStart(start => Math.min(RELEASE_HORIZON - (WINDOW - 1), start + 4))} className="px-4 py-2 rounded-full border border-white/15 text-xs uppercase tracking-wider disabled:opacity-30">Later</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
                {weeks.map(offset => {
                    const items = rows.filter(row => row.weekOffset === offset);
                    const label = releaseWeekLabel(player.currentWeek, offset);
                    const selected = offset === selectedOffset;
                    return (
                        <button
                            key={offset}
                            type="button"
                            onClick={() => moveTo(offset)}
                            className={`min-w-[240px] lg:min-w-0 text-left rounded-3xl border p-3 ${selected ? 'border-[#ff3b30] bg-[#ff3b30]/10' : 'border-white/10 bg-[#10131a]'}`}
                        >
                            <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
                            <div className="space-y-2 mt-2">
                                {items.length === 0 && <div className="text-xs text-zinc-600">Clear. Open here.</div>}
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`rounded-2xl px-3 py-2 border ${item.yours ? 'border-[#ff3b30] bg-[#ff3b30]/15' : item.clash ? 'border-amber-300/50 bg-amber-300/10' : 'border-white/10 bg-black/20'}`}
                                    >
                                        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{item.yours ? 'You' : item.house}</div>
                                        <div className="font-bold text-sm">{item.title}</div>
                                        <div className="text-[11px] text-zinc-400">{item.language} · {MARKET_COUNTRIES.find(row => row.id === item.countryId)?.name}</div>
                                    </div>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
