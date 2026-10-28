import React, { useMemo, useState } from 'react';
import { AudienceMode, InfraPresetId, LaunchRegionId, OwnPlatformState, Player } from '../../types';
import { CLOUD_PROVIDERS, LAUNCH_REGIONS, SERVER_CLASSES } from '../../services/ownPlatform/catalog';
import {
    INFRA_PRESETS,
    applyInfraPreset,
    applyRegionCoverage,
    commissionPlatform,
    formatCompact,
    formatPeople,
    quoteLaunch,
    regionCityLine,
    rehearseOpeningNight,
} from '../../services/ownPlatform/logic';
import { Card, FooterBar, NetworkMap, Stepper, headingFont } from './ui';

interface Props {
    player: Player;
    onChange: (next: OwnPlatformState) => void;
    onPlayer: (next: Player) => void;
    onLaunch: () => void;
}

export const BuildPlatform: React.FC<Props> = ({ player, onChange, onPlayer, onLaunch }) => {
    const state = player.ownPlatform!;
    const step = state.buildStep;
    const quote = quoteLaunch(player);
    const locked = state.commissioned;
    const [regionId, setRegionId] = useState<LaunchRegionId>(state.regions[0]?.regionId || 'NORTH_AMERICA');
    const [mode, setMode] = useState<AudienceMode>('LIKELY');
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState('');
    const rehearsal = useMemo(() => rehearseOpeningNight(state, mode), [state, mode]);
    const served: Record<string, number> = {};
    quote.regionRows.forEach(row => { served[row.regionId] = row.servedPct; });
    const go = (next: number) => onChange({ ...state, buildStep: Math.max(0, Math.min(3, next)) });
    const region = state.regions.find(row => row.regionId === regionId) || state.regions[0];

    const setCount = (key: 'scout' | 'workhorse' | 'titan', value: number) => {
        if (locked || !region) return;
        onChange({
            ...state,
            regions: state.regions.map(row => row.regionId === region.regionId ? { ...row, [key]: Math.max(0, Math.min(40, value)) } : row),
        });
    };

    const setRacks = (providerId: string, racks: number) => {
        if (locked) return;
        const cap = CLOUD_PROVIDERS.find(row => row.id === providerId)?.maxRacks || 0;
        onChange({
            ...state,
            cloud: state.cloud.map(order => order.providerId === providerId ? { ...order, racks: Math.max(0, Math.min(cap, racks)) } : order),
        });
    };

    const runPreset = (id: InfraPresetId) => {
        if (locked) return;
        onChange(applyInfraPreset(state, id));
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
                    <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" data-testid="infra-auto-build" disabled={locked} onClick={() => runPreset(state.infraPreset || 'BALANCED')} className="px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-40">Auto-build</button>
                            {INFRA_PRESETS.map(item => (
                                <button key={item.id} type="button" data-testid={`infra-preset-${item.id}`} disabled={locked} onClick={() => runPreset(item.id)} className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider disabled:opacity-40 ${state.infraPreset === item.id ? 'bg-[#4F3BFF] text-white' : 'bg-white/10 text-zinc-200'}`}>
                                    {item.name}
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-zinc-400 mt-3">{(INFRA_PRESETS.find(item => item.id === state.infraPreset) || INFRA_PRESETS[1]).blurb} The slider on each region sets that target again without touching the others.</p>
                    </div>
                    <div className="grid lg:grid-cols-[minmax(0,1.1fr)_320px_minmax(0,0.9fr)] gap-4">
                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">The build · 120 racks · 15 weeks</div>
                                    <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>Lay the network</div>
                                </div>
                            </div>
                            <div className="flex gap-2 overflow-x-auto mb-3">
                                <button onClick={() => setRegionId(state.regions[0]?.regionId || 'NORTH_AMERICA')} className="text-[10px] uppercase tracking-wider text-zinc-500">World</button>
                                {LAUNCH_REGIONS.map(item => (
                                    <button key={item.id} onClick={() => setRegionId(item.id)} className={`px-3 py-1 rounded-full text-xs font-bold ${regionId === item.id ? 'bg-[#4F3BFF]' : 'bg-white/10 text-zinc-300'}`}>{item.short}</button>
                                ))}
                            </div>
                            <NetworkMap regions={state.regions.map(row => row.regionId)} served={served} />
                            <div className="mt-3 flex justify-between text-sm">
                                <div>
                                    <div className="text-2xl font-black">{formatPeople(quote.nightDemand * quote.servedPct)}</div>
                                    <div className="text-[11px] uppercase text-zinc-500">On the night</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-black ${quote.servedPct >= 0.9 ? 'text-emerald-300' : 'text-[#8B7BFF]'}`}>{formatPeople(Math.max(0, quote.nightDemand - quote.capacity))}</div>
                                    <div className="text-[11px] uppercase text-zinc-500">{quote.servedPct >= 0.99 ? 'Covered' : 'Short'}</div>
                                </div>
                            </div>
                        </Card>
                        <div className="space-y-3">
                            {region ? (
                                <>
                                    <div className="text-sm text-zinc-400">Landed in {regionCityLine(region.regionId)}. Counts cover every city in the region.</div>
                                    {SERVER_CLASSES.map(server => (
                                        <Card key={server.id}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-black text-lg">{server.name}</div>
                                                    <div className="text-[11px] text-zinc-500">{server.reachKm} km · {formatCompact(server.onceUsd)} each</div>
                                                </div>
                                                <Stepper disabled={locked} value={region[server.id === 'SCOUT' ? 'scout' : server.id === 'WORKHORSE' ? 'workhorse' : 'titan']} onChange={(value) => setCount(server.id === 'SCOUT' ? 'scout' : server.id === 'WORKHORSE' ? 'workhorse' : 'titan', value)} />
                                            </div>
                                            <p className="text-xs text-zinc-400 mt-2">{server.blurb}</p>
                                        </Card>
                                    ))}
                                </>
                            ) : <Card>Choose countries in the launch before placing machines.</Card>}
                            <Card>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Cloud</div>
                                {CLOUD_PROVIDERS.map(provider => {
                                    const order = state.cloud.find(row => row.providerId === provider.id);
                                    return (
                                        <div key={provider.id} className="flex items-center justify-between py-2 border-t border-white/5">
                                            <div>
                                                <div className="font-semibold">{provider.name}</div>
                                                <div className="text-[11px] text-zinc-500">{formatCompact(provider.weeklyPerRack)} / rack · week</div>
                                            </div>
                                            <Stepper disabled={locked} value={order?.racks || 0} onChange={(value) => setRacks(provider.id, value)} />
                                        </div>
                                    );
                                })}
                            </Card>
                        </div>
                        <div className="space-y-3">
                            <div className="text-sm font-bold">Regions you open in</div>
                            {quote.regionRows.length === 0 && <Card><p className="text-sm text-zinc-400">No regions yet.</p></Card>}
                            {quote.regionRows.map(row => (
                                <Card key={row.regionId} active={row.regionId === regionId} onClick={() => setRegionId(row.regionId)}>
                                    <div className="flex justify-between">
                                        <div className="font-bold">{row.name}</div>
                                        <div className="text-emerald-300 text-sm font-bold">{formatCompact(row.weeklyUsd)}/wk</div>
                                    </div>
                                    <div className="text-[11px] text-zinc-500">{row.countries} countries · {formatPeople(row.nightDemand)} on the night</div>
                                    <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-emerald-400" style={{ width: `${row.servedPct * 100}%` }} />
                                    </div>
                                    <div className="mt-2 text-[11px] text-zinc-400">{countLabel(row.scouts, 'Scout')} · {countLabel(row.workhorses, 'Workhorse')} · {countLabel(row.titans, 'Titan')} · {Math.round(row.servedPct * 100)}% served</div>
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
                                            disabled={locked}
                                            value={state.regionCoverage?.[row.regionId] ?? Math.round(row.servedPct * 100)}
                                            onChange={(event) => { if (!locked) onChange(applyRegionCoverage(state, row.regionId, Number(event.target.value))); }}
                                            className="w-full accent-[#8B7BFF]"
                                        />
                                    </label>
                                </Card>
                            ))}
                        </div>
                    </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="grid lg:grid-cols-3 gap-4">
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Launch allocation</div>
                            <div className="text-4xl font-black" style={{ fontFamily: headingFont }}>{formatCompact(quote.dueNow)}</div>
                            <div className="text-sm text-zinc-400">Leaves now · {formatCompact(quote.leftAfter)} left after</div>
                            <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-[#4F3BFF]" style={{ width: `${Math.min(100, player.money > 0 ? (quote.dueNow / player.money) * 100 : 100)}%` }} />
                            </div>
                            <p className="text-xs text-zinc-500 mt-3">Charged when you commission, in USD, against the same treasury as the rest of the career.</p>
                            <div className="mt-4 space-y-2 text-sm">
                                <Row label="Infrastructure" value={formatCompact(quote.construction)} />
                                <Row label="Facility deposits" value={formatCompact(quote.deposits)} />
                                <Row label="Market access" value={formatCompact(quote.access)} />
                                <Row label="Licences" value={formatCompact(quote.licences)} />
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
                            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Simulated · changes nothing</div>
                            <h2 className="text-4xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Rehearse opening night</h2>
                            <p className="text-sm text-zinc-400">A fake premiere through the halls you drew. The save is not touched.</p>
                            <div className="grid grid-cols-3 gap-2">
                                {(['QUIET', 'LIKELY', 'SURGE'] as AudienceMode[]).map(item => (
                                    <button key={item} onClick={() => { setMode(item); setPlaying(false); }} className={`rounded-2xl p-3 text-left border ${mode === item ? 'border-[#4F3BFF] bg-[#4F3BFF]/10' : 'border-white/10 bg-[#12151c]'}`}>
                                        <div className="text-xs uppercase text-zinc-400">{item === 'QUIET' ? 'Quiet night' : item === 'LIKELY' ? 'Likely' : 'Surge'}</div>
                                        <div className="font-black">{item === 'QUIET' ? 'Fewer' : item === 'LIKELY' ? 'Expected' : 'Everyone'}</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setPlaying(true)} className="w-full py-3 rounded-full bg-[#4F3BFF] font-black uppercase tracking-wider text-sm">Run the rehearsal</button>
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase text-zinc-500">Concurrent streams</div>
                            <div className="text-5xl font-black text-emerald-300" style={{ fontFamily: headingFont }}>{formatPeople(rehearsal.peak)}</div>
                            <div className="text-sm text-zinc-400">{Math.round((rehearsal.capacity > 0 ? rehearsal.peak / rehearsal.capacity : 0) * 100)}% of capacity · {formatPeople(rehearsal.capacity)} carried</div>
                            <Curve values={rehearsal.curve} />
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {rehearsal.countries.slice(0, 8).map(country => (
                                    <div key={country.id} className="rounded-xl bg-black/30 px-3 py-2 text-sm flex justify-between">
                                        <span>{country.flag} {country.name}</span>
                                        <span className="text-emerald-300">{playing ? 'playing' : 'ready'}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card className={rehearsal.held ? 'border-emerald-500/40' : 'border-rose-500/40'}>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Result</div>
                            <div className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>{rehearsal.held ? 'It held' : 'It broke'}</div>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                                <Mini label="Peak" value={formatPeople(rehearsal.peak)} />
                                <Mini label="Spare" value={`${Math.round(rehearsal.sparePct * 100)}%`} />
                            </div>
                            <div className="mt-3 text-sm text-zinc-300 space-y-1">
                                {rehearsal.failures.length === 0 ? <p>No single point of failure showed up.</p> : rehearsal.failures.map(line => <p key={line}>{line}</p>)}
                            </div>
                            <div className="mt-3 text-xs text-zinc-500">Catalogue coverage {Math.round(rehearsal.cataloguePct * 100)}%. This screen writes nothing.</div>
                        </Card>
                    </div>
                )}

                {step === 3 && (
                    <div className="grid g-side max-w-5xl">
                        <div className="paper" style={{ padding: '36px 40px' }}>
                            <div className="lab" style={{ color: '#6B5E44' }}>Agreement</div>
                            <h2 className="h2" style={{ fontFamily: 'var(--s)', textTransform: 'none', letterSpacing: 0, marginTop: 8 }}>Commission the build</h2>
                            <p className="p" style={{ marginTop: 8, color: '#4A3F2B' }}>Signing spends {formatCompact(quote.dueNow)} from the treasury. The six-week reserve covers burn while the rooms are built. Weekly costs start when the service goes live.</p>
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
                            <button type="button" onClick={sign} disabled={locked} className={`btn pri full ${locked ? 'dis' : ''}`} style={{ marginTop: 18 }}>Sign and commission</button>
                        </div>
                    </div>
                )}
            </div>
            <FooterBar
                leftLabel="Network"
                leftValue={`${quote.regionRows.length} regions`}
                money={formatCompact(player.money)}
                onBack={step === 0 ? onLaunch : () => go(step - 1)}
                onNext={step < 3 ? () => go(step + 1) : undefined}
                nextLabel={step === 0 ? 'Next · Money' : step === 1 ? 'Next · Test' : 'Next · Sign'}
            />
        </div>
    );
};

const countLabel = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

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

const Curve: React.FC<{ values: number[] }> = ({ values }) => {
    const max = Math.max(1, ...values);
    const points = values.map((value, index) => `${(index / 23) * 300},${90 - (value / max) * 80}`).join(' ');
    return (
        <svg viewBox="0 0 300 100" className="w-full mt-2">
            <polyline fill="none" stroke="#fb7185" strokeWidth="3" points={points} />
        </svg>
    );
};
