import React, { useMemo, useState } from 'react';
import { OfficeSize, Player } from '../../types';
import { MARKET_COUNTRIES } from '../../services/ownPlatform/catalog';
import { formatCompact } from '../../services/ownPlatform/logic';
import {
    HQ_MOVE_USD,
    INCIDENT_RESPONSES,
    OFFICE_SPECS,
    openIncident,
    suggestHqCity,
} from '../../services/ownPlatform/infrastructure';
import { SERVER_CITIES, cityById } from '../../services/ownPlatform/serverCities';
import { closeCountryOffice, dismissHeadquartersPrompt, openCountryOffice, respondToIncident, setHeadquarters } from '../../services/ownPlatform/places';

export const HqPrompt: React.FC<{ player: Player; onPlayer: (next: Player) => void }> = ({ player, onPlayer }) => {
    const suggested = useMemo(() => suggestHqCity(player), [player]);
    const [cityId, setCityId] = useState(suggested.id);
    const city = cityById(cityId) || suggested;
    return (
        <div className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center bg-black/70 p-3" data-testid="hq-prompt">
            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#12151c] p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#8B7BFF]">Headquarters</div>
                <h2 className="text-3xl font-black uppercase mt-1">Where does the company sit?</h2>
                <p className="text-sm text-zinc-300 mt-2">HQ country: licences cost 12% less, and people there already know the name. The first choice is free. Moving later costs {formatCompact(HQ_MOVE_USD)} of company cash.</p>
                <label className="block text-xs text-zinc-400 mt-4">City
                    <select value={city.id} onChange={(event) => setCityId(event.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-white">
                        {SERVER_CITIES.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                </label>
                <p className="text-sm text-zinc-400 mt-2">Suggested from your home: {suggested.name}. This country gets the cheaper slate and the louder name.</p>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button type="button" data-testid="hq-accept" onClick={() => onPlayer(setHeadquarters(player, city.id).player)} className="px-4 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider">Yahi rakho</button>
                    <button type="button" onClick={() => onPlayer(dismissHeadquartersPrompt(player))} className="px-4 py-3 rounded-full border border-white/20 text-xs font-black uppercase tracking-wider">Baad mein</button>
                </div>
            </div>
        </div>
    );
};

export const OfficeBoard: React.FC<{ player: Player; onPlayer: (next: Player) => void; onError: (message: string) => void }> = ({ player, onPlayer, onError }) => {
    const state = player.ownPlatform;
    const [countryId, setCountryId] = useState(state?.selectedCountryIds[0] || 'US');
    const [query, setQuery] = useState('');
    if (!state) return null;
    const hq = cityById(state.hqCityId);
    const countries = MARKET_COUNTRIES.filter(row => row.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);
    const apply = (result: { player: Player; error?: string }) => {
        if (result.error) onError(result.error);
        else onPlayer(result.player);
    };
    return (
        <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 space-y-3" data-testid="hq-office-board">
            <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Headquarters and offices</div>
                <div className="text-xl font-black">{hq ? hq.name : 'No headquarters yet'}</div>
                <p className="text-sm text-zinc-400 mt-1">{hq ? 'HQ country: cheaper licences and a louder name. Moving costs company cash.' : 'Pick a home city. The first choice is free.'}</p>
            </div>
            <label className="block text-xs text-zinc-400">Move headquarters
                <select value={hq?.id || ''} onChange={(event) => apply(setHeadquarters(player, event.target.value))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-white">
                    <option value="" disabled>Choose a city</option>
                    {SERVER_CITIES.map(row => <option key={row.id} value={row.id}>{row.name} · {formatCompact(hq ? HQ_MOVE_USD : 0)}</option>)}
                </select>
            </label>
            <p className="text-xs text-zinc-500">Moving HQ costs {formatCompact(HQ_MOVE_USD)} from company cash. Your personal cash stays put.</p>
            <div>
                <div className="text-sm font-bold">Country office</div>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a country" className="mt-2 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-sm" />
                <div className="flex gap-2 overflow-x-auto mt-2">
                    {(countries.length ? countries : MARKET_COUNTRIES.slice(0, 8)).map(row => (
                        <button key={row.id} type="button" onClick={() => setCountryId(row.id)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${countryId === row.id ? 'bg-[#4F3BFF]' : 'bg-white/10 text-zinc-300'}`}>{row.flag} {row.name}</button>
                    ))}
                </div>
            </div>
            <div className="grid gap-2">
                {(Object.keys(OFFICE_SPECS) as OfficeSize[]).map(size => (
                    <button key={size} type="button" data-testid={`office-${size}`} onClick={() => apply(openCountryOffice(player, countryId, size))} className="text-left rounded-2xl border border-white/10 px-3 py-2 hover:border-[#8B7BFF]">
                        <div className="font-bold text-sm">{OFFICE_SPECS[size].name}</div>
                        <p className="text-xs text-zinc-400 mt-1">{OFFICE_SPECS[size].line}</p>
                    </button>
                ))}
            </div>
            {(state.offices || []).map(office => {
                const country = MARKET_COUNTRIES.find(row => row.id === office.countryId);
                return (
                    <div key={office.countryId} className="flex items-center justify-between gap-3 text-sm border-t border-white/5 pt-2">
                        <span>{country?.flag} {country?.name} · {OFFICE_SPECS[office.size].name}</span>
                        <button type="button" onClick={() => apply(closeCountryOffice(player, office.countryId))} className="text-[11px] uppercase tracking-wider text-zinc-400">Band karo</button>
                    </div>
                );
            })}
            <p className="text-xs text-zinc-500">Band karo stops next week's rent. The opening cheque is not returned. An open office also flags local deals for later.</p>
        </div>
    );
};

export const IncidentBoard: React.FC<{ player: Player; onPlayer: (next: Player) => void; onError: (message: string) => void }> = ({ player, onPlayer, onError }) => {
    const state = player.ownPlatform;
    const incident = state ? openIncident(state) : undefined;
    if (!incident) return null;
    const city = cityById(incident.cityId);
    return (
        <div className="rounded-3xl border border-rose-500/40 bg-[#1a1016] p-4" data-testid="incident-board">
            <div className="text-[11px] uppercase tracking-[0.18em] text-rose-300">This week</div>
            <p className="text-sm mt-1">{incident.note}</p>
            <p className="text-xs text-zinc-400 mt-1">{city?.name}. Pick one response. Each one spends company cash, not your personal cash.</p>
            <div className="grid gap-2 mt-3">
                {INCIDENT_RESPONSES.map(action => (
                    <button
                        key={action.id}
                        type="button"
                        data-testid={`incident-${action.id}`}
                        onClick={() => {
                            const result = respondToIncident(player, action.id);
                            if (result.error) onError(result.error);
                            else onPlayer(result.player);
                        }}
                        className="text-left rounded-2xl border border-white/10 px-3 py-2"
                    >
                        <div className="font-bold text-sm">{action.name} · {formatCompact(action.cost)}</div>
                        <p className="text-xs text-zinc-400 mt-1">{action.line}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
