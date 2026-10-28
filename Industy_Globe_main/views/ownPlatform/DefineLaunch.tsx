import React, { useState } from 'react';
import { OwnPlatformState, Player, RevenueLane } from '../../types';
import { getCountry } from '../../services/ownPlatform/catalog';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { saveMediaBlob } from '../../services/mediaStorage';
import {
    IDENTITY_PRESETS,
    STOREFRONTS,
    formatAveragePlanPrice,
    formatCompact,
    formatPeople,
    identityById,
    licenceShelf,
    listOwnedTitles,
    quoteLaunch,
    storefrontById,
    storefrontEffectLine,
    syncRegions,
} from '../../services/ownPlatform/logic';
import { currencyFor, formatLocalAmount, localMonthly, usdFromLocal } from '../../services/ownPlatform/fx';
import { identityEffects } from '../../services/ownPlatform/identEffects';
import { playIdentSting } from '../../services/ownPlatform/identAudio';
import { IdentStage } from './IdentStage';
import { DayOneMarkets } from './DayOneMarkets';
import { NameIt } from './NameIt';
import { StorefrontPreview, type PreviewDevice } from './StorefrontPreview';
import { BillStrip, Card, FooterBar, Pill, PreviewPanel, Segmented, Toggle, headingFont } from './ui';

const STEPS = ['Name it', 'Markets', 'Clearance', 'Ident', 'Storefront', 'Catalogue', 'Pricing', 'Blueprint'];
const HINTS = [
    '',
    '',
    'Filing is free. Access fees sit on the launch bill and leave the treasury only when you commission.',
    'Each sting is synthesized in the browser. Hearth, Voltage, and Linen change who stays.',
    'The percentages under each layout are what opening night actually uses.',
    'A licence fee joins the launch bill. Nothing leaves the treasury today.',
    'Price and a thin shelf are what push a household toward piracy.',
    'This sheet is the whole company. Money still does not move until you sign the build.',
];

interface Props {
    player: Player;
    onChange: (next: OwnPlatformState) => void;
    onBuild: () => void;
}

export const DefineLaunch: React.FC<Props> = ({ player, onChange, onBuild }) => {
    const state = player.ownPlatform!;
    const step = state.defineStep;
    const quote = quoteLaunch(player);
    const locked = state.commissioned;
    const [device, setDevice] = useState<PreviewDevice>('desktop');
    const [stingId, setStingId] = useState<string | null>(null);
    const patch = (recipe: (current: OwnPlatformState) => OwnPlatformState) => {
        if (locked && step < 7) return;
        onChange(recipe(state));
    };
    const playSting = (styleId: string) => {
        setStingId(styleId);
        playIdentSting(styleId);
        window.setTimeout(() => setStingId(current => current === styleId ? null : current), 1500);
    };
    const localLanguage = (() => {
        if (state.selectedCountryIds.includes('IN')) return 'Hindi';
        for (const id of state.selectedCountryIds) {
            const country = getCountry(id);
            const language = country?.languages.find(row => row.name !== 'English')?.name || country?.languages[0]?.name;
            if (language) return language;
        }
        return 'Local films';
    })();
    const go = (next: number) => onChange({ ...state, defineStep: Math.max(0, Math.min(7, next)) });

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
            onNext={() => step === 7 ? onBuild() : go(step + 1)}
            nextLabel={step === 7 ? 'Next · Build' : `Next · ${STEPS[step + 1]}`}
        />
    );

    return (
        <>
            <div className="body">
                {step === 0 && (
                    <NameIt state={state} locked={locked} quote={quote} onName={name => patch(current => ({ ...current, name }))} />
                )}
                {step === 1 && (
                    <DayOneMarkets state={state} locked={locked} onPatch={(recipe) => patch(current => syncRegions(recipe(current)))} />
                )}
                {step > 1 && (
                <div className="grid g-side">
                <div className="stack">

                {step === 2 && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                        <div className="space-y-3">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Clearance</div>
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
                                                <div className="mt-3 text-sm"><span className="text-[#8B7BFF] font-bold">{application.weeksLeft} weeks</span> left on the clock</div>
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

                {step === 3 && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
                        <div>
                            <label className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Service name</label>
                            <input value={state.name} disabled={locked} onChange={(event) => patch(current => ({ ...current, name: event.target.value.slice(0, 32) }))} className="mt-1 w-full bg-transparent border-b border-white/20 text-4xl font-black uppercase outline-none py-2" style={{ fontFamily: headingFont }} />
                            <IdentStage className="mt-4" name={state.name} accent={identityById(state.identityId).accent} playing={stingId === state.identityId} />
                            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
                                {IDENTITY_PRESETS.map(preset => {
                                    const effect = identityEffects(preset.id);
                                    return (
                                        <Card key={preset.id} active={state.identityId === preset.id} onClick={() => { patch(current => ({ ...current, identityId: preset.id })); playSting(preset.id); }}>
                                            <div className="h-2 rounded-full mb-3" style={{ background: preset.accent }} />
                                            <div className="font-black text-2xl uppercase" style={{ fontFamily: headingFont }}>{preset.name}</div>
                                            <p className="text-sm text-zinc-400 mt-1">{preset.tagline}</p>
                                            <p className="text-xs text-zinc-300 mt-2">{effect.summary}</p>
                                            <button type="button" onClick={(event) => { event.stopPropagation(); playSting(preset.id); }} className="mt-3 text-[11px] uppercase tracking-wider text-zinc-300">Play the sting</button>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Sound</div>
                            <div className="text-2xl font-black mt-1" style={{ fontFamily: headingFont }}>{identityById(state.identityId).name}</div>
                            <p className="text-sm text-zinc-300 mt-2">{identityEffects(state.identityId).summary}</p>
                            <p className="text-sm text-zinc-400 mt-2">Or replace the bumper with your own audio. The file stays in the media library. The save only keeps its name. The sting above is what plays if you do not.</p>
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
                            <button
                                type="button"
                                data-testid="ident-sound-toggle"
                                disabled={locked}
                                onClick={() => patch(current => ({ ...current, identSound: current.identSound === false ? undefined : false }))}
                                className="mt-4 w-full rounded-full border border-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-wider"
                            >
                                Ident sound {state.identSound === false ? 'Off' : 'On'}
                            </button>
                        </Card>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Preview</span>
                            {(['desktop', 'tv', 'phone'] as PreviewDevice[]).map(item => (
                                <button key={item} type="button" onClick={() => setDevice(item)} className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${device === item ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'}`}>
                                    {item === 'desktop' ? 'Desktop' : item === 'tv' ? 'TV' : 'Phone'}
                                </button>
                            ))}
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">{storefrontById(state.storefrontId).name} · {device}</div>
                            <StorefrontPreview layout={storefrontById(state.storefrontId)} device={device} name={state.name || 'Empire+'} localLanguage={localLanguage} />
                            <div className="mt-3 text-sm font-bold text-emerald-200" data-testid="storefront-effect">{storefrontEffectLine(storefrontById(state.storefrontId))}</div>
                        </Card>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {STOREFRONTS.map(layout => (
                                <Card key={layout.id} active={state.storefrontId === layout.id} onClick={() => patch(current => ({ ...current, storefrontId: layout.id }))}>
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Layout</div>
                                    <div className="text-2xl font-black uppercase" style={{ fontFamily: headingFont }}>{layout.name}</div>
                                    <p className="text-sm text-zinc-400 mt-2">{layout.blurb}</p>
                                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 max-h-40">
                                        <div className="origin-top scale-[0.72] -mb-10">
                                            <StorefrontPreview layout={layout} device={device} name={state.name || 'Empire+'} localLanguage={localLanguage} />
                                        </div>
                                    </div>
                                    <div className="mt-3 text-xs font-bold text-emerald-200" data-testid={`storefront-effect-${layout.id}`}>{storefrontEffectLine(layout)}</div>
                                    {layout.localBoost >= 0.05 && <div className="mt-1 text-[11px] text-amber-200">Local films land harder on the home row.</div>}
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <CatalogueStep player={player} state={state} locked={locked} onChange={onChange} />
                )}

                {step === 6 && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
                        <div className="space-y-3">
                            {state.plans.map(plan => (
                                <Card key={plan.id}>
                                    <div className="grid sm:grid-cols-4 gap-3 items-end">
                                        <label className="text-xs text-zinc-500">Name
                                            <input disabled={locked} value={plan.name} onChange={(event) => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, name: event.target.value } : row) }))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                                        </label>
                                        <label className="text-xs text-zinc-500">US anchor (USD)
                                            <input disabled={locked} type="number" min={0} value={Number.isFinite(plan.monthlyUsd) ? plan.monthlyUsd : 11} onChange={(event) => {
                                                const parsed = Number(event.target.value);
                                                const monthlyUsd = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                                patch(current => ({
                                                    ...current,
                                                    plans: current.plans.map(row => row.id === plan.id ? {
                                                        ...row,
                                                        monthlyUsd,
                                                        countryPrices: current.selectedCountryIds.includes('US')
                                                            ? { ...(row.countryPrices || {}), US: monthlyUsd }
                                                            : row.countryPrices,
                                                    } : row),
                                                }));
                                            }} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                                        </label>
                                        <label className="text-xs text-zinc-500">Screens
                                            <input disabled={locked} type="number" min={1} max={6} value={plan.screens} onChange={(event) => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, screens: Number(event.target.value) } : row) }))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                                        </label>
                                        <button disabled={locked} onClick={() => patch(current => ({ ...current, plans: current.plans.filter(row => row.id !== plan.id) }))} className="text-xs uppercase tracking-wider text-zinc-400">Remove</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                                        <Toggle label="Ads" on={plan.ads} disabled={locked} onClick={() => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, ads: !row.ads } : row) }))} />
                                        <Toggle label="Downloads" on={plan.downloads} disabled={locked} onClick={() => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, downloads: !row.downloads } : row) }))} />
                                        <Segmented value={plan.quality} options={['SD', 'HD', '4K']} disabled={locked} onChange={quality => patch(current => ({ ...current, plans: current.plans.map(row => row.id === plan.id ? { ...row, quality: quality as typeof row.quality } : row) }))} />
                                    </div>
                                    <div className="mt-4">
                                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Local price in each country</div>
                                        <p className="text-xs text-zinc-500 mt-1">Each market keeps its own currency. The number next to it is the USD the ledger will book. Rates can drift a little each week. USD stays the books.</p>
                                        {state.selectedCountryIds.length === 0 && <p className="text-sm text-amber-200 mt-2">Pick countries on the Markets step. India and the UK are the ones to set first.</p>}
                                        <div className="grid sm:grid-cols-2 gap-2 mt-2 max-h-80 overflow-y-auto">
                                            {state.selectedCountryIds.map(countryId => {
                                                const country = getCountry(countryId);
                                                const quote = currencyFor(countryId, state.fxRates);
                                                const local = localMonthly(plan, countryId, state.fxRates);
                                                const usd = usdFromLocal(local, countryId, state.fxRates);
                                                return (
                                                    <label key={countryId} className="text-xs text-zinc-400 rounded-xl border border-white/10 px-3 py-2 min-w-0">
                                                        <span className="block truncate">{country?.name || countryId} · {quote.code} · {quote.unitsPerUsd.toFixed(quote.unitsPerUsd >= 100 ? 0 : 2)} per $1</span>
                                                        <input
                                                            disabled={locked}
                                                            type="number"
                                                            min={0}
                                                            value={local}
                                                            onChange={(event) => {
                                                                const parsed = Number(event.target.value);
                                                                const nextLocal = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                                                patch(current => ({
                                                                    ...current,
                                                                    plans: current.plans.map(row => row.id === plan.id ? {
                                                                        ...row,
                                                                        monthlyUsd: countryId === 'US' ? nextLocal : (Number.isFinite(row.monthlyUsd) ? row.monthlyUsd : 11),
                                                                        countryPrices: { ...(row.countryPrices || {}), [countryId]: nextLocal },
                                                                    } : row),
                                                                }));
                                                            }}
                                                            className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white"
                                                        />
                                                        <span className="block mt-1 text-zinc-500">{formatLocalAmount(local, quote.code)} · ${usd.toFixed(2)} USD</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
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
                                        }))} className={`chip ${on ? 'on' : ''}`}>{lane.replace('_', ' ')}</button>
                                    );
                                })}
                            </div>
                        </div>
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Commercial setup</div>
                            <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>{state.plans.length} plans</div>
                            <div className="mt-4 text-sm text-zinc-400">Average price</div>
                            <div className="text-4xl font-black">{formatAveragePlanPrice(state)}</div>
                            <div className="mt-4 text-sm text-zinc-400">Forecast households</div>
                            <div className="text-2xl font-black text-emerald-300">{formatPeople(quote.households)}</div>
                            <p className="text-xs text-zinc-500 mt-3">A higher price and a thin catalogue push people toward piracy. Pirated plays pay nothing.</p>
                        </Card>
                    </div>
                )}

                {step === 7 && (
                    <div className="grid lg:grid-cols-3 gap-3">
                        <Card className="lg:col-span-2 blueprint">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-[#8B7BFF]">Blueprint</div>
                            <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>{state.name}</h2>
                            <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                                <Line label="Markets" value={`${state.selectedCountryIds.length} chosen`} />
                                <Line label="Cleared" value={`${state.applications.filter(row => row.status === 'APPROVED' || row.acceptedConditions).length}`} />
                                <Line label="Identity" value={identityById(state.identityId).name} />
                                <Line label="Storefront" value={storefrontById(state.storefrontId).name} />
                                <Line label="Catalogue" value={`${state.catalogue.length} titles`} />
                                <Line label="Plans" value={`${state.plans.length} · ${formatAveragePlanPrice(state)}`} />
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
                <PreviewPanel name={state.name} quote={quote} hint={HINTS[step] || ''} />
                </div>
                )}
                <BillStrip quote={quote} />
            </div>
            {footer}
        </>
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
    <button onClick={onClick} className={`w-full text-left rounded-2xl border px-4 py-3 ${on ? 'border-[#4F3BFF] bg-[#4F3BFF]/10' : 'border-white/10 bg-[#12151c]'}`}>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-zinc-400">{meta}</div>
    </button>
);

const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
    const label = status === 'APPROVED' ? 'Approved' : status === 'DELAYED' ? 'Delayed' : status === 'CONDITIONS' ? 'Conditions' : status === 'REJECTED' ? 'Rejected' : status === 'FILED' ? 'Filed' : 'Not filed';
    const tone = status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'bad' : status === 'CONDITIONS' || status === 'DELAYED' ? 'warn' : status === 'FILED' ? 'run' : 'idle';
    return <Pill tone={tone}>{label}</Pill>;
};

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3 border-b border-white/5 py-2">
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold text-right">{value}</span>
    </div>
);
