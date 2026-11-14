import React, { useEffect, useRef, useState } from 'react';
import { AdIntervalMin, MembershipTier, OwnPlatformState, Player, PricingPlan } from '../../../types';
import { getCountry } from '../../../services/ownPlatform/catalog';
import { adBreakBars, adIntervalLine, clampPaidUsd, viewersPutOffPct, withLane, MAX_PLAN_USD, MIN_PLAN_USD } from '../../../services/ownPlatform/commercial';
import { currencyFor, formatLocalAmount, localMonthly, usdFromLocal } from '../../../services/ownPlatform/fx';
import { formatCompact, formatPeople, quoteLaunch } from '../../../services/ownPlatform/logic';
import { brandFrom } from '../../../services/ownPlatform/brand';
import {
    COMPARE_ROWS,
    PLAN_TEMPLATES,
    addPlan,
    applyRemoval,
    companyPicture,
    effectiveMonthly,
    inferTier,
    planSubscribers,
    readDesk,
    removalOutlook,
    setAdBreak,
    setBillingField,
    setPlanPrice,
    togglePlan,
} from '../../../services/ownPlatform/platformDesk';
import { Toggle } from '../ui';
import { BrandLockup } from '../BrandLockup';
import './offer.css';

interface Props {
    player: Player;
    mode: 'live' | 'compose';
    frozen?: boolean;
    editing?: boolean;
    lead?: 'deals' | 'plans';
    onCommit: (next: OwnPlatformState) => void;
    onStudio?: () => void;
    onOpenTech?: (rungId: string) => void;
}

const BREAKS = [5, 10, 15, 20] as const;

const useCount = (value: number) => {
    const [shown, setShown] = useState(value);
    const shownRef = useRef(value);
    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            shownRef.current = value;
            setShown(value);
            return;
        }
        const begin = shownRef.current;
        const start = performance.now();
        let frame = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 640);
            const eased = 1 - (1 - t) ** 3;
            const next = begin + (value - begin) * eased;
            shownRef.current = next;
            setShown(next);
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value]);
    return shown;
};

const asBreak = (value: number): AdIntervalMin => (
    value === 5 || value === 10 || value === 15 || value === 20 || value === 30 ? value : 15
);

const adMinutes = (minutes: number) => {
    const value = 30 / Math.max(1, minutes);
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const joinNames = (names: string[]) => {
    if (names.length === 0) return 'ad plans';
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

const pictureClass = (label: string) => (
    label === '480p' ? 'p480' : label === '720p' ? 'p720' : label === '1080p' ? 'p1080' : 'p4k'
);

const devicesFor = (text: string) => {
    const count = Number(text);
    if (!Number.isFinite(count)) return text;
    if (count <= 1) return 'Phones';
    if (count === 2) return 'Phone and web';
    return 'Phone, web, TV';
};

const blurbFor = (plan: PricingPlan, ad: number, picture: string) => {
    const tier = inferTier(plan);
    const screens = plan.screens === 1 ? 'one screen' : plan.screens === 2 ? 'two screens' : `${plan.screens} screens`;
    if (plan.freeWithAds || tier === 'FREE_ADS' || plan.ads || tier === 'BASIC_ADS') {
        return `${picture} · a break every ${plan.adIntervalMin || ad} min`;
    }
    if (tier === 'PREMIUM') return `${picture} · best picture and sound`;
    return `${picture} on ${screens}`;
};

const barColor = (plan: PricingPlan) => {
    const tier = inferTier(plan);
    if (tier === 'FREE_ADS') return '#8B7BFF';
    if (tier === 'BASIC_ADS') return '#6d8bff';
    if (tier === 'PREMIUM') return '#E4B15A';
    if (tier === 'CUSTOM') return '#9aa3bd';
    return '#2f5bff';
};

const inkFor = (plan: PricingPlan) => {
    const tier = inferTier(plan);
    if (tier === 'PREMIUM') return '#3a2a10';
    if (tier === 'FREE_ADS') return '#241848';
    return '#102044';
};

const Play = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>;
const Crown = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17h18l-2-9-5 4-2-6-2 6-5-4z" fill="currentColor" /></svg>;
const Screen = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2" fill="currentColor" /><rect x="9" y="18" width="6" height="2" fill="currentColor" /></svg>;
const Ticket = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 1 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" fill="currentColor" /></svg>;
const Plus = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" /></svg>;
const Hourglass = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v3l-4 5 4 5v5H6v-5l4-5-4-5z" fill="currentColor" /></svg>;

const TierGlyph = ({ plan }: { plan: PricingPlan }) => {
    const tier = inferTier(plan);
    if (tier === 'PREMIUM') return <Crown />;
    if (tier === 'STANDARD' || tier === 'CUSTOM') return <Screen />;
    return <Play />;
};

const money2 = (value: number) => `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`;

export const OfferBoard: React.FC<Props> = ({ player, mode, frozen = false, editing = false, lead = 'plans', onCommit, onStudio, onOpenTech }) => {
    const state = player.ownPlatform!;
    const draft = mode === 'compose';
    const desk = readDesk(state);
    const billing = desk.billing;
    const quote = quoteLaunch(player);
    const split = planSubscribers(state);
    const [menu, setMenu] = useState(false);
    const [customOpen, setCustomOpen] = useState(false);
    const [customName, setCustomName] = useState('Custom');
    const [customPrice, setCustomPrice] = useState('9.99');
    const [priceEdit, setPriceEdit] = useState<string | null>(null);
    const [priceDraft, setPriceDraft] = useState('');
    const [removeId, setRemoveId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [controlsOn, setControlsOn] = useState(editing);
    const controls = !frozen && (draft || controlsOn);
    const columns = state.plans.filter(plan => plan.enabled !== false);
    const [picked, setPicked] = useState('');
    const selectedPlan = columns.find(plan => plan.id === picked) || columns.find(plan => inferTier(plan) === 'STANDARD') || columns[0];
    const rawAd = billing?.adBreakMin || state.plans.find(plan => plan.adIntervalMin)?.adIntervalMin || 15;
    const ad = asBreak(rawAd);
    const bars = adBreakBars(ad);
    const adPlans = columns.filter(plan => plan.ads || plan.freeWithAds);
    const adMoney = state.stage === 'LIVE' && (desk.lastAdRevenue || 0) > 0 ? desk.lastAdRevenue || 0 : quote.revenueParts.ads;
    const adShown = useCount(adMoney);
    const homesShown = useCount(quote.households);
    const revShown = useCount(quote.forecastWeeklyRevenue);
    const picture = companyPicture(desk);
    const priced = selectedPlan && !selectedPlan.freeWithAds ? selectedPlan : columns.find(plan => !plan.freeWithAds) || selectedPlan;
    const prices = effectiveMonthly(priced?.monthlyUsd || 0, billing);
    const outlook = removeId ? removalOutlook(state, removeId) : undefined;
    const rentOn = (state.titleStore?.rentUsd || 0) > 0 || (state.titleStore?.buyUsd || 0) > 0;

    const write = (next: OwnPlatformState) => {
        if (frozen) return;
        setError('');
        onCommit(next);
    };
    const take = (result: { state: OwnPlatformState; error?: string }) => {
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        onCommit(result.state);
    };

    const savePrice = (plan: PricingPlan) => {
        const monthlyUsd = Number(priceDraft);
        setPriceEdit(null);
        if (frozen) return;
        if (draft && state.selectedCountryIds.includes('US') && !plan.freeWithAds && monthlyUsd >= MIN_PLAN_USD && monthlyUsd <= MAX_PLAN_USD) {
            const price = Math.round(monthlyUsd * 100) / 100;
            write({
                ...state,
                plans: state.plans.map(row => row.id === plan.id ? {
                    ...row,
                    monthlyUsd: price,
                    countryPrices: { ...(row.countryPrices || {}), US: price },
                } : row),
            });
            return;
        }
        take(setPlanPrice(state, plan.id, monthlyUsd, draft));
    };

    const setPasses = (hourUsd: number, dayUsd: number) => {
        const passes = hourUsd > 0 || dayUsd > 0 ? { hourUsd, dayUsd } : undefined;
        write({ ...state, passes, revenueLanes: withLane(state.revenueLanes, 'DAY_PASS', Boolean(passes)) });
    };
    const setStore = (rentUsd: number, buyUsd: number) => {
        write({
            ...state,
            titleStore: rentUsd > 0 || buyUsd > 0 ? { rentUsd, buyUsd } : undefined,
            revenueLanes: withLane(withLane(state.revenueLanes, 'RENTAL', rentUsd > 0), 'PURCHASE', buyUsd > 0),
        });
    };

    const stepBill = (patch: { quarterPct?: number; halfPct?: number; yearPct?: number; promoMonths?: number; promoPct?: number }) => {
        if (frozen) return;
        write(setBillingField(state, patch));
    };

    const membership = (
        <section id="offer-membership" data-testid="offer-plans">
            <div className="offer-member-head">
                <div className="offer-kicker">Membership</div>
                <button type="button" className="offer-btn" data-testid="change-plans" disabled={frozen} onClick={() => {
                    if (draft) {
                        setMenu(true);
                        return;
                    }
                    setControlsOn(value => !value);
                }}>Change plans</button>
            </div>
            {frozen && <p className="offer-note">Plans you set now stay locked until launch. Change plans unlocks after you go live — including turning off or removing Free with ads.</p>}
            {draft && !frozen && <p className="offer-note">Paid plans stay between ${MIN_PLAN_USD} and ${MAX_PLAN_USD}. Free with ads is the only $0 plan.</p>}
            <div className="offer-cards" style={{ marginTop: 10 }}>
                {state.plans.map(plan => {
                    const on = plan.enabled !== false;
                    return (
                        <article key={plan.id} className={`offer-card${selectedPlan?.id === plan.id ? ' sel' : ''}`} onClick={() => setPicked(plan.id)}>
                            {selectedPlan?.id === plan.id && on && <span className="offer-badge">Selected</span>}
                            <div className="offer-ico" style={{ background: barColor(plan), color: inkFor(plan) }}><TierGlyph plan={plan} /></div>
                            <div className="offer-name">{plan.name}</div>
                            <div className="offer-price">{plan.freeWithAds ? '$0' : money2(plan.monthlyUsd)}<small>a month</small></div>
                            <div className="offer-blurb">{blurbFor(plan, ad, picture)}</div>
                            {frozen && <div className="offer-lock">Locked until launch</div>}
                            {controls && (
                                <div className="offer-switchline" onClick={event => event.stopPropagation()}>
                                    <Toggle label={on ? 'On' : 'Off'} on={on} onClick={() => take(togglePlan(state, plan.id, !on, draft))} />
                                </div>
                            )}
                            {controls && (
                                <div className="offer-links" onClick={event => event.stopPropagation()}>
                                    {priceEdit === plan.id ? (
                                        <input
                                            className="offer-input"
                                            aria-label={`${plan.name} price`}
                                            type="number"
                                            min={MIN_PLAN_USD}
                                            max={MAX_PLAN_USD}
                                            step="0.01"
                                            value={priceDraft}
                                            autoFocus
                                            onChange={event => setPriceDraft(event.target.value)}
                                            onBlur={() => savePrice(plan)}
                                            onKeyDown={event => { if (event.key === 'Enter') savePrice(plan); }}
                                        />
                                    ) : (
                                        <button type="button" className="edit" onClick={() => { setPriceEdit(plan.id); setPriceDraft(String(plan.monthlyUsd)); }}>Edit price</button>
                                    )}
                                    <button type="button" className="remove" data-testid="remove-plan" onClick={() => setRemoveId(plan.id)}>Remove</button>
                                </div>
                            )}
                        </article>
                    );
                })}
                <article className="offer-card">
                    <div className="offer-ico" style={{ background: '#d7a15a', color: '#3a2a10' }}><Ticket /></div>
                    <div className="offer-name">Rent or buy</div>
                    <div className="offer-price">{rentOn ? money2(state.titleStore?.rentUsd || 0) : 'Off'}<small>{rentOn ? `buy ${money2(state.titleStore?.buyUsd || 0)} · pay per title` : 'pay per title'}</small></div>
                    {frozen && <div className="offer-lock">Locked until launch</div>}
                    {controls && (
                        <div className="offer-switchline">
                            <Toggle label={rentOn ? 'On' : 'Off'} on={rentOn} onClick={() => {
                                if (rentOn) setStore(0, 0);
                                else setStore(state.titleStore?.rentUsd || 3.99, state.titleStore?.buyUsd || 14.99);
                            }} />
                        </div>
                    )}
                </article>
                <article id="offer-add" className={`offer-card add${menu ? ' open' : ''}`} data-testid="add-plan-card" onClick={() => { if (controls) setMenu(value => !value); }}>
                    <div className="offer-ico" style={{ background: '#2f5bff', color: '#fff' }}><Plus /></div>
                    <div className="offer-name">+ Add plan</div>
                    <div className="offer-blurb">Free with ads, Basic, Standard, Premium, or a custom plan</div>
                    {frozen && <div className="offer-lock">Locked until launch</div>}
                    {menu && controls && (
                        <div className="offer-menu" data-testid="add-plan-menu" onClick={event => event.stopPropagation()}>
                            {PLAN_TEMPLATES.map(template => {
                                const held = state.plans.find(plan => inferTier(plan) === template.tier);
                                if (held) {
                                    return (
                                        <div key={template.tier} className="offer-add-row">
                                            <span>{template.name}<small className="offer-blurb">Already on this offer</small></span>
                                            <Toggle label={held.enabled === false ? 'Off' : 'On'} on={held.enabled !== false} onClick={() => take(togglePlan(state, held.id, held.enabled === false, draft))} />
                                        </div>
                                    );
                                }
                                return (
                                    <button key={template.tier} type="button" onClick={() => { take(addPlan(state, template.tier, undefined, draft)); setMenu(false); }}>{template.name}</button>
                                );
                            })}
                            <button type="button" onClick={() => setCustomOpen(value => !value)}>Custom plan</button>
                            {customOpen && (
                                <div className="offer-field">
                                    <span>Name</span>
                                    <input className="offer-input" value={customName} onChange={event => setCustomName(event.target.value)} />
                                    <span>US price</span>
                                    <input className="offer-input" type="number" min={MIN_PLAN_USD} max={MAX_PLAN_USD} step="0.01" value={customPrice} onChange={event => setCustomPrice(event.target.value)} />
                                    <button type="button" className="offer-btn pri" onClick={() => {
                                        take(addPlan(state, 'CUSTOM' as MembershipTier, { name: customName || 'Custom', monthlyUsd: Number(customPrice) || 9.99 }, draft));
                                        setMenu(false);
                                        setCustomOpen(false);
                                    }}>Add custom plan</button>
                                </div>
                            )}
                        </div>
                    )}
                </article>
            </div>
            {state.plans.filter(plan => plan.enabled === false).map(plan => (
                <p key={plan.id} className="offer-offnote" style={{ marginTop: 8 }}>
                    {plan.name} is off. {(split[plan.id] || 0).toLocaleString('en-US')} people on that plan stay until you turn it back on or remove it.
                </p>
            ))}
            <div className="offer-table-wrap" data-testid="compare-table" style={{ marginTop: 12 }}>
                <table className="offer-table">
                    <thead>
                        <tr>
                            <th>Plan</th>
                            {columns.map(plan => (
                                <th key={plan.id} className={selectedPlan?.id === plan.id ? 'sel' : ''} style={{ ['--bar' as string]: barColor(plan) }}>
                                    <div className="offer-kicker">{plan.name}</div>
                                    <div className="offer-price" style={{ fontSize: 28 }}>{plan.freeWithAds ? 'Free' : money2(plan.monthlyUsd)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARE_ROWS.map(row => (
                            <tr key={row.id}>
                                <td>
                                    {row.label}
                                    {onOpenTech && columns.some(plan => row.cell(plan, desk).locked) && (
                                        <div>
                                            <button type="button" className="edit" onClick={() => {
                                                const cell = columns.map(plan => row.cell(plan, desk)).find(item => item.locked && item.rungId);
                                                if (cell?.rungId) onOpenTech(cell.rungId);
                                            }}>Unlock &gt;</button>
                                        </div>
                                    )}
                                </td>
                                {columns.map(plan => {
                                    const cell = row.cell(plan, desk);
                                    const sel = selectedPlan?.id === plan.id ? 'sel' : '';
                                    if (cell.locked) {
                                        return (
                                            <td key={plan.id} className={sel}>
                                                <span className="offer-lockcell">
                                                    <span aria-hidden="true">🔒</span>
                                                    {onOpenTech && cell.rungId && <button type="button" onClick={() => onOpenTech(cell.rungId!)}>Unlock &gt;</button>}
                                                </span>
                                            </td>
                                        );
                                    }
                                    if (row.id === 'ads') {
                                        const ads = plan.ads || plan.freeWithAds;
                                        return <td key={plan.id} className={sel}>{ads ? <span className="offer-pill p720">Every {plan.adIntervalMin || ad} min</span> : <span className="offer-dash">No ads</span>}</td>;
                                    }
                                    if (row.id === 'picture') {
                                        return <td key={plan.id} className={sel}><span className={`offer-pill ${pictureClass(cell.text)}`}>{cell.text}</span></td>;
                                    }
                                    if (row.id === 'devices') return <td key={plan.id} className={sel}>{devicesFor(cell.text)}</td>;
                                    if (row.id === 'screens') return <td key={plan.id} className={sel}><b>{plan.screens}</b></td>;
                                    if (cell.text === 'Yes' || cell.text === 'On' || cell.text === 'All titles') return <td key={plan.id} className={sel}><span className="offer-check" aria-label={cell.text}>✓</span></td>;
                                    if (cell.text === 'No' || cell.text === 'None') return <td key={plan.id} className={sel}><span className="offer-dash">—</span></td>;
                                    return <td key={plan.id} className={sel}>{row.id === 'colour' || row.id === 'sound' ? <span className="offer-pill">{cell.text}</span> : cell.text}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="offer-foot">Unlocks spend company cash, not personal money.</p>
        </section>
    );

    const deals = (
        <section id="offer-deals" data-testid="offer-deals">
            <div className="offer-kicker">Breaks, store and deals</div>
            <div className="offer-deals" style={{ marginTop: 8 }}>
                <article className="offer-deal">
                    <div className="offer-kicker">Ad breaks</div>
                    <h3 className="offer-h">Every {ad} min</h3>
                    <p className="offer-note">{adMinutes(ad)} ad minutes an hour on {joinNames(adPlans.map(plan => plan.name))}.</p>
                    <div className="offer-segs">
                        {BREAKS.map(minutes => (
                            <button key={minutes} type="button" className={ad === minutes ? 'on' : ''} disabled={frozen} onClick={() => write(setAdBreak(state, minutes))}>{minutes} min</button>
                        ))}
                    </div>
                    <div className="offer-meter">
                        <span>Ad money</span>
                        <div className="offer-bar"><i style={{ width: `${Math.max(8, Math.round(bars.money * 100))}%` }} /></div>
                    </div>
                    <div className="offer-meter">
                        <span>Viewers put off</span>
                        <div className="offer-bar bad"><i style={{ width: `${Math.max(8, Math.round(bars.putOff * 100))}%` }} /></div>
                    </div>
                    <p className="offer-note">{adIntervalLine(ad)}</p>
                    <div className="offer-week">
                        <div>
                            <div className="offer-kicker">This week on ad plans</div>
                            <b className="good" data-testid="pricing-forecast">{formatCompact(adShown)}</b>
                        </div>
                        <div>
                            <div className="offer-kicker">Viewers put off</div>
                            <b className="bad">-{viewersPutOffPct(ad)}%</b>
                        </div>
                    </div>
                </article>
                <article className="offer-deal">
                    <div className="offer-kicker">Billing periods</div>
                    <p className="offer-note">1 month is the base price. Discounts on the longer plans.</p>
                    <BillRow label="1 month" hint="no discount" value={money2(prices.month)} />
                    <BillRow label="3 months" hint="quarter discount" value={money2(prices.quarter)} stepper={<Stepper value={billing?.quarterPct || 0} max={40} disabled={frozen} onChange={value => stepBill({ quarterPct: value })} />} />
                    <BillRow label="6 months" hint="half-year discount" value={money2(prices.half)} stepper={<Stepper value={billing?.halfPct || 0} max={40} disabled={frozen} onChange={value => stepBill({ halfPct: value })} />} />
                    <BillRow label="1 year" hint="yearly discount" value={money2(prices.year)} stepper={<Stepper value={billing?.yearPct || 0} max={50} disabled={frozen} onChange={value => stepBill({ yearPct: value })} />} />
                    <BillRow label="First-months promo" hint={billing?.promoMonths ? `Off the first ${billing.promoMonths} month${billing.promoMonths === 1 ? '' : 's'}, on any paid plan` : 'No intro offer yet'} value={money2((priced?.monthlyUsd || 0) * (1 - (billing?.promoPct || 0) / 100))} stepper={
                        <span style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                            <Stepper value={billing?.promoMonths || 0} max={3} step={1} suffix=" mo" disabled={frozen} onChange={value => stepBill({ promoMonths: value })} />
                            <Stepper value={billing?.promoPct || 0} max={90} disabled={frozen} onChange={value => stepBill({ promoPct: value })} />
                        </span>
                    } />
                    <p className="offer-note" style={{ marginTop: 8 }}>{Math.round(billing?.yearlyShare || 0)}% pay yearly</p>
                    {priced && <p className="offer-note"><b style={{ color: '#E4B15A' }}>{priced.name} · {money2(prices.year)} a month on a year</b></p>}
                </article>
            </div>
            <div className="offer-spotrow" style={{ marginTop: 12 }}>
                <button type="button" className="offer-btn pri block" disabled={frozen} onClick={() => {
                    setControlsOn(true);
                    document.getElementById('offer-membership')?.scrollIntoView({ block: 'start' });
                }}>Set pricing →</button>
                <article className="offer-spot">
                    <div className="offer-kicker">Spotlight front page · {state.name || 'Empire+'} ident</div>
                    <BrandLockup brand={brandFrom(state.brand)} name={state.name || 'Empire+'} size="md" />
                    <p className="offer-note">Both live in the brand studio, with the logo, colour and type.</p>
                    {onStudio && <button type="button" className="offer-links edit" onClick={onStudio}>Brand studio &gt;</button>}
                </article>
                <article className="offer-spot" style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <BrandLockup brand={brandFrom(state.brand)} name={state.name || 'Empire+'} size="sm" />
                </article>
            </div>
        </section>
    );

    const extras = (
        <section>
            <div className="offer-extra">
                <article className="offer-pass">
                    <div className="offer-kicker">Ad-free passes</div>
                    <div className="offer-pass-row">
                        <div className="offer-ico" style={{ background: '#2a3148', color: '#E4B15A' }}><Hourglass /></div>
                        <Toggle label="1 hour" on={(state.passes?.hourUsd || 0) > 0} disabled={frozen} onClick={() => setPasses((state.passes?.hourUsd || 0) > 0 ? 0 : 1.99, state.passes?.dayUsd || 0)} />
                    </div>
                    <div className="offer-pass-row">
                        <div className="offer-ico" style={{ background: '#2a3148', color: '#7aa2ff' }}><Ticket /></div>
                        <Toggle label="1 day" on={(state.passes?.dayUsd || 0) > 0} disabled={frozen} onClick={() => setPasses(state.passes?.hourUsd || 0, (state.passes?.dayUsd || 0) > 0 ? 0 : 4.99)} />
                    </div>
                    {(state.passes?.hourUsd || 0) > 0 && (
                        <label className="offer-field">Hour pass USD
                            <input className="offer-input" disabled={frozen} type="number" min={MIN_PLAN_USD} max={20} step="0.01" value={state.passes?.hourUsd} onChange={event => setPasses(clampPaidUsd(Math.min(20, Number(event.target.value) || MIN_PLAN_USD)), state.passes?.dayUsd || 0)} />
                        </label>
                    )}
                    {(state.passes?.dayUsd || 0) > 0 && (
                        <label className="offer-field">Day pass USD
                            <input className="offer-input" disabled={frozen} type="number" min={MIN_PLAN_USD} max={30} step="0.01" value={state.passes?.dayUsd} onChange={event => setPasses(state.passes?.hourUsd || 0, clampPaidUsd(Math.min(30, Number(event.target.value) || MIN_PLAN_USD)))} />
                        </label>
                    )}
                    <p className="offer-note">A viewer can pay once to skip ads for an hour, or until tomorrow. Pass money is added to the weekly receipt, not a second subscription.</p>
                </article>
                <article className="offer-pass">
                    <div className="offer-kicker">Rent and buy prices</div>
                    {rentOn && (
                        <>
                            <label className="offer-field">Rent USD
                                <input className="offer-input" disabled={frozen} type="number" min={MIN_PLAN_USD} max={40} step="0.01" value={state.titleStore?.rentUsd || 0} onChange={event => setStore(clampPaidUsd(Math.min(40, Number(event.target.value) || MIN_PLAN_USD)), state.titleStore?.buyUsd || 0)} />
                            </label>
                            <label className="offer-field">Buy USD
                                <input className="offer-input" disabled={frozen} type="number" min={MIN_PLAN_USD} max={80} step="0.01" value={state.titleStore?.buyUsd || 0} onChange={event => setStore(state.titleStore?.rentUsd || 0, clampPaidUsd(Math.min(80, Number(event.target.value) || MIN_PLAN_USD)))} />
                            </label>
                        </>
                    )}
                    {!rentOn && <p className="offer-note">Turn rent or buy on to price a few days with a title, or a copy they keep.</p>}
                    <p className="offer-note">Rentals are a few days with a title. Buys keep it. Both need a title already on the shelf, and both sit on the same weekly receipt.</p>
                </article>
            </div>
            {priced && !priced.freeWithAds && (
                <div style={{ marginTop: 12 }}>
                    <div className="offer-kicker">Local price · {priced.name}</div>
                    <p className="offer-note">Each market keeps its own currency. The USD figure is what the ledger books.</p>
                    {state.selectedCountryIds.length === 0 && <p className="offer-note">Pick countries on the Markets step. India and the UK are the ones to set first.</p>}
                    <div className="offer-locals" style={{ marginTop: 8 }}>
                        {state.selectedCountryIds.map(countryId => {
                            const country = getCountry(countryId);
                            const money = currencyFor(countryId, state.fxRates);
                            const local = localMonthly(priced, countryId, state.fxRates);
                            const usd = usdFromLocal(local, countryId, state.fxRates);
                            return (
                                <label key={countryId} className="offer-flag">
                                    <span className="flag">{country?.flag || '🏳️'}</span>
                                    <span>{country?.name || countryId}</span>
                                    <span className="offer-kicker">{money.code}</span>
                                    <input
                                        className="offer-input"
                                        disabled={frozen}
                                        type="number"
                                        min={0}
                                        value={local}
                                        onChange={event => {
                                            const nextLocal = Number(event.target.value);
                                            if (!Number.isFinite(nextLocal) || nextLocal < 0) return;
                                            write({
                                                ...state,
                                                plans: state.plans.map(row => row.id === priced.id ? {
                                                    ...row,
                                                    monthlyUsd: countryId === 'US' ? clampPaidUsd(nextLocal || MIN_PLAN_USD) : row.monthlyUsd,
                                                    countryPrices: { ...(row.countryPrices || {}), [countryId]: nextLocal },
                                                } : row),
                                            });
                                        }}
                                    />
                                    <span className="offer-blurb">{formatLocalAmount(local, money.code)} · ${usd.toFixed(2)} USD</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );

    return (
        <div className="offer-board" data-testid={draft ? 'pricing-desk' : 'offer-board'} data-stage={frozen ? 'pre' : 'live'}>
            {error && <p className="offer-error">{error}</p>}
            {draft && !frozen && (
                <div className="offer-forecast">
                    <div>
                        <div className="offer-kicker">Expected subscribers</div>
                        <b>{formatPeople(homesShown)}</b>
                    </div>
                    <div>
                        <div className="offer-kicker">Expected revenue this week</div>
                        <b data-testid="pricing-delta">{formatCompact(revShown)}</b>
                    </div>
                </div>
            )}
            {lead === 'deals' ? deals : null}
            {membership}
            {lead === 'deals' ? null : deals}
            {extras}
            {removeId && outlook && (
                <div className="offer-sheet" role="dialog" aria-modal="true" data-testid="remove-sheet">
                    <div className="panel">
                        <div className="offer-kicker">Remove plan</div>
                        <h3 className="offer-h">Remove {state.plans.find(plan => plan.id === removeId)?.name}?</h3>
                        <p className="offer-note">{outlook.total.toLocaleString('en-US')} people are on this plan today.</p>
                        <div className="offer-split">
                            <div className="offer-moved">
                                <div className="offer-kicker">Moved</div>
                                <b>{outlook.moved.toLocaleString('en-US')}</b>
                                <span>{outlook.destinationName ? `can move to ${outlook.destinationName}` : 'No plan is left to catch them'}</span>
                                {outlook.destinationName && <div className="offer-blurb">{money2(outlook.destinationPrice)}</div>}
                            </div>
                            <div className="offer-cancel">
                                <div className="offer-kicker">May cancel</div>
                                <b>{outlook.cancel.toLocaleString('en-US')}</b>
                                <span>may cancel and leave</span>
                            </div>
                        </div>
                        <p className="offer-note">Removing a plan does not spend company cash. You can still turn it back on later if you switch it off.</p>
                        <div className="offer-sheet-actions" style={{ marginTop: 12 }}>
                            <button type="button" className="offer-btn" onClick={() => setRemoveId(null)}>Keep plan</button>
                            <button type="button" className="offer-btn danger" onClick={() => {
                                const result = applyRemoval(state, removeId, draft);
                                if (result.error) {
                                    setError(result.error);
                                    return;
                                }
                                setError('');
                                onCommit(result.state);
                                setRemoveId(null);
                            }}>Remove plan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BillRow: React.FC<{ label: string; hint: string; value: string; stepper?: React.ReactNode }> = ({ label, hint, value, stepper }) => (
    <div className="offer-bill-row">
        <div>
            <b>{label}</b>
            <div className="offer-blurb">{hint}</div>
        </div>
        {stepper || <span />}
        <b>{value}</b>
    </div>
);

const Stepper: React.FC<{ value: number; max: number; step?: number; suffix?: string; disabled?: boolean; onChange: (value: number) => void }> = ({ value, max, step = 5, suffix = '%', disabled, onChange }) => (
    <span className="offer-step">
        <button type="button" aria-label="Decrease" disabled={disabled} onClick={() => onChange(Math.max(0, value - step))}>−</button>
        <b>{suffix === '%' ? (value ? `-${value}%` : '0%') : `${value}${suffix}`}</b>
        <button type="button" aria-label="Increase" disabled={disabled} onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </span>
);
