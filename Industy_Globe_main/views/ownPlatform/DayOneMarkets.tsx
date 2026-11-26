import React, { useState } from 'react';
import { CountryLocalisation, LaunchRegionId, LocalLevel, OwnPlatformState } from '../../types';
import { LAUNCH_REGIONS, MARKET_COUNTRIES, getCountry } from '../../services/ownPlatform/catalog';
import { localisationCost } from '../../services/ownPlatform/commercial';
import { currencyFor, defaultLocalPrice, formatLocalAmount } from '../../services/ownPlatform/fx';
import { STANDARD_PLAN_USD, formatCompact, formatPeople } from '../../services/ownPlatform/logic';
import { publicBrandName } from '../../services/rights/alterName';
import { headingFont } from './ui';
import { licenceFill } from './ClearanceDesk';
import { formatLicenceUsd, licenceQuote, regulatorFor } from '../../services/ownPlatform/clearance';
import { WorldMarketMap } from './WorldMarketMap';

const PAGE = 8;
const LEVELS: LocalLevel[] = ['OFF', 'MAIN', 'FULL'];

const populationLabel = (millions?: number) => {
    if (!millions || millions <= 0) return '—';
    if (millions >= 1) return `${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)}M`;
    return `${Math.round(millions * 1000)}k`;
};

interface Props {
    state: OwnPlatformState;
    locked: boolean;
    onPatch: (recipe: (current: OwnPlatformState) => OwnPlatformState) => void;
}

export const DayOneMarkets: React.FC<Props> = ({ state, locked, onPatch }) => {
    const [regionId, setRegionId] = useState<LaunchRegionId>('NORTH_AMERICA');
    const [subRegion, setSubRegion] = useState('ALL');
    const [index, setIndex] = useState(0);
    const [dossierOpen, setDossierOpen] = useState(false);
    const [query, setQuery] = useState('');
    const countries = MARKET_COUNTRIES.filter(country => country.regionId === regionId);
    const subRegions = ['ALL', ...Array.from(new Set(countries.map(row => row.subRegion || 'Other')))];
    const pool = subRegion === 'ALL' ? countries : countries.filter(row => row.subRegion === subRegion);
    const safeIndex = pool.length ? Math.min(index, pool.length - 1) : 0;
    const country = pool[safeIndex];
    const pageStart = Math.floor(safeIndex / PAGE) * PAGE;
    const visible = pool.slice(pageStart, pageStart + PAGE);
    const page = pool.length ? Math.floor(safeIndex / PAGE) + 1 : 1;
    const pages = Math.max(1, Math.ceil(pool.length / PAGE));
    const selected = country ? state.selectedCountryIds.includes(country.id) : false;
    const chosen = MARKET_COUNTRIES.filter(row => state.selectedCountryIds.includes(row.id));
    const regionsUsed = new Set(chosen.map(row => row.regionId)).size;
    const viewers = chosen.reduce((sum, row) => sum + row.audienceM, 0);
    const regionCountries = countries.length;

    const toggleId = (id: string) => {
        if (locked) return;
        onPatch(current => {
            const has = current.selectedCountryIds.includes(id);
            return {
                ...current,
                selectedCountryIds: has
                    ? current.selectedCountryIds.filter(item => item !== id)
                    : [...current.selectedCountryIds, id],
            };
        });
    };
    const reveal = (id: string) => {
        const found = getCountry(id);
        if (!found) return;
        setRegionId(found.regionId);
        setSubRegion('ALL');
        const list = MARKET_COUNTRIES.filter(row => row.regionId === found.regionId);
        setIndex(Math.max(0, list.findIndex(row => row.id === id)));
        setDossierOpen(false);
    };
    const toggle = () => { if (country) toggleId(country.id); };
    const setLocalLevel = (key: 'subtitles' | 'dub', level: LocalLevel) => {
        if (locked || !country || !selected) return;
        onPatch(current => {
            const rows = current.localisations || [];
            const existing = rows.find(row => row.countryId === country.id);
            const next: CountryLocalisation = {
                countryId: country.id,
                subtitles: existing?.subtitles || 'OFF',
                dub: existing?.dub || 'OFF',
                [key]: level,
            };
            const rest = rows.filter(row => row.countryId !== country.id);
            if (next.subtitles === 'OFF' && next.dub === 'OFF') {
                return { ...current, localisations: rest.length ? rest : undefined };
            }
            return { ...current, localisations: [...rest, next] };
        });
    };
    const queryText = query.trim().toLowerCase();
    const matches = queryText.length < 1 ? [] : MARKET_COUNTRIES.filter(row => row.name.toLowerCase().includes(queryText) || row.id.toLowerCase() === queryText).slice(0, 8);

    const compliance = country ? Math.round(country.accessCost * 0.1) : 0;
    const local = country
        ? (state.localisations?.find(row => row.countryId === country.id) || { countryId: country.id, subtitles: 'OFF' as const, dub: 'OFF' as const })
        : null;
    const soften = country?.languages[0]?.name === 'English' ? ' English-speaking homes gain less.' : '';
    const subLine = !country || !local ? '' : local.subtitles === 'OFF'
        ? 'Subtitles off. Households who need a translation do not get one.'
        : local.subtitles === 'MAIN'
            ? `Subtitles for the main language. About ${formatCompact(localisationCost(country.audienceM, { ...local, dub: 'OFF' }))} a week, and a small audience lift.${soften}`
            : `Subtitles across the shelf. About ${formatCompact(localisationCost(country.audienceM, { ...local, dub: 'OFF' }))} a week, and a wider audience.${soften}`;
    const dubLine = !country || !local ? '' : local.dub === 'OFF'
        ? 'Dubs off. Viewers hear the original language.'
        : local.dub === 'MAIN'
            ? `A dub in the local language. About ${formatCompact(localisationCost(country.audienceM, { ...local, subtitles: 'OFF' }))} a week, and a larger audience than subtitles.${soften}`
            : `Dubs across the shelf. About ${formatCompact(localisationCost(country.audienceM, { ...local, subtitles: 'OFF' }))} a week, the biggest audience lift.${soften}`;

    return (
        <div className="space-y-4" data-screen="day-one-markets">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B7BFF]">Which region would you launch in first?</div>
                    <h2 className="text-4xl lg:text-6xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Day-One Markets</h2>
                    <p className="text-sm text-zinc-400 mt-2 max-w-xl">Choose where viewers can subscribe first. Every market has its own risk, language, tax, and rivals.</p>
                </div>
            </div>

            <WorldMarketMap
                selectedIds={state.selectedCountryIds}
                focusId={country?.id}
                regionId={regionId}
                fillId={id => licenceFill(state, id)}
                onPick={(id) => { reveal(id); toggleId(id); }}
                legend="Violet is on the slate. Green, gold, and red are that country’s own licence."
            />
            <div className="relative">
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search Pakistan, Ghana, Singapore…"
                    className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none"
                    aria-label="Search markets"
                />
                {matches.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-2xl border border-white/10 bg-[#12151c] shadow-xl overflow-hidden">
                        {matches.map(row => (
                            <button key={row.id} type="button" onClick={() => { setQuery(''); reveal(row.id); if (!state.selectedCountryIds.includes(row.id)) toggleId(row.id); }} className="w-full text-left px-4 py-2 text-sm hover:bg-white/5">
                                {row.flag} {row.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {LAUNCH_REGIONS.map(region => (
                            <button
                                key={region.id}
                                onClick={() => { setRegionId(region.id); setSubRegion('ALL'); setIndex(0); setDossierOpen(false); }}
                                className={`shrink-0 px-3 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider ${regionId === region.id ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}
                            >
                                {region.name}
                            </button>
                        ))}
                    </div>
                    {country && (
                        <div className="rounded-3xl border border-white/10 bg-[#12151c] overflow-hidden">
                            <div className="px-4 py-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-500">
                                <span>Opening market · {String(index + 1).padStart(2, '0')}</span>
                                <span className={country.difficulty === 'FOUGHT_OVER' ? 'text-[#FFC44D]' : 'text-zinc-400'}>{country.difficulty.replace('_', ' ')}</span>
                            </div>
                            <div className="px-4 pb-4">
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <div className="text-4xl lg:text-5xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>{country.flag} {country.name}</div>
                                        <p className="text-sm text-zinc-400 mt-2 max-w-lg">{country.difficulty === 'OPEN' ? 'Room to grow. Fewer giants, and a longer path to a crowd.' : country.difficulty === 'CROWDED' ? 'A lot of services are already here. You will be fighting for the same hour.' : country.difficulty === 'HARD' ? 'The paperwork is the product. Budget the weeks as well as the money.' : 'Huge spending power, but every major rival already protects this market.'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setIndex(value => (value - 1 + pool.length) % pool.length)} className="w-10 h-10 rounded-full border border-white/15">‹</button>
                                        <button type="button" onClick={() => setIndex(value => (value + 1) % pool.length)} className="w-10 h-10 rounded-full border border-white/15">›</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                    <Stat label="Streaming viewers" value={formatPeople(country.audienceM * 1_000_000)} />
                                    <Stat label="Yearly growth" value={`+${country.growthPct}%`} />
                                    <Stat label="Languages" value={String(country.languages.length)} />
                                    <Stat label="Market access" value={formatCompact(country.accessCost)} />
                                    <Stat label="Licence fee" value={formatLicenceUsd(licenceQuote(country.id)?.feeUsd || 0)} />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                    <Stat label="Population" value={populationLabel(country.populationM)} />
                                    <Stat label="Sub-region" value={country.subRegion || '—'} />
                                    <Stat label="Currency" value={country.currency || currencyFor(country.id, state.fxRates).code} />
                                    <Stat label="Local sticker" value={formatLocalAmount(defaultLocalPrice(STANDARD_PLAN_USD, country.id, state.fxRates), currencyFor(country.id, state.fxRates).code)} />
                                </div>
                                <p className="text-xs text-zinc-500 mt-2">A ${STANDARD_PLAN_USD} plan lists at that local price. The ledger still books the USD after this week's rate.</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {country.languages.map(language => (
                                        <span key={language.name} className="px-3 py-1 rounded-full bg-white/5 text-xs">{language.name} {language.share}%</span>
                                    ))}
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">Who already owns attention</div>
                                    {country.competitors.map(rival => (
                                        <Bar key={rival.name} label={publicBrandName(rival.name)} share={rival.share} />
                                    ))}
                                    <Bar label="Nobody yet" share={country.unclaimedPct} muted />
                                </div>
                                {local && (
                                    <div className="mt-4 space-y-2" data-testid="market-localisation">
                                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Subtitles</div>
                                        <div className="flex flex-wrap gap-2">
                                            {LEVELS.map(level => (
                                                <button key={level} type="button" disabled={locked || !selected} onClick={() => setLocalLevel('subtitles', level)} className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase disabled:opacity-40 ${local.subtitles === level ? 'bg-white text-black' : 'bg-white/5 text-zinc-300'}`}>{level === 'OFF' ? 'Off' : level === 'MAIN' ? 'Main' : 'Full'}</button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-zinc-400">{selected ? subLine : 'Add this country before subtitles go on the weekly bill.'}</p>
                                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Dubs</div>
                                        <div className="flex flex-wrap gap-2">
                                            {LEVELS.map(level => (
                                                <button key={level} type="button" disabled={locked || !selected} onClick={() => setLocalLevel('dub', level)} className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase disabled:opacity-40 ${local.dub === level ? 'bg-white text-black' : 'bg-white/5 text-zinc-300'}`}>{level === 'OFF' ? 'Off' : level === 'MAIN' ? 'Main' : 'Full'}</button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-zinc-400">{selected ? dubLine : 'Add this country before dubs go on the weekly bill.'}</p>
                                    </div>
                                )}
                                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                    <button onClick={() => setDossierOpen(true)} className="px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">Rules and taxes</button>
                                    <button onClick={toggle} disabled={locked} className={`btn sm ${selected ? 'wht' : 'pri'} disabled:opacity-40`}>
                                        {selected ? 'Remove from opening day' : 'Add to opening day'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {dossierOpen && country && (
                        <div className="fixed inset-0 z-[220] bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setDossierOpen(false)}>
                            <div className="paper w-full max-w-lg max-h-[85vh] overflow-y-auto p-5" onClick={(event) => event.stopPropagation()} style={{ padding: 28 }}>
                                <div className="flex justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#FFC44D]">{country.flag} market entry dossier</div>
                                        <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>{country.name}</div>
                                        <p className="text-sm text-zinc-400 mt-1">What opening here asks from the company.</p>
                                    </div>
                                    <button onClick={() => setDossierOpen(false)} className="text-zinc-400 text-sm">Close</button>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <Stat label="Tax load" value={country.taxLabel} />
                                    <Stat label="Opening review" value={country.reviewLabel} />
                                    <Stat label="Expected time" value={`${country.reviewWeeks} weeks`} />
                                </div>
                                <div className="mt-4 text-[11px] uppercase tracking-wider text-zinc-500">What must be cleared</div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {country.filings.map(item => <span key={item} className="px-3 py-1 rounded-full bg-[#4F3BFF]/20 text-xs">{item}</span>)}
                                </div>
                                <p className="text-sm text-zinc-300 mt-3">{country.privacyNote}. {country.localContentNote}.</p>
                                <p className="text-sm text-zinc-300 mt-2">{regulatorFor(country.id)?.name} licenses this country alone. The streaming fee is {formatLicenceUsd(licenceQuote(country.id)?.feeUsd || 0)}, paid from the treasury when you apply.</p>
                                <div className="mt-3 text-sm text-zinc-400">Planned overhead</div>
                                <div className="text-3xl font-black text-[#8B7BFF]">{formatCompact(compliance)}</div>
                                <p className="text-xs text-zinc-500">Market access {formatCompact(country.accessCost)} · compliance about {formatCompact(compliance)}. Higher setup spend, but no national launch delay beyond the review.</p>
                                <button onClick={() => setDossierOpen(false)} className="btn pri full" style={{ marginTop: 16 }}>Got it</button>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {subRegions.map(name => (
                            <button key={name} type="button" onClick={() => { setSubRegion(name); setIndex(0); }} className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${subRegion === name ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}>
                                {name === 'ALL' ? 'All' : name}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1" data-testid="market-page">
                        {visible.map((row, rowIndex) => {
                            const poolIndex = pageStart + rowIndex;
                            const on = state.selectedCountryIds.includes(row.id);
                            return (
                                <button key={row.id} type="button" onClick={() => setIndex(poolIndex)} className={`px-2 py-1 rounded-full text-[11px] ${poolIndex === safeIndex ? 'bg-white text-black' : on ? 'bg-[#6d5efc]/40 text-white' : 'bg-white/5 text-zinc-300'}`}>
                                    {row.flag} {row.name}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                        <span>{safeIndex + 1} / {pool.length} shown · page {page} of {pages}</span>
                        <span className="flex gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => setIndex(Math.max(0, pageStart - PAGE))} className="px-3 py-1 rounded-full border border-white/15 disabled:opacity-40">Previous</button>
                            <button type="button" disabled={page >= pages} onClick={() => setIndex(Math.min(pool.length - 1, pageStart + PAGE))} className="px-3 py-1 rounded-full border border-white/15 disabled:opacity-40">Next</button>
                        </span>
                    </div>
                </div>

                <aside className="rounded-3xl border border-white/10 bg-[#12151c] p-4 h-fit lg:sticky lg:top-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{LAUNCH_REGIONS.find(region => region.id === regionId)?.name} opening</div>
                    <div className="text-3xl font-black" style={{ fontFamily: headingFont }}>{chosen.filter(row => row.regionId === regionId).length}/{regionCountries}</div>
                    <p className="text-sm text-zinc-400 mt-1">{chosen.filter(row => row.regionId === regionId).length} markets selected here. A wider opening means stronger rivals and more launch work.</p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <Stat label="Streaming viewers" value={viewers > 0 ? `${viewers.toFixed(viewers < 10 ? 1 : 0)}M` : '0'} />
                        <Stat label="Regions" value={String(regionsUsed)} />
                        <Stat label="Languages" value={String(new Set(chosen.flatMap(row => row.languages.map(language => language.name))).size)} />
                        <Stat label="Opening rights" value={formatCompact(chosen.reduce((sum, row) => sum + row.accessCost, 0))} />
                    </div>
                    <div className="mt-4 text-[11px] uppercase tracking-wider text-zinc-500">Your day-one footprint</div>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto">
                        {chosen.length === 0 && <span className="text-sm text-zinc-500">No country is on the opening slate yet.</span>}
                        {chosen.map(row => (
                            <button key={row.id} type="button" onClick={() => { setSubRegion('ALL'); setRegionId(row.regionId); setIndex(Math.max(0, MARKET_COUNTRIES.filter(item => item.regionId === row.regionId).findIndex(item => item.id === row.id))); }} className="px-2 py-1 rounded-full bg-white/5 text-xs">
                                {row.flag} {row.name}
                            </button>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="font-bold text-white">{value}</div>
    </div>
);

const Bar: React.FC<{ label: string; share: number; muted?: boolean }> = ({ label, share, muted }) => (
    <div>
        <div className="flex justify-between text-[11px] text-zinc-400"><span>{label}</span><span>{share}%</span></div>
        <div className={`bar ${muted ? 'dimb' : ''}`} style={{ marginTop: 4 }}><i style={{ width: `${Math.min(100, share)}%` }} /></div>
    </div>
);
