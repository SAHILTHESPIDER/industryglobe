import React, { useEffect, useMemo, useState } from 'react';
import { PendingRightsDeal, Player, StandingOfferTerms } from '../../types';
import { CAMPAIGN_CHANNELS, FESTIVALS } from '../../services/ownPlatform/catalog';
import {
    PRACTICE_LOT,
    RightsLot,
    buildStandingOffers,
    channelCost,
    emptyReleasePlan,
    forecastRelease,
    formatCompact,
    listRightsLots,
    lockRightsDeal,
    rivalWeekends,
} from '../../services/ownPlatform/logic';
import { updateReleaseSlot } from '../../services/ownPlatform/studio';
import { releaseWeekLabel } from '../../services/ownPlatform/weeks';
import { ReleaseCalendar } from './ReleaseCalendar';
import { Card, headingFont } from './ui';
import { publicBrandName } from '../../services/rights/alterName';
import { shelveOwnFilm } from '../../services/ownPlatform/streamRights';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

export const DealRoom: React.FC<Props> = ({ player, onPlayer }) => {
    const lots = listRightsLots(player);
    const [lotId, setLotId] = useState<string>(lots[0] ? lotKey(lots[0]) : 'practice');
    const [open, setOpen] = useState(false);
    const [tick, setTick] = useState(0);
    const [choice, setChoice] = useState<'THEATRICAL' | 'STREAMING' | null>(null);
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const lot = lotId === 'practice' ? PRACTICE_LOT : lots.find(item => lotKey(item) === lotId) || PRACTICE_LOT;
    const offers = useMemo(() => (open ? buildStandingOffers(lot, tick) : []), [open, lot, tick]);
    const pending = player.ownPlatform?.pendingDeal || null;

    useEffect(() => {
        if (!open || pending) return;
        if (tick >= 45) return;
        const timer = window.setTimeout(() => setTick(value => value + 1), 900);
        return () => window.clearTimeout(timer);
    }, [open, tick, pending]);

    const take = (offer: StandingOfferTerms) => {
        if (!player.ownPlatform) return;
        const plan = emptyReleasePlan();
        plan.forecastUsd = forecastRelease(lot, plan.channels, plan.festivalId, plan.weekendOffset);
        const nextDeal: PendingRightsDeal = {
            releaseId: lot.releaseId,
            title: lot.title,
            genre: lot.genre,
            budget: lot.budget,
            gross: lot.gross,
            simulated: lot.simulated,
            offer,
            plan,
        };
        const withDeal = { ...player, ownPlatform: { ...player.ownPlatform, pendingDeal: nextDeal } };
        onPlayer(updateReleaseSlot(withDeal, { title: lot.title, linkedReleaseId: lot.releaseId || '' }));
        setOpen(false);
    };

    if (pending) {
        return (
            <div className="p-4 lg:p-10 space-y-4">
                <ReleaseCalendar player={player} onPlayer={onPlayer} />
                <ReleasePlanner player={player} deal={pending} onPlayer={onPlayer} onError={setError} error={error} />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-10 space-y-4" data-screen="rights-floor">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">Apni film becho</div>
                    <h2 className="text-4xl lg:text-6xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Your films</h2>
                    <p className="text-sm text-zinc-400 max-w-xl mt-2">Empire+ par lagao puts your film on your own service. The shoot is already paid for, so company cash does not move. Rival ko becho opens the room, and that cheque lands in company cash, not personal cash.</p>
                </div>
            </div>
            <ReleaseCalendar player={player} onPlayer={onPlayer} />
            <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
                <div className="space-y-2">
                    {lots.map(item => (
                        <button key={lotKey(item)} onClick={() => { setLotId(lotKey(item)); setOpen(false); setChoice(null); setTick(0); }} className={`w-full text-left rounded-2xl border px-4 py-3 ${lotKey(item) === lotId ? 'border-[#4F3BFF] bg-[#4F3BFF]/10' : 'border-white/10 bg-[#12151c]'}`}>
                            <div className="font-bold">{item.title}</div>
                            <div className="text-[11px] text-zinc-500">{item.phase} · {item.genre}</div>
                        </button>
                    ))}
                    <button onClick={() => { setLotId('practice'); setOpen(false); setChoice(null); setTick(0); }} className={`w-full text-left rounded-2xl border px-4 py-3 ${lotId === 'practice' ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-[#12151c]'}`}>
                        <div className="font-bold">Oxford Nights</div>
                        <div className="text-[11px] text-amber-200">Practice room · changes nothing</div>
                    </button>
                    {lots.length === 0 && <p className="text-xs text-zinc-500">No film of yours is waiting on a buyer. The practice room shows the floor without paying anyone.</p>}
                </div>
                <div className="space-y-4">
                    {!lot.simulated && (
                        <Card>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#8B7BFF]">Empire+ par lagao</div>
                                    <div className="font-bold">{lot.title}</div>
                                    <p className="text-sm text-zinc-400">Apni film. Banane ka kharcha ho chuka. Company cash nahi hilta.</p>
                                </div>
                                <button
                                    type="button"
                                    data-testid="shelf-own-film"
                                    onClick={() => {
                                        const result = shelveOwnFilm(player, lot);
                                        if (result.error) {
                                            setError(result.error);
                                            setNote('');
                                            return;
                                        }
                                        setError('');
                                        setNote(result.note || `${lot.title} is in the contract vault.`);
                                        onPlayer(result.player);
                                    }}
                                    className="px-4 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider"
                                >
                                    Put it on Empire+
                                </button>
                            </div>
                            {note && <p className="text-sm text-emerald-200 mt-2" data-testid="shelf-note">{note}</p>}
                            {error && !choice && <p className="text-sm text-rose-200 mt-2">{error}</p>}
                        </Card>
                    )}
                    {!choice && (
                        <div className="grid sm:grid-cols-2 gap-3">
                            <button onClick={() => setChoice('THEATRICAL')} className="text-left rounded-3xl border border-amber-200/20 bg-gradient-to-b from-[#2a2418] to-[#12100c] p-5">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">Theatrical</div>
                                <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>Cinemas</div>
                                <p className="text-sm text-zinc-400 mt-2">Traditional run. High risk, high box office. This choice does not start a second gross.</p>
                                <div className="mt-4 text-[11px] uppercase tracking-wider text-amber-100/80">Continue</div>
                            </button>
                            <button onClick={() => setChoice('STREAMING')} className="text-left rounded-3xl border border-sky-300/20 bg-gradient-to-b from-[#142033] to-[#10141c] p-5">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200">Streaming</div>
                                <div className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>The room</div>
                                <p className="text-sm text-zinc-400 mt-2">Guaranteed money up front. Lower prestige, safer cash. Offers are ranked by what they are worth, not the headline cheque.</p>
                                <div className="mt-4 text-[11px] uppercase tracking-wider text-sky-100">Open the room</div>
                            </button>
                        </div>
                    )}
                    {choice === 'THEATRICAL' && (
                        <Card>
                            <h3 className="text-2xl font-black uppercase" style={{ fontFamily: headingFont }}>{lot.title} stays theatrical</h3>
                            <p className="text-sm text-zinc-400 mt-2">Book the screens, the campaign, and the weekend in the production house release flow. Nothing here spends money or changes the gross.</p>
                            <button onClick={() => setChoice(null)} className="mt-4 text-xs uppercase tracking-wider text-zinc-300">Back</button>
                        </Card>
                    )}
                    {choice === 'STREAMING' && !open && (
                        <Card>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Lot on offer · rival ko becho</div>
                            <div className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>{lot.title}</div>
                            <p className="text-sm text-zinc-400">{lot.genre} · budget {formatCompact(lot.budget)} · gross so far {formatCompact(lot.gross)}</p>
                            <p className="text-sm text-zinc-400 mt-3">Offers move for 45 seconds. A bidder may improve, go final, or leave. Then the table hard-closes. Walking out kills every offer. The cheque is company cash. Personal cash does not move. Nothing is saved until you take one.</p>
                            <button onClick={() => { setTick(0); setOpen(true); }} className="mt-4 px-6 py-3 rounded-full bg-sky-200 text-black font-black uppercase tracking-wider text-sm">Open the room</button>
                        </Card>
                    )}
                    {choice === 'STREAMING' && open && (
                        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-3">
                            <Card>
                                <div className="text-[11px] uppercase text-zinc-500">The clock</div>
                                <div className="text-5xl font-black" style={{ fontFamily: headingFont }}>{Math.max(0, 45 - tick)}s</div>
                                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full bg-amber-300" style={{ width: `${Math.min(100, (tick / 45) * 100)}%` }} />
                                </div>
                                <ul className="mt-4 text-xs text-zinc-400 space-y-2">
                                    <li>The room is live for 45 seconds.</li>
                                    <li>Offers revise on their own, then stop.</li>
                                    <li>After the close, what is standing can still be taken.</li>
                                    <li>Walk out and every offer dies with you.</li>
                                </ul>
                                <button onClick={() => { setOpen(false); setTick(0); }} className="mt-4 text-xs uppercase tracking-wider text-zinc-300">Walk out</button>
                            </Card>
                            <div className="space-y-2">
                                <div className="text-sm text-zinc-400">{offers.length} standing · ranked by value, not headline. Best offer {offers[0] ? formatCompact(offers[0].value) : '—'}</div>
                                {offers.map((offer, index) => (
                                    <div key={offer.bidderId} className="rounded-2xl border border-white/10 bg-[#141820] p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="w-8 font-black text-zinc-500">{index + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold" style={{ color: offer.color }}>{publicBrandName(offer.bidderName)}</div>
                                            <div className="text-[11px] text-zinc-400">{formatCompact(offer.guarantee)} certain · {offer.backendPct}% net {offer.recoupment ? 'after recoupment' : 'from first dollar'} · {offer.years} years · {offer.windowLabel}</div>
                                            <div className="text-[11px] text-zinc-500">{offer.localization ? 'Localisation included' : 'No localisation'} · {offer.renewal ? 'Renewal option' : 'No renewal'} · cap {offer.cap ? formatCompact(offer.cap) : 'none'} · funding {formatCompact(offer.funding)}</div>
                                            <div className="text-[11px] text-zinc-300 mt-1">{offer.note} Real value {formatCompact(offer.value)}.</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black">{formatCompact(offer.guarantee)}</div>
                                            <button onClick={() => take(offer)} className="mt-1 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider text-white" style={{ background: offer.color }}>Take</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ReleasePlanner: React.FC<{ player: Player; deal: PendingRightsDeal; onPlayer: (next: Player) => void; error: string; onError: (message: string) => void }> = ({ player, deal, onPlayer, error, onError }) => {
    const [page, setPage] = useState(0);
    const weekends = rivalWeekends(player, { ...deal, simulated: deal.simulated, phase: 'DEAL', releaseId: deal.releaseId });
    const openLabel = releaseWeekLabel(player.currentWeek, player.ownPlatform?.releaseSlot?.weekOffset ?? deal.plan.weekendOffset);
    const savePlan = (recipe: (plan: PendingRightsDeal['plan']) => PendingRightsDeal['plan']) => {
        if (!player.ownPlatform) return;
        const plan = recipe(deal.plan);
        plan.forecastUsd = forecastRelease({ ...deal, phase: deal.phase || 'DEAL' }, plan.channels, plan.festivalId, plan.weekendOffset);
        onPlayer({ ...player, ownPlatform: { ...player.ownPlatform, pendingDeal: { ...deal, plan } } });
    };
    const chooseWeekend = (offset: number) => {
        const moved = updateReleaseSlot(player, { weekOffset: offset, title: deal.title });
        const pending = moved.ownPlatform?.pendingDeal;
        if (!pending) {
            onPlayer(moved);
            return;
        }
        const plan = {
            ...pending.plan,
            weekendOffset: offset,
            forecastUsd: forecastRelease({ ...deal, phase: deal.phase || 'DEAL' }, pending.plan.channels, pending.plan.festivalId, offset),
        };
        onPlayer({ ...moved, ownPlatform: { ...moved.ownPlatform!, pendingDeal: { ...pending, plan } } });
    };
    const lock = () => {
        const result = lockRightsDeal(player);
        if (result.error) {
            onError(result.error);
            return;
        }
        onError('');
        onPlayer(result.player);
    };
    const drop = () => {
        if (!player.ownPlatform) return;
        onPlayer({ ...player, ownPlatform: { ...player.ownPlatform, pendingDeal: null } });
    };
    return (
        <div className="p-4 lg:p-10 space-y-4" data-screen="release-plan">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8B7BFF]">After the handshake</div>
            <h2 className="text-4xl font-black uppercase" style={{ fontFamily: headingFont }}>{deal.title} · {publicBrandName(deal.offer.bidderName)}</h2>
            {deal.simulated && <p className="text-amber-200 text-sm">Practice lot. You can walk the plan. Locking will not pay anyone.</p>}
            <div className="flex gap-2 text-xs uppercase tracking-wider">
                {['Campaign', 'Festival', 'Weekend', 'Review'].map((label, index) => (
                    <button key={label} onClick={() => setPage(index)} className={`px-3 py-1 rounded-full ${page === index ? 'bg-white text-black' : 'bg-white/10'}`}>{label}</button>
                ))}
            </div>
            {page === 0 && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {CAMPAIGN_CHANNELS.map(channel => {
                        const on = deal.plan.channels.includes(channel.id);
                        return (
                            <Card key={channel.id} active={on} onClick={() => savePlan(plan => {
                                const channels = on ? plan.channels.filter(id => id !== channel.id) : [...plan.channels, channel.id];
                                const spend = channels.reduce((sum, id) => sum + channelCost(id), 0);
                                return { ...plan, channels, spend };
                            })}>
                                <div className="font-bold">{channel.name}</div>
                                <p className="text-xs text-zinc-400">{channel.blurb}</p>
                                <div className="text-sm mt-2">{formatCompact(channelCost(channel.id))}</div>
                            </Card>
                        );
                    })}
                </div>
            )}
            {page === 1 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FESTIVALS.map(festival => (
                        <Card key={festival.id} active={deal.plan.festivalId === festival.id} onClick={() => savePlan(plan => ({ ...plan, festivalId: festival.id }))}>
                            <div className="font-black text-xl uppercase" style={{ fontFamily: headingFont }}>{festival.name}</div>
                            <div className="text-xs text-zinc-500">{festival.city}</div>
                            <p className="text-sm text-zinc-400 mt-2">{festival.note}</p>
                        </Card>
                    ))}
                </div>
            )}
            {page === 2 && (
                <div className="space-y-3">
                    <p className="text-sm text-zinc-400">The film opens {openLabel}. These cards are the crowded nearby weekends. Any other week is on the calendar, and the locked deal waits for whichever week you choose.</p>
                    <div className="grid lg:grid-cols-3 gap-3">
                        {weekends.map(weekend => (
                            <Card key={weekend.id} active={(player.ownPlatform?.releaseSlot?.weekOffset ?? deal.plan.weekendOffset) === weekend.offset} onClick={() => chooseWeekend(weekend.offset)}>
                                <div className="text-[11px] uppercase text-zinc-500">{releaseWeekLabel(player.currentWeek, weekend.offset)}</div>
                                <div className="font-bold text-lg">{weekend.title}</div>
                                <div className="text-sm text-zinc-400">{weekend.studio} · heat {Math.round(weekend.heat)}</div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            {page === 3 && (
                <Card>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div>Guarantee <b>{formatCompact(deal.offer.guarantee)}</b></div>
                        <div>Backend <b>{deal.offer.backendPct}%</b></div>
                        <div>Campaign <b>{formatCompact(deal.plan.spend)}</b></div>
                        <div>Funding <b>{formatCompact(deal.offer.funding)}</b></div>
                        <div>Net to company cash <b>{formatCompact(deal.offer.guarantee + deal.offer.funding - deal.plan.spend)}</b></div>
                        <div>Forecast <b>{formatCompact(deal.plan.forecastUsd)}</b></div>
                        <div>Rank value <b>{formatCompact(deal.offer.value)}</b></div>
                        <div>Window <b>{deal.offer.windowLabel}</b></div>
                        <div>Views begin <b>{openLabel}</b></div>
                    </div>
                    <p className="text-sm text-zinc-400 mt-3">Nothing is earned before {openLabel}. The net lands in company cash. Personal cash does not move. Moving the calendar moves this date, before or after the lock.</p>
                    {error && <p className="text-rose-300 mt-3">{error}</p>}
                    <div className="flex gap-2 mt-4">
                        <button onClick={lock} className="px-5 py-3 rounded-full bg-[#4F3BFF] font-black uppercase tracking-wider text-xs">Lock the strategy</button>
                        <button onClick={drop} className="px-5 py-3 rounded-full border border-white/15 text-xs uppercase tracking-wider">Walk away</button>
                    </div>
                </Card>
            )}
        </div>
    );
};

const lotKey = (lot: RightsLot) => `${lot.releaseId || 'past'}:${lot.title}`;
