import React, { useState } from 'react';
import { MembershipTier, Player, PricingPlan } from '../../../types';
import { adBreakBars } from '../../../services/ownPlatform/commercial';
import { formatCompact, quoteLaunch } from '../../../services/ownPlatform/logic';
import {
    COMPARE_ROWS,
    PLAN_TEMPLATES,
    addPlan,
    effectiveMonthly,
    inferTier,
    moneyShort,
    planSubscribers,
    readDesk,
    removePlan,
    setAdBreak,
    setBillingField,
    setPlanPrice,
    togglePlan,
} from '../../../services/ownPlatform/platformDesk';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    onStudio?: () => void;
    onOpenTech: (rungId: string) => void;
    editing?: boolean;
    lead?: 'deals' | 'plans';
}

const TIERS: MembershipTier[] = ['FREE_ADS', 'BASIC_ADS', 'STANDARD', 'PREMIUM', 'RENT_BUY', 'CUSTOM'];

export const OfferTab: React.FC<Props> = ({ player, onPlayer, onStudio, onOpenTech, editing, lead }) => {
    const state = player.ownPlatform!;
    const live = state.stage === 'LIVE';
    const [open, setOpen] = useState(Boolean(editing && live));
    const [error, setError] = useState('');
    const [removeId, setRemoveId] = useState<string | null>(null);
    const [moveTo, setMoveTo] = useState('cancel');
    const desk = readDesk(state);
    const billing = desk.billing;
    const quote = quoteLaunch(player);
    const split = planSubscribers(state);
    const ad = billing?.adBreakMin || state.plans.find(plan => plan.adIntervalMin)?.adIntervalMin || 15;
    const bars = ad === 5 || ad === 10 || ad === 15 || ad === 20 || ad === 30 ? adBreakBars(ad) : adBreakBars(15);
    const yearly = billing?.yearlyShare || 0;

    const commit = (next: { state: typeof state; error?: string } | typeof state) => {
        if ('error' in next || 'state' in next) {
            const wrapped = next as { state: typeof state; error?: string };
            setError(wrapped.error || '');
            if (!wrapped.error) onPlayer({ ...player, ownPlatform: wrapped.state });
            return;
        }
        setError('');
        onPlayer({ ...player, ownPlatform: next });
    };

    const deals = (
        <div data-testid="offer-deals" className="plat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))' }}>
            <article className="plat-panel">
                <div className="plat-kicker">Ad breaks</div>
                <h3>How often the reel cuts in</h3>
                <div className="plat-actions">
                    {([5, 10, 15, 20] as const).map(minutes => (
                        <button key={minutes} type="button" className={`plat-btn${ad === minutes ? ' pri' : ''}`} disabled={!live} onClick={() => commit(setAdBreak(state, minutes))}>{minutes} min</button>
                    ))}
                </div>
                <p className="plat-kicker" style={{ marginTop: 8 }}>Ad money</p>
                <div className="bar gold"><i style={{ width: `${Math.round(bars.money * 100)}%` }} /></div>
                <p className="plat-kicker">Viewers put off</p>
                <div className="bar"><i style={{ width: `${Math.round(bars.putOff * 100)}%` }} /></div>
            </article>
            <article className="plat-panel">
                <div className="plat-kicker">Billing periods</div>
                <Stepper label="3 months" value={billing?.quarterPct || 0} onChange={value => commit(setBillingField(state, { quarterPct: value }))} disabled={!live} />
                <Stepper label="6 months" value={billing?.halfPct || 0} onChange={value => commit(setBillingField(state, { halfPct: value }))} disabled={!live} />
                <Stepper label="1 year" value={billing?.yearPct || 0} onChange={value => commit(setBillingField(state, { yearPct: value }))} disabled={!live} />
                <Stepper label="First months" value={billing?.promoMonths || 0} max={3} suffix=" mo" onChange={value => commit(setBillingField(state, { promoMonths: value }))} disabled={!live} />
                <Stepper label="Promo off" value={billing?.promoPct || 0} max={90} onChange={value => commit(setBillingField(state, { promoPct: value }))} disabled={!live} />
                <p style={{ marginTop: 8 }}>1 month stays the base price. {yearly}% are paying yearly.</p>
                <p className="plat-kicker">Forecast {formatCompact(quote.forecastWeeklyRevenue)} / week · ads {formatCompact(state.platformDesk?.lastAdRevenue || quote.revenueParts.ads)} · subs {formatCompact(state.platformDesk?.lastSubRevenue || quote.revenueParts.subscriptions)}</p>
            </article>
        </div>
    );

    const plans = (
        <div data-testid="offer-plans">
            <div className="plat-cards">
                {state.plans.map(plan => (
                    <PlanCard
                        key={plan.id}
                        plan={plan}
                        subs={split[plan.id] || 0}
                        live={live}
                        editing={open}
                        billing={billing}
                        onToggle={on => { const result = togglePlan(state, plan.id, on); commit(result); }}
                        onPrice={price => commit(setPlanPrice(state, plan.id, price))}
                        onRemove={() => { setRemoveId(plan.id); setMoveTo(state.plans.find(row => row.id !== plan.id)?.id || 'cancel'); }}
                    />
                ))}
                <article className="plat-panel">
                    <div className="plat-kicker">Rent or buy</div>
                    <h3>{state.titleStore ? 'On the shelf' : 'Closed'}</h3>
                    <div className="plat-price">{state.titleStore ? moneyShort(state.titleStore.rentUsd) : '$0'}</div>
                    <p className="plat-kicker">{state.titleStore ? `Buy ${moneyShort(state.titleStore.buyUsd)}` : 'Add it after launch'}</p>
                    {!live && <div className="plat-lock">Locked until launch</div>}
                </article>
            </div>
            <div className="plat-actions">
                {live && <button type="button" className="plat-btn pri" data-testid="change-plans" onClick={() => setOpen(value => !value)}>{open ? 'Close the slate' : 'Change plans'}</button>}
                {!live && <div className="plat-lock">Locked until launch</div>}
                <button type="button" className="plat-btn gold" disabled={!live} onClick={() => { setOpen(true); document.getElementById('offer-deals')?.scrollIntoView({ block: 'start' }); }}>Set pricing</button>
            </div>
            {open && live && (
                <div className="plat-actions">
                    {TIERS.map(tier => (
                        <button key={tier} type="button" className="plat-btn" onClick={() => {
                            if (tier === 'CUSTOM') {
                                const name = 'Night owl';
                                commit(addPlan(state, 'CUSTOM', { name, monthlyUsd: 8.99 }));
                                return;
                            }
                            commit(addPlan(state, tier));
                        }}>+ {PLAN_TEMPLATES.find(row => row.tier === tier)?.name || 'Rent or buy'}</button>
                    ))}
                </div>
            )}
            <div className="cmp-desk table-wrap" data-testid="compare-table">
                <table className="cmp">
                    <thead>
                        <tr>
                            <th>Perk</th>
                            {state.plans.map(plan => <th key={plan.id}>{plan.name}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {COMPARE_ROWS.map(row => (
                            <tr key={row.id}>
                                <td>{row.label}</td>
                                {state.plans.map(plan => {
                                    const cell = row.cell(plan, desk);
                                    return (
                                        <td key={plan.id}>
                                            {cell.locked ? (
                                                <button type="button" className="unlock-chip" onClick={() => cell.rungId && onOpenTech(cell.rungId)}>Lock · Unlock</button>
                                            ) : cell.text}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="phone-plans">
                {state.plans.map(plan => (
                    <article key={plan.id} className="plat-panel">
                        <h3>{plan.name}</h3>
                        {COMPARE_ROWS.map(row => {
                            const cell = row.cell(plan, desk);
                            return (
                                <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderTop: '1px solid #262c40' }}>
                                    <span>{row.label}</span>
                                    {cell.locked ? <button type="button" className="unlock-chip" onClick={() => cell.rungId && onOpenTech(cell.rungId)}>Unlock</button> : <b>{cell.text}</b>}
                                </div>
                            );
                        })}
                    </article>
                ))}
            </div>
        </div>
    );

    return (
        <div data-testid="offer-tab" className="plat-body" style={{ marginTop: 0 }}>
            {error && <p className="err">{error}</p>}
            {lead === 'deals' ? <>{deals}{plans}</> : <>{plans}{deals}</>}
            <article className="plat-panel" data-testid="brand-studio-card">
                <div className="plat-kicker">Brand studio</div>
                <h3>The mark, the colour, the voice</h3>
                <p style={{ color: '#c5cbe0' }}>The highlight on these cards is the colour you sealed. Rebranding spends company cash.</p>
                <button type="button" className="plat-btn pri" onClick={onStudio}>Open brand studio</button>
            </article>
            {removeId && (
                <div className="sheet" role="dialog" aria-modal="true">
                    <div className="panel">
                        <div className="plat-kicker">Remove plan</div>
                        <h3>{state.plans.find(plan => plan.id === removeId)?.name}</h3>
                        <p>{(split[removeId] || 0).toLocaleString('en-US')} subscribers have to go somewhere.</p>
                        <label className="plat-kicker">Move them
                            <select value={moveTo} onChange={event => setMoveTo(event.target.value)} style={{ display: 'block', marginTop: 6, width: '100%', background: '#0c0f18', color: '#fff', borderRadius: 10, padding: 8 }}>
                                {state.plans.filter(plan => plan.id !== removeId).map(plan => <option key={plan.id} value={plan.id}>Move to {plan.name}</option>)}
                                <option value="cancel">Cancel their subscriptions</option>
                            </select>
                        </label>
                        <div className="plat-actions">
                            <button type="button" className="plat-btn" onClick={() => setRemoveId(null)}>Keep it</button>
                            <button type="button" className="plat-btn gold" onClick={() => {
                                commit(removePlan(state, removeId, moveTo === 'cancel' ? 'cancel' : moveTo));
                                setRemoveId(null);
                            }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PlanCard: React.FC<{
    plan: PricingPlan;
    subs: number;
    live: boolean;
    editing: boolean;
    billing: ReturnType<typeof readDesk>['billing'];
    onToggle: (on: boolean) => void;
    onPrice: (price: number) => void;
    onRemove: () => void;
}> = ({ plan, subs, live, editing, billing, onToggle, onPrice, onRemove }) => {
    const prices = effectiveMonthly(plan.monthlyUsd, billing);
    return (
        <article className="plat-panel">
            <div className="plat-kicker">{inferTier(plan).replace('_', ' ')}</div>
            <h3>{plan.name}</h3>
            <div className="plat-price">{plan.freeWithAds ? 'Free' : `$${plan.monthlyUsd.toFixed(2)}`}</div>
            <p className="plat-kicker">{subs.toLocaleString('en-US')} subscribers · effective {moneyShort(prices.blend)} / month</p>
            {!live && <div className="plat-lock">Locked until launch</div>}
            {editing && live && (
                <div className="plat-actions">
                    <button type="button" className={`tog${plan.enabled === false ? '' : ' on'}`} aria-label={`${plan.name} on`} onClick={() => onToggle(plan.enabled === false)}><i /></button>
                    {!plan.freeWithAds && (
                        <input className="plat-btn" style={{ width: 88 }} type="number" min={0.99} max={100} step={0.5} defaultValue={plan.monthlyUsd} onBlur={event => onPrice(Number(event.target.value))} />
                    )}
                    <button type="button" className="plat-btn" onClick={onRemove}>Remove</button>
                </div>
            )}
        </article>
    );
};

const Stepper: React.FC<{ label: string; value: number; max?: number; suffix?: string; disabled?: boolean; onChange: (value: number) => void }> = ({ label, value, max = 40, suffix = '%', disabled, onChange }) => (
    <div className="stepper" style={{ marginTop: 8 }}>
        <span style={{ flex: 1 }}>{label}</span>
        <button type="button" disabled={disabled} onClick={() => onChange(Math.max(0, value - (max > 20 ? 5 : 1)))}>−</button>
        <b>{value}{suffix}</b>
        <button type="button" disabled={disabled} onClick={() => onChange(Math.min(max, value + (max > 20 ? 5 : 1)))}>+</button>
    </div>
);
