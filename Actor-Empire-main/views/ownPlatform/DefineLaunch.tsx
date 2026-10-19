import React, { useState } from 'react';
import { OwnPlatformState, Player, RevenueLane } from '../../types';
import { getCountry, LAUNCH_REGIONS } from '../../services/ownPlatform/catalog';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { saveMediaBlob } from '../../services/mediaStorage';
import {
    IDENTITY_PRESETS,
    MARKET_COUNTRIES,
    STOREFRONTS,
    averagePlanPrice,
    formatCompact,
    formatPeople,
    identityById,
    licenceShelf,
    listOwnedTitles,
    quoteLaunch,
    storefrontById,
    syncRegions,
} from '../../services/ownPlatform/logic';
import { Card, FooterBar, WorldDots, headingFont } from './ui';

const STEPS = ['Markets', 'Clearance', 'Ident', 'Storefront', 'Catalogue', 'Pricing', 'Blueprint'];

interface Props {
    player: Player;
    onChange: (next: OwnPlatformState) => void;
    onBuild: () => void;
}

export const DefineLaunch: React.FC<Props> = ({ player, onChange, onBuild }) => {
    const state = player.ownPlatform!;
    const step = state.defineStep;
    const quote = quoteLaunch(player);
    const [focusId, setFocusId] = useState(state.selectedCountryIds[0] || 'US');
    const [regionFilter, setRegionFilter] = useState<string>('ALL');
    const locked = state.commissioned;
    const patch = (recipe: (current: OwnPlatformState) => OwnPlatformState) => {
        if (locked && step < 6) return;
        onChange(recipe(state));
    };
    const go = (next: number) => onChange({ ...state, defineStep: Math.max(0, Math.min(6, next)) });

    const countries = MARKET_COUNTRIES.filter(country => regionFilter === 'ALL' || country.regionId === regionFilter);
    const focus = getCountry(focusId) || countries[0];

    const toggleCountry = (id: string) => {
        const selected = state.selectedCountryIds.includes(id)
            ? state.selectedCountryIds.filter(countryId => countryId !== id)
            : [...state.selectedCountryIds, id];
        const applications = state.applications.filter(row => selected.includes(row.countryId) || row.status === 'APPROVED' || (row.status === 'CONDITIONS' && row.acceptedConditions));
        patch(current => syncRegions({ ...current, selectedCountryIds: selected, applications }));
        setFocusId(id);
    };

    const fileAll = () => {
        const absolute = getAbsoluteWeek(player.age, player.currentWeek);
        patch(current => {
            const applications = [...current.applications];
            current.selectedCountryIds.forEach(id => {
                const country = getCountry(id);
                if (!country) return;
                const existing = applications.find(row => row.countryId === id);
                if (existing && existing.status !== 'REJECTED') return;
                if (existing?.status === 'REJECTED' && (existing.refileWeekAbsolute || 0) > absolute) return;
                const nextApp = {
                    countryId: id,
                    status: 'FILED' as const,
                    weeksLeft: country.reviewWeeks,
                    filedWeekAbsolute: absolute,
                    note: 'Application filed. Reviews run on their own from here.',
                    acceptedConditions: false,
                };
                if (existing) applications[applications.indexOf(existing)] = nextApp;
                else applications.push(nextApp);
            });
            return { ...current, applications };
        });
    };

    const acceptConditions = (id: string) => {
        patch(current => ({
            ...current,
            applications: current.applications.map(row => row.countryId === id ? { ...row, acceptedConditions: true, note: 'Conditions accepted. The access bill is higher.' } : row),
        }));
    };

    const footer = (
        <FooterBar
            leftLabel="Network"
            leftValue={`${state.selectedCountryIds.length} countries`}
            money={formatCompact(player.money)}
            onBack={step > 0 ? () => go(step - 1) : undefined}
            onNext={() => step === 6 ? onBuild() : go(step + 1)}
            nextLabel={step === 6 ? 'Next · Build' : `Next · ${STEPS[step + 1]}`}
        />
    );

    return (
        <div className="flex flex-col min-h-full">
            <div className="px-4 lg:px-10 pt-4 flex gap-2 overflow-x-auto">
                {STEPS.map((label, index) => (
                    <button key={label} onClick={() => go(index)} className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${index === step ? 'bg-[#ff3b30] text-white' : 'bg-white/5 text-zinc-400'}`}>{index + 1} {label}</button>
                ))}
            </div>
            <div className="p-4 lg:p-10 flex-1">
                {step === 0 && (
                    <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff4d4d]">Empire+</div>
                            <h2 className="text-4xl lg:text-5xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>{state.name.trim() || 'Empire+'}</h2>
                            <p className="text-sm text-zinc-400 mt-2 max-w-xl">Define the launch. This is the service you are standing up, country by country.</p>
                        </div>
                        <label className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 lg:w-72">
                            Service name
                            <input
                                value={state.name}
                                disabled={locked}
                                onChange={(event) => patch(current => ({ ...current, name: event.target.value.slice(0, 32) }))}
                                className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-black uppercase tracking-wide outline-none"
                                style={{ fontFamily: headingFont }}
                            />
                        </label>
                    </div>
                    <div className="grid lg:grid-cols-[200px_minmax(0,1fr)_340px] gap-4">
                        <div className="flex lg:flex-col gap-2 overflow-x-auto">
                            <FilterChip active={regionFilter === 'ALL'} label="World" onClick={() => setRegionFilter('ALL')} />
                            {LAUNCH_REGIONS.map(region => (
                                <FilterChip key={region.id} active={regionFilter === region.id} label={region.short} onClick={() => setRegionFilter(region.id)} />
                            ))}
                        </div>
                        <div className="space-y-4">
                            <Card>
                                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Opening footprint · {state.selectedCountryIds.length} chosen</div>
                                <WorldDots selected={state.selectedCountryIds} />
                            </Card>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {countries.map(country => {
                                    const on = state.selectedCountryIds.includes(country.id);
                                    return (
                                        <Card key={country.id} active={on || focusId === country.id} onClick={() => { setFocusId(country.id); }}>
                                            <div className="flex justify-between gap-2">
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">{country.difficulty.replace('_', ' ')}</div>
                                                    <div className="font-black text-lg" style={{ fontFamily: headingFont }}>{country.flag} {country.name}</div>
                                                </div>
                                                <button onClick={(event) => { event.stopPropagation(); toggleCountry(country.id); }} className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${on ? 'bg-[#ff3b30]' : 'bg-white/10'}`}>{on ? 'Remove' : 'Add'}</button>
                                            </div>
                                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                                <Stat label="Audience" value={formatPeople(country.audienceM * 1_000_000)} />
                                                <Stat label="Growth" value={`+${country.growthPct}%`} />
                                                <Stat label="Access" value={formatCompact(country.accessCost)} />
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                {country.competitors.map(rival => (
                                                    <ShareBar key={rival.name} label={rival.name} share={rival.share} />
                                                ))}
                                                <ShareBar label="Nobody yet" share={country.unclaimedPct} muted />
                                            </div>
                                            <div className="mt-2 text-[11px] text-zinc-400">{country.languages.map(language => `${language.name} ${language.share}%`).join(' · ')}</div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                        {focus && (
                            <Card className="lg:sticky lg:top-4 h-fit">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{focus.regionId.replace('_', ' ')}</div>
                                        <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>{focus.flag} {focus.name}</div>
                                    </div>
                                    <button onClick={() => toggleCountry(focus.id)} className="text-xs text-zinc-400">{state.selectedCountryIds.includes(focus.id) ? 'Remove from opening day' : 'Add to opening day'}</button>
                                </div>
                                <SheetRow label="Tax" value={focus.taxLabel} note={focus.taxNote} />
                                <SheetRow label="Entry review" value={focus.reviewLabel} note={`${focus.reviewWeeks} weeks`} />
                                <SheetRow label="Privacy" value={focus.privacyLabel} note={focus.privacyNote} />
                                <SheetRow label="Local content" value={focus.localContentLabel} note={focus.localContentNote} />
                                <div className="mt-4 text-sm text-zinc-400">To get in</div>
                                <div className="text-2xl font-black text-[#ffb4b4]">{formatCompact(focus.accessCost)}</div>
                                <div className="mt-3 text-[11px] uppercase tracking-wider text-zinc-500">Filings</div>
                                <ul className="mt-1 text-sm text-zinc-300 space-y-1">
                                    {focus.filings.map(item => <li key={item}>· {item}</li>)}
                                </ul>
                            </Card>
                        )}
                    </div>
                    </div>
                )}

                {step === 1 && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                        <div className="space-y-3">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#ff4d4d]">Clearance</div>
                                    <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>File, then wait the weeks out</h2>
                                </div>
                                <button onClick={fileAll} disabled={locked} className="px-4 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-40">File selected</button>
                            </div>
                            <p className="text-sm text-zinc-400 max-w-2xl">Nothing is charged for filing. Access fees sit on the launch bill and leave the treasury only when you commission. Advance the career week to hear back. A file can clear, stall, come back with conditions, or be refused.</p>
                            <div className="grid md:grid-cols-2 gap-3">
                                {state.selectedCountryIds.map(id => {
                                    const country = getCountry(id);
                                    const application = state.applications.find(row => row.countryId === id);
                                    if (!country) return null;
                                    return (
                                        <Card key={id}>
                                            <div className="flex justify-between">
                                                <div className="font-black text-xl" style={{ fontFamily: headingFont }}>{country.flag} {country.name}</div>
                                                <StatusPill status={application?.status} />
                                            </div>
                                            <p className="text-sm text-zinc-400 mt-2">{application?.note || 'Not filed.'}</p>
                                            {application && (application.status === 'FILED' || application.status === 'DELAYED') && (
                                                <div className="mt-3 text-sm"><span className="text-[#ffb4b4] font-bold">{application.weeksLeft} weeks</span> left on the clock</div>
                                            )}
                                            {application?.status === 'CONDITIONS' && !application.acceptedConditions && (
                                                <button onClick={() => acceptConditions(id)} className="mt-3 text-xs font-black uppercase tracking-wider text-black bg-[#f5c16c] rounded-full px-3 py-2">Accept conditions</button>
                                            )}
                                            {application?.status === 'CONDITIONS' && application.acceptedConditions && <div className="mt-2 text-emerald-300 text-sm">Conditions accepted.</div>}
                                        </Card>
                                    );
                                })}
                                {state.selectedCountryIds.length === 0 && <Card><p className="text-zinc-400">Choose markets first.</p></Card>}
                            </div>
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Markets cleared</div>
                            <div className="text-4xl font-black" style={{ fontFamily: headingFont }}>
                                {state.applications.filter(row => row.status === 'APPROVED' || (row.status === 'CONDITIONS' && row.acceptedConditions)).length}
                                <span className="text-zinc-500 text-2xl">/{state.selectedCountryIds.length}</span>
                            </div>
                            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${state.selectedCountryIds.length ? (state.applications.filter(row => row.status === 'APPROVED' || row.acceptedConditions).length / state.selectedCountryIds.length) * 100 : 0}%` }} />
                            </div>
                            <p className="text-sm text-zinc-400 mt-4">Each market keeps its own clock. A delay is not a no. A rejection can be filed again after eight weeks.</p>
                        </Card>
                    </div>
                )}

                {step === 2 && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                        <div>
                            <label className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Service name</label>
                            <input value={state.name} disabled={locked} onChange={(event) => patch(current => ({ ...current, name: event.target.value.slice(0, 32) }))} className="mt-1 w-full bg-transparent border-b border-white/20 text-4xl font-black uppercase outline-none py-2" style={{ fontFamily: headingFont }} />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
                                {IDENTITY_PRESETS.map(preset => (
                                    <Card key={preset.id} active={state.identityId === preset.id} onClick={() => patch(current => ({ ...current, identityId: preset.id }))}>
                                        <div className="h-2 rounded-full mb-3" style={{ background: preset.accent }} />
                                        <div className="font-black text-2xl uppercase" style={{ fontFamily: headingFont }}>{preset.name}</div>
                                        <p className="text-sm text-zinc-400 mt-1">{preset.tagline}</p>
                                        <button onClick={(event) => { event.stopPropagation(); playTone(preset.toneHz); }} className="mt-3 text-[11px] uppercase tracking-wider text-zinc-300">Play the tone</button>
                                    </Card>
                                ))}
                            </div>
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Sound</div>
                            <div className="text-2xl font-black mt-1" style={{ fontFamily: headingFont }}>{identityById(state.identityId).name}</div>
                            <p className="text-sm text-zinc-400 mt-2">Or replace the bumper with your own audio. The file stays in the media library. The save only keeps its name.</p>
                            <input
                                type="file"
                                accept="audio/*"
                                disabled={locked}
                                className="mt-4 text-sm"
                                onChange={async (event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 2_000_000) {
                                        patch(current => ({ ...current, customAudioName: 'Too large — keep it under 2MB' }));
                                        return;
                                    }
                                    const meta = await saveMediaBlob(`own-platform-audio-${player.id}`, file, { kind: 'other' });
                                    onChange({ ...state, customAudioName: file.name, customAudioMediaId: meta.id });
                                }}
                            />
                            {state.customAudioName && <div className="mt-3 text-sm text-emerald-300">{state.customAudioName}</div>}
                        </Card>
                    </div>
                )}

                {step === 3 && (
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {STOREFRONTS.map(layout => (
                            <Card key={layout.id} active={state.storefrontId === layout.id} onClick={() => patch(current => ({ ...current, storefrontId: layout.id }))}>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Layout</div>
                                <div className="text-2xl font-black uppercase" style={{ fontFamily: headingFont }}>{layout.name}</div>
                                <p className="text-sm text-zinc-400 mt-2">{layout.blurb}</p>
                                <div className="mt-3 text-xs text-zinc-500">Discovery {layout.discovery.toFixed(2)} · Staying {layout.retention.toFixed(2)}</div>
                            </Card>
                        ))}
                    </div>
                )}

                {step === 4 && (
                    <CatalogueStep player={player} state={state} locked={locked} onChange={onChange} />
                )}

                {step === 5 && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
                        <div className="space-y-3">
                            {state.plans.map(plan => (
                                <Card key={plan.id}>
                                    <div className="grid sm:grid-cols-4 gap-3 items-end">
                                        <label className="text-xs text-zinc-500">Name
                                            <input disabled={locked} value={plan.name} onChange={(event) => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, name: event.target.value } : row) }))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                                        </label>
                                        <label className="text-xs text-zinc-500">USD / month
                                            <input disabled={locked} type="number" min={0} value={plan.monthlyUsd} onChange={(event) => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, monthlyUsd: Number(event.target.value) } : row) }))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                                        </label>
                                        <label className="text-xs text-zinc-500">Screens
                                            <input disabled={locked} type="number" min={1} max={6} value={plan.screens} onChange={(event) => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, screens: Number(event.target.value) } : row) }))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                                        </label>
                                        <button disabled={locked} onClick={() => patch(current => ({ ...current, plans: current.plans.filter(row => row.id !== plan.id) }))} className="text-xs uppercase tracking-wider text-zinc-400">Remove</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                        <Toggle label="Ads" on={plan.ads} disabled={locked} onClick={() => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, ads: !row.ads } : row) }))} />
                                        <Toggle label="Downloads" on={plan.downloads} disabled={locked} onClick={() => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, downloads: !row.downloads } : row) }))} />
                                        {(['SD', 'HD', '4K'] as const).map(quality => (
                                            <button key={quality} disabled={locked} onClick={() => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, quality } : row) }))} className={`px-2 py-1 rounded-full ${plan.quality === quality ? 'bg-white text-black' : 'bg-white/10'}`}>{quality}</button>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                            <button disabled={locked || state.plans.length >= 4} onClick={() => patch(current => ({ ...current, plans: [...current.plans, { id: `plan-${Date.now()}`, name: 'Plus', monthlyUsd: 16, ads: false, downloads: true, quality: '4K', screens: 4 }] }))} className="text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full bg-white text-black disabled:opacity-40">Add a plan</button>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {(['SUBSCRIPTION', 'ADVERTISING', 'RENTAL', 'PURCHASE', 'PREMIUM', 'DAY_PASS', 'SPONSORSHIP'] as RevenueLane[]).map(lane => {
                                    const on = state.revenueLanes.includes(lane);
                                    return (
                                        <button key={lane} disabled={locked} onClick={() => patch(current => ({
                                            ...current,
                                            revenueLanes: on ? current.revenueLanes.filter(item => item !== lane) : [...current.revenueLanes, lane],
                                        }))} className={`px-3 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider ${on ? 'bg-[#ff3b30]' : 'bg-white/10 text-zinc-300'}`}>{lane.replace('_', ' ')}</button>
                                    );
                                })}
                            </div>
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Commercial setup</div>
                            <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>{state.plans.length} plans</div>
                            <div className="mt-4 text-sm text-zinc-400">Average price</div>
                            <div className="text-4xl font-black">${averagePlanPrice(state).toFixed(0)}</div>
                            <div className="mt-4 text-sm text-zinc-400">Forecast households</div>
                            <div className="text-2xl font-black text-emerald-300">{formatPeople(quote.households)}</div>
                            <p className="text-xs text-zinc-500 mt-3">A higher price and a thin catalogue push people toward piracy. Pirated plays pay nothing.</p>
                        </Card>
                    </div>
                )}

                {step === 6 && (
                    <div className="grid lg:grid-cols-3 gap-3">
                        <Card className="lg:col-span-2">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#ff4d4d]">Blueprint</div>
                            <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>{state.name}</h2>
                            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                                <Line label="Markets" value={`${state.selectedCountryIds.length} chosen`} />
                                <Line label="Cleared" value={`${state.applications.filter(row => row.status === 'APPROVED' || row.acceptedConditions).length}`} />
                                <Line label="Identity" value={identityById(state.identityId).name} />
                                <Line label="Storefront" value={storefrontById(state.storefrontId).name} />
                                <Line label="Catalogue" value={`${state.catalogue.length} titles`} />
                                <Line label="Plans" value={`${state.plans.length} · $${averagePlanPrice(state).toFixed(0)}`} />
                                <Line label="Due at commission" value={formatCompact(quote.dueNow)} />
                                <Line label="Weekly burn" value={formatCompact(quote.weeklyBurn)} />
                                <Line label="Forecast revenue / wk" value={formatCompact(quote.forecastWeeklyRevenue)} />
                                <Line label="Households" value={formatPeople(quote.households)} />
                                <Line label="Piracy" value={`${Math.round(quote.piracyShare * 100)}% of viewing`} />
                                <Line label="Lanes" value={state.revenueLanes.join(', ') || 'None'} />
                            </div>
                        </Card>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Blockers</div>
                            {quote.blockers.filter(line => line !== 'Construction has already been signed.').length === 0 ? (
                                <p className="mt-3 text-emerald-300">Nothing is standing in the way of a signature. The bill is still unpaid.</p>
                            ) : (
                                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                                    {quote.blockers.filter(line => line !== 'Construction has already been signed.').map(line => <li key={line}>· {line}</li>)}
                                </ul>
                            )}
                            <p className="text-xs text-zinc-500 mt-4">You can walk the build while reviews are still out. Money does not move until you commission.</p>
                        </Card>
                    </div>
                )}
            </div>
            {footer}
        </div>
    );
};

const CatalogueStep: React.FC<{ player: Player; state: OwnPlatformState; locked: boolean; onChange: (next: OwnPlatformState) => void }> = ({ player, state, locked, onChange }) => {
    const owned = listOwnedTitles(player);
    const shelf = licenceShelf();
    const toggle = (pick: typeof shelf[number]) => {
        if (locked) return;
        const exists = state.catalogue.some(row => row.id === pick.id);
        onChange({
            ...state,
            catalogue: exists ? state.catalogue.filter(row => row.id !== pick.id) : [...state.catalogue, pick],
        });
    };
    return (
        <div className="grid lg:grid-cols-2 gap-4">
            <div>
                <h3 className="text-2xl font-black uppercase mb-3" style={{ fontFamily: headingFont }}>Owned</h3>
                <div className="space-y-2">
                    {owned.length === 0 && <Card><p className="text-sm text-zinc-400">No productions of your own yet. Licence a shelf for opening night, or come back when a film is finished.</p></Card>}
                    {owned.map(title => (
                        <TitleRow key={title.id} title={title.title} meta={`${title.genre} · yours · free`} on={state.catalogue.some(row => row.id === title.id)} onClick={() => toggle(title)} />
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-black uppercase mb-3" style={{ fontFamily: headingFont }}>Licences</h3>
                <p className="text-sm text-zinc-500 mb-2">The fee is added to the launch bill. It is not taken today.</p>
                <div className="space-y-2">
                    {shelf.map(title => (
                        <TitleRow key={title.id} title={title.title} meta={`${title.genre} · ${title.language} · ${formatCompact(title.cost)}`} on={state.catalogue.some(row => row.id === title.id)} onClick={() => toggle(title)} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const TitleRow: React.FC<{ title: string; meta: string; on: boolean; onClick: () => void }> = ({ title, meta, on, onClick }) => (
    <button onClick={onClick} className={`w-full text-left rounded-2xl border px-4 py-3 ${on ? 'border-[#ff3b30] bg-[#ff3b30]/10' : 'border-white/10 bg-[#12151c]'}`}>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-zinc-400">{meta}</div>
    </button>
);

const FilterChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button onClick={onClick} className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${active ? 'bg-white text-black' : 'bg-white/5 text-zinc-300'}`}>{label}</button>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div>
        <div className="text-[10px] uppercase text-zinc-500">{label}</div>
        <div className="font-bold">{value}</div>
    </div>
);

const ShareBar: React.FC<{ label: string; share: number; muted?: boolean }> = ({ label, share, muted }) => (
    <div className="flex items-center gap-2 text-[11px]">
        <div className="w-20 truncate text-zinc-400">{label}</div>
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full ${muted ? 'bg-zinc-500' : 'bg-[#ff3b30]'}`} style={{ width: `${share}%` }} />
        </div>
        <div className="w-8 text-right text-zinc-400">{share}%</div>
    </div>
);

const SheetRow: React.FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
    <div className="mt-3 border-t border-white/5 pt-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="font-bold">{value}</div>
        <div className="text-xs text-zinc-400">{note}</div>
    </div>
);

const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
    const label = status === 'APPROVED' ? 'Approved' : status === 'DELAYED' ? 'Delayed' : status === 'CONDITIONS' ? 'Conditions' : status === 'REJECTED' ? 'Rejected' : status === 'FILED' ? 'Filed' : 'Waiting';
    const color = status === 'APPROVED' ? 'text-emerald-300' : status === 'REJECTED' ? 'text-rose-300' : status === 'CONDITIONS' ? 'text-amber-200' : 'text-zinc-300';
    return <span className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</span>;
};

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3 border-b border-white/5 py-2">
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold text-right">{value}</span>
    </div>
);

const Toggle: React.FC<{ label: string; on: boolean; onClick: () => void; disabled?: boolean }> = ({ label, on, onClick, disabled }) => (
    <button disabled={disabled} onClick={onClick} className={`px-2 py-1 rounded-full ${on ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-zinc-400'}`}>{label}</button>
);

const playTone = (frequency: number) => {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
};
