import React, { useMemo, useState } from 'react';
import { BuildGoalId, InfraPresetId, LaunchRegionId, OwnPlatformState, Player, TrafficLoad } from '../../types';
import { CLOUD_PROVIDERS, LAUNCH_REGIONS, SERVER_CLASSES, getCountry } from '../../services/ownPlatform/catalog';
import { addCompanyCash, readCompanyCash } from '../../services/ownPlatform/companyCash';
import {
    INFRA_PRESETS,
    applyInfraPreset,
    applyRegionCoverage,
    commissionPlatform,
    formatCompact,
    formatPeople,
    planAutoBuild,
    quoteLaunch,
    regionsFromSites,
    rehearseOpeningNight,
} from '../../services/ownPlatform/logic';
import {
    cityBill,
    effectiveSites,
    limitLine,
    loadTestFresh,
    networkOnce,
    redundancyOf,
    runLoadTest,
    trafficLine,
} from '../../services/ownPlatform/infrastructure';
import { citiesInRegion, cityById } from '../../services/ownPlatform/serverCities';
import { COUNTRY_SEEDS } from '../../services/ownPlatform/countrySeeds';
import { MapMarker, WorldMarketMap } from './WorldMarketMap';
import { IncidentBoard, OfficeBoard } from './PlacePanels';
import { Card, FooterBar, Stepper, headingFont } from './ui';

interface Props {
    player: Player;
    onChange: (next: OwnPlatformState) => void;
    onPlayer: (next: Player) => void;
    onLaunch: () => void;
}

const GOALS: { id: BuildGoalId; name: string; line: string }[] = [
    { id: 'CHEAP', name: 'Cheap', line: 'Smaller rooms, about 55% of the night, and never past the budget.' },
    { id: 'BALANCED', name: 'Balanced', line: 'About 90% of the night, mostly Workhorses, inside the budget.' },
    { id: 'BEST', name: 'Best quality', line: 'Titans first, until the night fits or the budget runs out.' },
];

const LOADS: TrafficLoad[] = ['QUIET', 'NORMAL', 'X2', 'X5'];

export const BuildPlatform: React.FC<Props> = ({ player, onChange, onPlayer, onLaunch }) => {
    const state = player.ownPlatform!;
    const step = state.buildStep;
    const quote = quoteLaunch(player);
    const companyCash = readCompanyCash(player);
    const [regionId, setRegionId] = useState<LaunchRegionId>(state.regions[0]?.regionId || 'NORTH_AMERICA');
    const [cityId, setCityId] = useState(citiesInRegion(state.regions[0]?.regionId || 'NORTH_AMERICA')[0]?.id || 'lax');
    const [mode, setMode] = useState<TrafficLoad>(state.loadTest?.mode || 'NORMAL');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [plannerOpen, setPlannerOpen] = useState(false);
    const [goal, setGoal] = useState<BuildGoalId>(state.buildGoal || 'BALANCED');
    const [budget, setBudget] = useState(companyCash);
    const plan = useMemo(() => planAutoBuild(state, budget, goal), [state, budget, goal]);
    const sites = effectiveSites(state);
    const redundancy = redundancyOf(sites);
    const freshTest = loadTestFresh(state) ? state.loadTest : undefined;
    const rehearsal = useMemo(() => rehearseOpeningNight(state, mode === 'QUIET' ? 'QUIET' : mode === 'X5' ? 'SURGE' : 'LIKELY'), [state, mode]);
    const city = cityById(cityId) || citiesInRegion(regionId)[0];
    const cityRow = sites.find(row => row.cityId === city?.id) || { cityId: city?.id || '', scout: 0, workhorse: 0, titan: 0 };
    const bill = cityBill(cityRow, Array.isArray(state.sites));

    const commit = (next: OwnPlatformState) => {
        if (!state.commissioned) {
            onChange(next);
            return;
        }
        const delta = Math.round(networkOnce(next) - networkOnce(state));
        if (delta > 0 && companyCash < delta) {
            setError(`Company cash is short ${formatCompact(delta - companyCash)}. Personal cash is not used.`);
            return;
        }
        setError('');
        if (delta > 0) {
            const copy: Player = {
                ...player,
                ownPlatform: {
                    ...next,
                    books: next.books ? { ...next.books, lines: [...next.books.lines], history: [...(next.books.history || [])] } : next.books,
                },
            };
            addCompanyCash(copy, -delta, `${state.name} added server racks`, 'BURN');
            onPlayer(copy);
            return;
        }
        onChange(next);
    };

    const writeCity = (box: 'scout' | 'workhorse' | 'titan', value: number) => {
        if (!city) return;
        const base = (Array.isArray(state.sites) ? state.sites : sites).map(row => ({ ...row }));
        const found = base.find(row => row.cityId === city.id);
        const count = Math.max(0, Math.min(40, value));
        if (found) found[box] = count;
        else base.push({ cityId: city.id, scout: 0, workhorse: 0, titan: 0, [box]: count });
        const kept = base.filter(row => row.scout + row.workhorse + row.titan > 0);
        commit({ ...state, sites: kept, regions: regionsFromSites(state, kept) });
    };

    const markers: MapMarker[] = [
        ...sites.filter(row => row.cityId !== state.hqCityId).flatMap(row => {
            const place = cityById(row.cityId);
            if (!place) return [];
            const verdict = freshTest?.cities.find(item => item.cityId === row.cityId)?.verdict;
            const tone = verdict === 'HELD' ? 'ok' as const : verdict === 'BURST' ? 'warn' as const : verdict === 'BROKE' ? 'bad' as const : 'idle' as const;
            return [{ id: place.id, lat: place.lat, lon: place.lon, kind: 'server' as const, title: `${place.name}: ${row.scout + row.workhorse + row.titan} racks`, tone }];
        }),
        ...(state.offices || []).flatMap(office => {
            const seed = COUNTRY_SEEDS.find(row => row[0] === office.countryId);
            const country = getCountry(office.countryId);
            if (!seed || !country) return [];
            return [{ id: `office-${office.countryId}`, lat: seed[8], lon: seed[9], kind: 'office' as const, title: `${country.name} office`, tone: 'idle' as const }];
        }),
        ...(cityById(state.hqCityId) ? [{
            id: state.hqCityId as string,
            lat: cityById(state.hqCityId)!.lat,
            lon: cityById(state.hqCityId)!.lon,
            kind: 'hq' as const,
            title: `Headquarters · ${cityById(state.hqCityId)!.name}`,
            tone: 'warn' as const,
        }] : []),
    ];

    const go = (next: number) => onChange({ ...state, buildStep: Math.max(0, Math.min(3, next)) });

    const runPreset = (id: InfraPresetId) => commit(applyInfraPreset(state, id));

    const applyPlan = () => {
        commit({
            ...state,
            infraPreset: plan.preset,
            buildGoal: plan.goal,
            buildBudget: budget,
            sites: plan.sites,
            regions: regionsFromSites(state, plan.sites),
            cloud: state.cloud.map(order => ({ ...order, racks: 0 })),
        });
        setPlannerOpen(false);
    };

    const sign = () => {
        const result = commissionPlatform(player);
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        onPlayer(result.player);
    };

    return (
        <div className="flex flex-col min-h-full">
            <div className="px-4 lg:px-10 pt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#8B7BFF]">Build · stage {step + 1} of 4</div>
            <div className="p-4 lg:p-10 flex-1">
                {step === 0 && (
                    <div className="space-y-4">
                        <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" data-testid="infra-auto-build" onClick={() => { setPlannerOpen(true); setBudget(companyCash); }} className="px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider">Auto-build</button>
                                {INFRA_PRESETS.map(item => (
                                    <button key={item.id} type="button" data-testid={`infra-preset-${item.id}`} onClick={() => runPreset(item.id)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${state.infraPreset === item.id ? 'bg-[#4F3BFF] text-white' : 'bg-white/10 text-zinc-200'}`}>
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-zinc-400">{(INFRA_PRESETS.find(item => item.id === state.infraPreset) || INFRA_PRESETS[1]).blurb} Auto-build spends only company cash, and only when you press Apply.</p>
                            <div className="text-sm"><span className="font-black">{redundancy.label}.</span> <span className="text-zinc-400">{redundancy.line}</span></div>
                        </div>
                        {plannerOpen && (
                            <div className="rounded-3xl border border-[#4F3BFF]/40 bg-[#12151c] p-4 space-y-3" data-testid="auto-build-card">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-[#8B7BFF]">Planner · nothing charged yet</div>
                                <label className="block text-sm">
                                    <div className="flex justify-between text-zinc-400"><span>Budget from company cash</span><span>{formatCompact(budget)}</span></div>
                                    <input data-testid="auto-build-budget" type="range" min={0} max={Math.max(0, companyCash)} step={100000} value={Math.min(budget, companyCash)} onChange={(event) => setBudget(Number(event.target.value))} className="w-full accent-[#8B7BFF]" />
                                </label>
                                <p className="text-xs text-zinc-500">The slider cannot pass company cash ({formatCompact(companyCash)}). Your personal cash is not on this slider.</p>
                                <div className="grid gap-2">
                                    {GOALS.map(item => (
                                        <button key={item.id} type="button" data-testid={`build-goal-${item.id}`} onClick={() => setGoal(item.id)} className={`text-left rounded-2xl border px-3 py-2 ${goal === item.id ? 'border-[#4F3BFF] bg-[#4F3BFF]/10' : 'border-white/10'}`}>
                                            <div className="font-bold">{item.name}</div>
                                            <p className="text-xs text-zinc-400 mt-1">{item.line}</p>
                                        </button>
                                    ))}
                                </div>
                                <div className="rounded-2xl bg-black/30 p-3">
                                    <div className="text-2xl font-black" style={{ fontFamily: headingFont }}>{plan.servers} servers</div>
                                    <div className="text-sm text-zinc-300 mt-1">{formatCompact(plan.once)} upfront · {formatCompact(plan.weekly)} a week · {formatPeople(plan.smooth)} can watch smoothly</div>
                                    <p className="text-xs text-zinc-500 mt-2">{plan.note} Rented cloud racks go back to zero so the weekly number matches the rooms on the map.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button type="button" data-testid="auto-build-apply" disabled={plan.servers === 0} onClick={applyPlan} className="px-4 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-40">Theek hai, laga do</button>
                                    <button type="button" data-testid="auto-build-edit" onClick={() => setPlannerOpen(false)} className="px-4 py-3 rounded-full border border-white/20 text-xs font-black uppercase tracking-wider">Khud badlunga</button>
                                </div>
                            </div>
                        )}
                        <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] gap-4">
                            <div className="space-y-3">
                                <WorldMarketMap
                                    selectedIds={state.selectedCountryIds}
                                    regionId={regionId}
                                    onPick={(id) => {
                                        const country = getCountry(id);
                                        if (!country) return;
                                        setRegionId(country.regionId);
                                        const first = citiesInRegion(country.regionId).find(row => row.countryId === id) || citiesInRegion(country.regionId)[0];
                                        if (first) setCityId(first.id);
                                    }}
                                    markers={markers}
                                    onMarker={(id) => {
                                        if (id.startsWith('office-')) {
                                            const country = getCountry(id.slice(7));
                                            setNotice(country ? `${country.name} office is open. Its rent leaves company cash every week.` : '');
                                            return;
                                        }
                                        const place = cityById(id);
                                        if (!place) return;
                                        setNotice('');
                                        setCityId(place.id);
                                        setRegionId(place.regionId);
                                    }}
                                    legend="Star is headquarters. Building is an office. Dot is a server room. Click a country to jump there."
                                />
                                <div className="flex gap-2 overflow-x-auto">
                                    {LAUNCH_REGIONS.map(item => (
                                        <button key={item.id} type="button" onClick={() => { setRegionId(item.id); const first = citiesInRegion(item.id)[0]; if (first) setCityId(first.id); }} className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${regionId === item.id ? 'bg-[#4F3BFF]' : 'bg-white/10 text-zinc-300'}`}>{item.short}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                {city && (
                                    <Card>
                                        <div className="font-black text-2xl" style={{ fontFamily: headingFont }}>{city.name}</div>
                                        <p className="text-xs text-zinc-400 mt-1">{formatPeople(bill.steady)} can watch smoothly · {formatCompact(bill.once)} upfront · {formatCompact(bill.weekly)} a week</p>
                                        <p className="text-xs text-zinc-500 mt-1">{limitLine(bill.limiting)}</p>
                                        {SERVER_CLASSES.map(server => {
                                            const box = server.id === 'SCOUT' ? 'scout' : server.id === 'WORKHORSE' ? 'workhorse' : 'titan';
                                            return (
                                                <div key={server.id} className="mt-3 border-t border-white/5 pt-3">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div>
                                                            <div className="font-bold">{server.name}</div>
                                                            <p className="text-xs text-zinc-400 mt-1">{server.blurb}</p>
                                                        </div>
                                                        <Stepper value={cityRow[box]} onChange={(value) => writeCity(box, value)} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </Card>
                                )}
                                <div className="flex gap-2 overflow-x-auto">
                                    {citiesInRegion(regionId).map(row => (
                                        <button key={row.id} type="button" onClick={() => setCityId(row.id)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${cityId === row.id ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'}`}>{row.name}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                {quote.regionRows.map(row => (
                                    <Card key={row.regionId} active={row.regionId === regionId} onClick={() => setRegionId(row.regionId)}>
                                        <div className="flex justify-between gap-3">
                                            <div className="font-bold">{row.name}</div>
                                            <div className="text-emerald-300 text-sm font-bold">{formatCompact(row.weeklyUsd)}/wk</div>
                                        </div>
                                        <div className="text-[11px] text-zinc-500">{row.countries} countries · {formatPeople(row.capacity)} smooth</div>
                                        <label className="block mt-3" onClick={(event) => event.stopPropagation()}>
                                            <div className="flex justify-between text-[11px] text-zinc-400">
                                                <span>Coverage target</span>
                                                <span>{state.regionCoverage?.[row.regionId] ?? Math.round(row.servedPct * 100)}%</span>
                                            </div>
                                            <input
                                                data-testid={`region-coverage-${row.regionId}`}
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={state.regionCoverage?.[row.regionId] ?? Math.round(row.servedPct * 100)}
                                                onChange={(event) => commit(applyRegionCoverage(state, row.regionId, Number(event.target.value)))}
                                                className="w-full accent-[#8B7BFF]"
                                            />
                                        </label>
                                    </Card>
                                ))}
                                <Card>
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Cloud</div>
                                    <p className="text-xs text-zinc-400 mb-2">Rented racks add weekly cost and no city on the map. Paid from company cash with the rest of the burn.</p>
                                    {CLOUD_PROVIDERS.map(provider => {
                                        const order = state.cloud.find(row => row.providerId === provider.id);
                                        return (
                                            <div key={provider.id} className="flex items-center justify-between py-2 border-t border-white/5 gap-3">
                                                <div>
                                                    <div className="font-semibold">{provider.name}</div>
                                                    <div className="text-[11px] text-zinc-500">{formatCompact(provider.weeklyPerRack)} / rack · week</div>
                                                </div>
                                                <Stepper value={order?.racks || 0} onChange={(value) => {
                                                    const cap = provider.maxRacks;
                                                    commit({
                                                        ...state,
                                                        cloud: state.cloud.map(orderRow => orderRow.providerId === provider.id ? { ...orderRow, racks: Math.max(0, Math.min(cap, value)) } : orderRow),
                                                    });
                                                }} />
                                            </div>
                                        );
                                    })}
                                </Card>
                            </div>
                            <div className="space-y-3">
                                <IncidentBoard player={player} onPlayer={onPlayer} onError={setError} />
                                <OfficeBoard player={player} onPlayer={onPlayer} onError={setError} />
                            </div>
                        </div>
                        {notice && <p className="text-sm text-zinc-300">{notice}</p>}
                        {error && <p className="text-rose-300 text-sm">{error}</p>}
                    </div>
                )}

                {step === 1 && (
                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Launch allocation</div>
                            <div className="text-4xl font-black" style={{ fontFamily: headingFont }}>{formatCompact(quote.dueNow)}</div>
                            <div className="text-sm text-zinc-400">Leaves company cash · {formatCompact(quote.leftAfter)} left in the company</div>
                            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-[#4F3BFF]" style={{ width: `${Math.min(100, companyCash > 0 ? (quote.dueNow / companyCash) * 100 : 100)}%` }} />
                            </div>
                            <p className="text-xs text-zinc-500 mt-3">Charged when you sign, from company cash. Personal cash is not used.</p>
                            <div className="mt-4 space-y-2 text-sm">
                                <Row label="Server racks" value={formatCompact(quote.construction)} />
                                <Row label="Facility deposits" value={formatCompact(quote.deposits)} />
                                <Row label="Market access" value={formatCompact(quote.access)} />
                                <Row label="Licences" value={formatCompact(quote.licences)} />
                                <Row label="Country office rent" value={`${formatCompact(quote.weeklyBurn - quote.weeklyOwn - quote.localisationWeekly)}/wk`} />
                                <Row label="Server racks and cloud" value={`${formatCompact(quote.weeklyOwn)}/wk`} />
                                <Row label="Operating reserve · six weeks" value={formatCompact(quote.reserve)} />
                            </div>
                            <div className="mt-4 text-emerald-300 font-bold">{quote.runwayWeeks >= 999 ? 'No weekly burn yet' : `${quote.runwayWeeks} weeks left at ${formatCompact(quote.weeklyBurn)} a week`}</div>
                        </Card>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Own versus rent</div>
                            <BreakEven own={quote.ownSeries} rent={quote.rentSeries} />
                            <p className="text-sm text-zinc-400 mt-3">
                                {quote.breakEvenWeek
                                    ? `Owning costs more until week ${quote.breakEvenWeek}, then the rooms are cheaper than renting them.`
                                    : 'Rent stays cheaper on this shape of network. Add less cloud, or accept the rent.'}
                            </p>
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                                <Mini label="MWh a week" value={`${quote.energyMwh}`} />
                                <Mini label="Sustainability" value={`${quote.sustainability}`} />
                                <Mini label="Reputation" value={`${quote.reputation}`} />
                            </div>
                        </Card>
                        <div className="space-y-3">
                            {quote.regionRows.map(row => (
                                <Card key={row.regionId}>
                                    <div className="font-bold">{row.name}</div>
                                    <div className="text-sm text-zinc-300">{formatCompact(row.onceUsd)} once · {formatCompact(row.weeklyUsd)}/wk</div>
                                </Card>
                            ))}
                            <Card>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Marketing ceiling</div>
                                <div className="text-2xl font-black">{quote.marketingReady ? formatCompact(quote.marketingCeiling) : 'Waiting'}</div>
                                <p className="text-xs text-zinc-500 mt-1">{quote.marketingReady ? 'Authorization only. Campaigns are spent later, deal by deal.' : 'Recommendations open when a market is cleared.'}</p>
                            </Card>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid lg:grid-cols-[280px_minmax(0,1fr)_300px] gap-4">
                        <div className="space-y-3">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Simulated · changes nothing but the result card</div>
                            <h2 className="text-4xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Test karo</h2>
                            <p className="text-sm text-zinc-400">A fake crowd through the cities you placed. Company cash does not move.</p>
                            <div className="grid grid-cols-2 gap-2">
                                {LOADS.map(item => (
                                    <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-2xl p-3 text-left border ${mode === item ? 'border-[#4F3BFF] bg-[#4F3BFF]/10' : 'border-white/10 bg-[#12151c]'}`}>
                                        <div className="font-black">{item === 'QUIET' ? 'Quiet' : item === 'NORMAL' ? 'Normal' : item === 'X2' ? '2×' : '5×'}</div>
                                        <p className="text-[11px] text-zinc-400 mt-1">{trafficLine(item)}</p>
                                    </button>
                                ))}
                            </div>
                            <button type="button" data-testid="load-test" onClick={() => onChange({ ...state, loadTest: runLoadTest(state, mode) })} className="w-full py-3 rounded-full bg-[#4F3BFF] font-black uppercase tracking-wider text-sm">Test karo</button>
                            {state.loadTest && !freshTest && <p className="text-sm text-amber-200">Yeh test purana hai. Layout badal chuka hai. Test karo dubara.</p>}
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase text-zinc-500">Cities</div>
                            <div className="text-4xl font-black text-emerald-300" style={{ fontFamily: headingFont }}>{formatPeople(freshTest?.smoothViewers || rehearsal.peak)}</div>
                            <div className="text-sm text-zinc-400">{freshTest ? 'Smooth viewers on this test' : 'Run the test to colour the cities.'}</div>
                            <div className="mt-4 space-y-2">
                                {(freshTest ? freshTest.cities : []).map(row => {
                                    const place = cityById(row.cityId);
                                    const tone = row.verdict === 'HELD' ? 'text-emerald-300' : row.verdict === 'BURST' ? 'text-amber-200' : 'text-rose-300';
                                    return (
                                        <div key={row.cityId} className="rounded-xl bg-black/30 px-3 py-2 text-sm flex justify-between gap-3">
                                            <span>{place?.name || row.cityId}</span>
                                            <span className={tone}>{row.verdict} · {row.suggestion}</span>
                                        </div>
                                    );
                                })}
                                {!freshTest && <p className="text-sm text-zinc-500">No fresh result. Press Test karo.</p>}
                            </div>
                        </Card>
                        <Card className={rehearsal.held ? 'border-emerald-500/40' : 'border-rose-500/40'}>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Opening shape</div>
                            <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>{redundancy.label}</div>
                            <p className="text-sm text-zinc-400 mt-2">{redundancy.line}</p>
                            <div className="mt-3 text-xs text-zinc-500">Catalogue coverage {Math.round(rehearsal.cataloguePct * 100)}%. The colours go stale as soon as you move a rack.</div>
                        </Card>
                    </div>
                )}

                {step === 3 && (
                    <div className="grid g-side max-w-5xl">
                        <div className="paper" style={{ padding: '36px 40px' }}>
                            <div className="lab" style={{ color: '#6B5E44' }}>Agreement</div>
                            <h2 className="h2" style={{ fontFamily: 'var(--s)', textTransform: 'none', letterSpacing: 0, marginTop: 8 }}>Commission the build</h2>
                            <p className="p" style={{ marginTop: 8, color: '#4A3F2B' }}>Signing spends {formatCompact(quote.dueNow)} from company cash. Your personal money stays put. The six-week reserve covers burn while the rooms are built. Weekly server and office costs start when the service goes live, except office rent, which starts the week you open one.</p>
                            <ul className="mt-4 space-y-2 text-sm">
                                {(quote.blockers.filter(line => line !== 'Construction has already been signed.').length ? quote.blockers.filter(line => line !== 'Construction has already been signed.') : ['Every requirement on the blueprint is clear.']).map(line => (
                                    <li key={line} className="border-b border-white/5 py-2">{line}</li>
                                ))}
                            </ul>
                            {error && <p className="mt-3 text-rose-300 text-sm">{error}</p>}
                            {state.commissioned && <p className="mt-3" style={{ color: '#1f7a4d' }}>{state.stage === 'LIVE' ? `${state.name} is live.` : `${state.constructionWeeksLeft} weeks of construction left.`}</p>}
                        </div>
                        <div className="card">
                            <div className="lab">Due on signature</div>
                            <div className="big">{formatCompact(quote.dueNow)}</div>
                            <button type="button" onClick={sign} disabled={state.commissioned} className={`btn pri full ${state.commissioned ? 'dis' : ''}`} style={{ marginTop: 18 }}>Sign and commission</button>
                        </div>
                    </div>
                )}
            </div>
            <FooterBar
                leftLabel="Network"
                leftValue={`${redundancy.label} · ${sites.length} cities`}
                money={formatCompact(companyCash)}
                onBack={step === 0 ? onLaunch : () => go(step - 1)}
                onNext={step < 3 ? () => go(step + 1) : undefined}
                nextLabel={step === 0 ? 'Next · Money' : step === 1 ? 'Next · Test' : 'Next · Sign'}
            />
        </div>
    );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3"><span className="text-zinc-400">{label}</span><span>{value}</span></div>
);

const Mini: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-xl bg-black/30 p-2">
        <div className="text-[10px] uppercase text-zinc-500">{label}</div>
        <div className="font-black">{value}</div>
    </div>
);

const BreakEven: React.FC<{ own: number[]; rent: number[] }> = ({ own, rent }) => {
    const max = Math.max(1, ...own, ...rent);
    const width = 320;
    const height = 120;
    const line = (series: number[]) => series.map((value, index) => {
        const x = (index / Math.max(1, series.length - 1)) * width;
        const y = height - (value / max) * (height - 8);
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full mt-3">
            <polyline fill="none" stroke="#71717a" strokeDasharray="4 4" strokeWidth="2" points={line(rent)} />
            <polyline fill="none" stroke="#4ade80" strokeWidth="2.5" points={line(own)} />
        </svg>
    );
};
