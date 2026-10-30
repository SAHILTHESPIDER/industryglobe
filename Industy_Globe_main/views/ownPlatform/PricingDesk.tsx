import React, { useEffect, useRef, useState } from 'react';
import { AdIntervalMin, OwnPlatformState, PlanBenefit, Player, PricingPlan, RevenueLane } from '../../types';
import { AD_INTERVALS, MAX_PLAN_USD, MIN_PLAN_USD, adIntervalLine, clampPaidUsd, withLane } from '../../services/ownPlatform/commercial';
import { currencyFor, formatLocalAmount, localMonthly, usdFromLocal } from '../../services/ownPlatform/fx';
import { formatCompact, formatPeople, quoteLaunch } from '../../services/ownPlatform/logic';
import { getCountry } from '../../services/ownPlatform/catalog';
import { Card, Segmented, Toggle, headingFont } from './ui';

interface Props {
    player: Player;
    state: OwnPlatformState;
    locked: boolean;
    onChange: (next: OwnPlatformState) => void;
}

const peopleDelta = (value: number) => {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${formatPeople(Math.abs(value))}`;
};

export const PricingDesk: React.FC<Props> = ({ player, state, locked, onChange }) => {
    const quote = quoteLaunch(player);
    const previous = useRef({ households: quote.households, revenue: quote.forecastWeeklyRevenue });
    const [delta, setDelta] = useState({ households: 0, revenue: 0 });
    useEffect(() => {
        setDelta({
            households: quote.households - previous.current.households,
            revenue: quote.forecastWeeklyRevenue - previous.current.revenue,
        });
        previous.current = { households: quote.households, revenue: quote.forecastWeeklyRevenue };
    }, [quote.households, quote.forecastWeeklyRevenue]);

    const patchPlan = (id: string, recipe: (plan: PricingPlan) => PricingPlan, lanes?: RevenueLane[]) => {
        if (locked) return;
        onChange({
            ...state,
            revenueLanes: lanes || state.revenueLanes,
            plans: state.plans.map(plan => plan.id === id ? recipe(plan) : plan),
        });
    };

    const setPasses = (hourUsd: number, dayUsd: number) => {
        if (locked) return;
        const passes = hourUsd > 0 || dayUsd > 0 ? { hourUsd, dayUsd } : undefined;
        onChange({
            ...state,
            passes,
            revenueLanes: withLane(state.revenueLanes, 'DAY_PASS', Boolean(passes)),
        });
    };

    const setStore = (rentUsd: number, buyUsd: number) => {
        if (locked) return;
        onChange({
            ...state,
            titleStore: rentUsd > 0 || buyUsd > 0 ? { rentUsd, buyUsd } : undefined,
            revenueLanes: withLane(withLane(state.revenueLanes, 'RENTAL', rentUsd > 0), 'PURCHASE', buyUsd > 0),
        });
    };

    const toggleBenefit = (plan: PricingPlan, benefit: PlanBenefit) => {
        const has = plan.benefits?.includes(benefit);
        const benefits = has
            ? (plan.benefits || []).filter(item => item !== benefit)
            : [...(plan.benefits || []), benefit];
        const lanes = benefit === 'PREMIUM'
            ? withLane(state.revenueLanes, 'PREMIUM', benefits.includes('PREMIUM'))
            : state.revenueLanes;
        patchPlan(plan.id, row => ({ ...row, benefits: benefits.length ? benefits : undefined }), lanes);
    };

    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4" data-testid="pricing-desk">
            <div className="space-y-3 min-w-0">
                <p className="text-sm text-zinc-400">Paid plans stay between ${MIN_PLAN_USD} and ${MAX_PLAN_USD}. Free with ads is the only $0 plan. The forecast updates with every change.</p>
                {state.plans.map(plan => (
                    <Card key={plan.id}>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                            <label className="text-xs text-zinc-500">Name
                                <input disabled={locked} value={plan.name} onChange={(event) => patchPlan(plan.id, row => ({ ...row, name: event.target.value }))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                            </label>
                            <label className="text-xs text-zinc-500">US price (USD)
                                <input
                                    disabled={locked || plan.freeWithAds}
                                    type="number"
                                    min={plan.freeWithAds ? 0 : MIN_PLAN_USD}
                                    max={MAX_PLAN_USD}
                                    step="0.01"
                                    value={Number.isFinite(plan.monthlyUsd) ? plan.monthlyUsd : 11}
                                    onChange={(event) => {
                                        const monthlyUsd = Number(event.target.value);
                                        if (!Number.isFinite(monthlyUsd) || monthlyUsd < 0 || monthlyUsd > MAX_PLAN_USD) return;
                                        patchPlan(plan.id, row => ({
                                            ...row,
                                            monthlyUsd: row.freeWithAds ? 0 : monthlyUsd,
                                            countryPrices: state.selectedCountryIds.includes('US')
                                                ? { ...(row.countryPrices || {}), US: row.freeWithAds ? 0 : monthlyUsd }
                                                : row.countryPrices,
                                        }));
                                    }}
                                    onBlur={() => {
                                        if (plan.freeWithAds) return;
                                        const monthlyUsd = clampPaidUsd(plan.monthlyUsd || MIN_PLAN_USD);
                                        patchPlan(plan.id, row => ({ ...row, monthlyUsd }));
                                    }}
                                    className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white disabled:opacity-50"
                                />
                            </label>
                            <label className="text-xs text-zinc-500">Screens
                                <input disabled={locked} type="number" min={1} max={6} value={plan.screens} onChange={(event) => patchPlan(plan.id, row => ({ ...row, screens: Math.max(1, Math.min(6, Number(event.target.value) || 1)) }))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                            </label>
                            <button type="button" disabled={locked} onClick={() => onChange({ ...state, plans: state.plans.filter(row => row.id !== plan.id) })} className="text-xs uppercase tracking-wider text-zinc-400 disabled:opacity-40">Remove</button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">{plan.freeWithAds ? 'Free with ads. No subscription, more viewers, and ad money instead of a monthly fee.' : `Paid price stays between $${MIN_PLAN_USD} and $${MAX_PLAN_USD}.`}</p>
                        <div className="flex flex-wrap gap-2 mt-3 text-xs">
                            <Toggle
                                label="Ads"
                                on={plan.ads}
                                disabled={locked || plan.freeWithAds}
                                onClick={() => patchPlan(plan.id, row => ({
                                    ...row,
                                    ads: !row.ads,
                                    adIntervalMin: !row.ads ? (row.adIntervalMin || 15) : undefined,
                                }), withLane(state.revenueLanes, 'ADVERTISING', !plan.ads || state.plans.some(row => row.id !== plan.id && row.ads)))}
                            />
                            <Toggle label="Downloads" on={plan.downloads} disabled={locked} onClick={() => patchPlan(plan.id, row => ({ ...row, downloads: !row.downloads }))} />
                            <Segmented value={plan.quality} options={['SD', 'HD', '4K']} disabled={locked} onChange={quality => patchPlan(plan.id, row => ({ ...row, quality: quality as PricingPlan['quality'] }))} />
                        </div>
                        {plan.ads && (
                            <div className="mt-3">
                                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Ad break</div>
                                <div className="mt-2 overflow-x-auto">
                                    <Segmented
                                        value={String(plan.adIntervalMin || 15)}
                                        options={AD_INTERVALS.map(String)}
                                        disabled={locked}
                                        onChange={value => patchPlan(plan.id, row => ({ ...row, ads: true, adIntervalMin: Number(value) as AdIntervalMin }), withLane(state.revenueLanes, 'ADVERTISING', true))}
                                    />
                                </div>
                                <p className="text-xs text-zinc-400 mt-2">{adIntervalLine(plan.adIntervalMin || 15)}</p>
                            </div>
                        )}
                        <div className="grid sm:grid-cols-2 gap-3 mt-4">
                            <label className="text-xs text-zinc-500">Intro discount %
                                <input disabled={locked || plan.freeWithAds} type="number" min={0} max={90} value={plan.introDiscountPct || 0} onChange={(event) => {
                                    const introDiscountPct = Math.max(0, Math.min(90, Math.round(Number(event.target.value) || 0)));
                                    patchPlan(plan.id, row => ({
                                        ...row,
                                        introDiscountPct: introDiscountPct || undefined,
                                        introWeeks: introDiscountPct > 0 ? (row.introWeeks || 4) : undefined,
                                    }));
                                }} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white disabled:opacity-50" />
                            </label>
                            <label className="text-xs text-zinc-500">Intro weeks
                                <input disabled={locked || plan.freeWithAds || !(plan.introDiscountPct)} type="number" min={1} max={13} value={plan.introWeeks || 4} onChange={(event) => {
                                    const introWeeks = Math.max(1, Math.min(13, Math.round(Number(event.target.value) || 1)));
                                    patchPlan(plan.id, row => ({ ...row, introWeeks }));
                                }} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white disabled:opacity-50" />
                            </label>
                        </div>
                        <p className="text-xs text-zinc-400 mt-2">{(plan.introDiscountPct || 0) > 0 ? `New subscribers pay ${plan.introDiscountPct}% less for ${plan.introWeeks || 4} weeks, then the full price.` : 'No intro offer. New subscribers pay the full price from week one.'}</p>
                        <label className="text-xs text-zinc-500 block mt-3">Annual discount %
                            <input disabled={locked || plan.freeWithAds} type="number" min={0} max={50} value={plan.annualDiscountPct || 0} onChange={(event) => {
                                const annualDiscountPct = Math.max(0, Math.min(50, Math.round(Number(event.target.value) || 0)));
                                patchPlan(plan.id, row => ({ ...row, annualDiscountPct: annualDiscountPct || undefined }));
                            }} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white disabled:opacity-50" />
                        </label>
                        <p className="text-xs text-zinc-400 mt-2">{(plan.annualDiscountPct || 0) > 0 ? `A yearly bill at ${plan.annualDiscountPct}% off. About two in five subscribers take it.` : 'Monthly billing only. A discount here offers a cheaper year.'}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <Toggle label="Premium" on={Boolean(plan.benefits?.includes('PREMIUM'))} disabled={locked} onClick={() => toggleBenefit(plan, 'PREMIUM')} />
                            <Toggle label="Early access" on={Boolean(plan.benefits?.includes('EARLY_ACCESS'))} disabled={locked} onClick={() => toggleBenefit(plan, 'EARLY_ACCESS')} />
                        </div>
                        <p className="text-xs text-zinc-400 mt-2">Premium is a badge a few more households will pay for. Early access adds a small bump in sign-ups.</p>
                        {!plan.freeWithAds && (
                            <div className="mt-4">
                                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Local price in each country</div>
                                <p className="text-xs text-zinc-500 mt-1">Each market keeps its own currency. The USD figure is what the ledger books. Rates can drift a little each week.</p>
                                {state.selectedCountryIds.length === 0 && <p className="text-sm text-amber-200 mt-2">Pick countries on the Markets step. India and the UK are the ones to set first.</p>}
                                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                                    {state.selectedCountryIds.map(countryId => {
                                        const country = getCountry(countryId);
                                        const money = currencyFor(countryId, state.fxRates);
                                        const local = localMonthly(plan, countryId, state.fxRates);
                                        const usd = usdFromLocal(local, countryId, state.fxRates);
                                        return (
                                            <label key={countryId} className="text-xs text-zinc-400 rounded-xl border border-white/10 px-3 py-2 min-w-0">
                                                <span className="block truncate">{country?.flag} {country?.name || countryId} · {money.code}</span>
                                                <input
                                                    disabled={locked}
                                                    type="number"
                                                    min={0}
                                                    value={local}
                                                    onChange={(event) => {
                                                        const nextLocal = Number(event.target.value);
                                                        if (!Number.isFinite(nextLocal) || nextLocal < 0) return;
                                                        patchPlan(plan.id, row => ({
                                                            ...row,
                                                            monthlyUsd: countryId === 'US' ? clampPaidUsd(nextLocal || MIN_PLAN_USD) : row.monthlyUsd,
                                                            countryPrices: { ...(row.countryPrices || {}), [countryId]: nextLocal },
                                                        }));
                                                    }}
                                                    className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white"
                                                />
                                                <span className="block mt-1 text-zinc-500">{formatLocalAmount(local, money.code)} · ${usd.toFixed(2)} USD</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={locked || state.plans.length >= 4} onClick={() => onChange({ ...state, plans: [...state.plans, { id: `plan-${Date.now()}`, name: 'Plus', monthlyUsd: 16, ads: false, downloads: true, quality: '4K', screens: 4 }] })} className="text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full bg-white text-black disabled:opacity-40">Add a plan</button>
                    <button type="button" data-testid="add-free-plan" disabled={locked || state.plans.length >= 4 || state.plans.some(plan => plan.freeWithAds)} onClick={() => onChange({
                        ...state,
                        revenueLanes: withLane(state.revenueLanes, 'ADVERTISING', true),
                        plans: [...state.plans, { id: `plan-free-${Date.now()}`, name: 'Free', monthlyUsd: 0, ads: true, freeWithAds: true, adIntervalMin: 15, downloads: false, quality: 'SD', screens: 1 }],
                    })} className="text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full border border-white/20 disabled:opacity-40">Add free with ads</button>
                </div>

                <Card>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">Ad-free passes</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Toggle label="1 hour" on={(state.passes?.hourUsd || 0) > 0} disabled={locked} onClick={() => setPasses((state.passes?.hourUsd || 0) > 0 ? 0 : 1.99, state.passes?.dayUsd || 0)} />
                        <Toggle label="1 day" on={(state.passes?.dayUsd || 0) > 0} disabled={locked} onClick={() => setPasses(state.passes?.hourUsd || 0, (state.passes?.dayUsd || 0) > 0 ? 0 : 4.99)} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        {(state.passes?.hourUsd || 0) > 0 && (
                            <label className="text-xs text-zinc-500">Hour pass USD
                                <input disabled={locked} type="number" min={MIN_PLAN_USD} max={20} step="0.01" value={state.passes?.hourUsd} onChange={(event) => setPasses(clampPaidUsd(Math.min(20, Number(event.target.value) || MIN_PLAN_USD)), state.passes?.dayUsd || 0)} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                            </label>
                        )}
                        {(state.passes?.dayUsd || 0) > 0 && (
                            <label className="text-xs text-zinc-500">Day pass USD
                                <input disabled={locked} type="number" min={MIN_PLAN_USD} max={30} step="0.01" value={state.passes?.dayUsd} onChange={(event) => setPasses(state.passes?.hourUsd || 0, clampPaidUsd(Math.min(30, Number(event.target.value) || MIN_PLAN_USD)))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">A viewer can pay once to skip ads for an hour, or until tomorrow. Pass money is added to the weekly receipt, not a second subscription.</p>
                </Card>

                <Card>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">Rent and buy</div>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Toggle label="Rentals" on={(state.titleStore?.rentUsd || 0) > 0} disabled={locked} onClick={() => setStore((state.titleStore?.rentUsd || 0) > 0 ? 0 : 3.99, state.titleStore?.buyUsd || 0)} />
                        <Toggle label="Buy store" on={(state.titleStore?.buyUsd || 0) > 0} disabled={locked} onClick={() => setStore(state.titleStore?.rentUsd || 0, (state.titleStore?.buyUsd || 0) > 0 ? 0 : 14.99)} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        {(state.titleStore?.rentUsd || 0) > 0 && (
                            <label className="text-xs text-zinc-500">Rent USD
                                <input disabled={locked} type="number" min={MIN_PLAN_USD} max={40} step="0.01" value={state.titleStore?.rentUsd} onChange={(event) => setStore(clampPaidUsd(Math.min(40, Number(event.target.value) || MIN_PLAN_USD)), state.titleStore?.buyUsd || 0)} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                            </label>
                        )}
                        {(state.titleStore?.buyUsd || 0) > 0 && (
                            <label className="text-xs text-zinc-500">Buy USD
                                <input disabled={locked} type="number" min={MIN_PLAN_USD} max={80} step="0.01" value={state.titleStore?.buyUsd} onChange={(event) => setStore(state.titleStore?.rentUsd || 0, clampPaidUsd(Math.min(80, Number(event.target.value) || MIN_PLAN_USD)))} className="mt-1 w-full bg-black/30 rounded-xl px-3 py-2 text-white" />
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">Rentals are a few days with a title. Buys keep it. Both need a title already on the shelf, and both sit on the same weekly receipt.</p>
                </Card>

                <div className="flex flex-wrap gap-2">
                    {(['SUBSCRIPTION', 'ADVERTISING', 'RENTAL', 'PURCHASE', 'PREMIUM', 'DAY_PASS', 'SPONSORSHIP'] as RevenueLane[]).map(lane => {
                        const on = state.revenueLanes.includes(lane);
                        return (
                            <button key={lane} type="button" disabled={locked} onClick={() => onChange({
                                ...state,
                                revenueLanes: on ? state.revenueLanes.filter(item => item !== lane) : [...state.revenueLanes, lane],
                            })} className={`chip ${on ? 'on' : ''}`}>{lane.replace('_', ' ')}</button>
                        );
                    })}
                </div>
                <p className="text-xs text-zinc-500">Lane switches are the older coarse levers. A priced offer above replaces that lane so the same dollar is not counted twice.</p>
            </div>

            <Card>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500" data-testid="pricing-forecast">Pricing forecast</div>
                <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>{formatPeople(quote.households)}</div>
                <p className="text-xs text-zinc-500">Expected subscribers</p>
                <div className="text-2xl font-black text-emerald-300 mt-3">{formatCompact(quote.forecastWeeklyRevenue)}</div>
                <p className="text-xs text-zinc-500">Expected revenue this week</p>
                <p className="text-sm text-zinc-300 mt-3" data-testid="pricing-delta">
                    {delta.households === 0 && delta.revenue === 0
                        ? 'No change yet. Edit a price or an offer and this line updates.'
                        : `${peopleDelta(delta.households)} subscribers · ${delta.revenue >= 0 ? '+' : ''}${formatCompact(delta.revenue)} a week.`}
                </p>
                <div className="mt-4 space-y-1 text-sm">
                    <Row label="Subscriptions" value={formatCompact(quote.revenueParts.subscriptions)} />
                    <Row label="Ads" value={formatCompact(quote.revenueParts.ads)} />
                    <Row label="Passes" value={formatCompact(quote.revenueParts.passes)} />
                    <Row label="Rentals" value={formatCompact(quote.revenueParts.rentals)} />
                    <Row label="Purchases" value={formatCompact(quote.revenueParts.purchases)} />
                </div>
                <div className="mt-4" data-testid="funding-pressure">
                    <div className="flex justify-between text-[11px] uppercase tracking-wider text-zinc-500">
                        <span>Funding pressure</span>
                        <span className={quote.fundingLabel === 'Strained' ? 'text-rose-300' : quote.fundingLabel === 'Tight' ? 'text-[#FFC44D]' : 'text-emerald-300'}>{quote.fundingLabel}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className={quote.fundingLabel === 'Strained' ? 'h-full bg-rose-400' : quote.fundingLabel === 'Tight' ? 'h-full bg-[#FFC44D]' : 'h-full bg-emerald-400'} style={{ width: `${Math.max(6, Math.round(quote.fundingPressure * 100))}%` }} />
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">{quote.fundingLine}</p>
                </div>
            </Card>
        </div>
    );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3 text-zinc-400"><span>{label}</span><span className="text-white">{value}</span></div>
);
