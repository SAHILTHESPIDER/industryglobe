import React, { useState } from 'react';
import { PendingEvent, Player, FestivalBiddingState, FestivalBidOffer } from '../types';
import { acceptFestivalBid, counterFestivalBids, persistFestivalBidding, walkFestivalBid } from '../services/releaseGauntlet';

interface FestivalNightModalProps {
    player: Player;
    event: PendingEvent;
    onComplete: (player: Player) => void;
    onUpdate: (updater: (player: Player) => Player) => void;
}

const money = (value: number) => {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
    return `$${Math.round(value).toLocaleString()}`;
};

export const FestivalNightModal: React.FC<FestivalNightModalProps> = ({ player, event, onComplete, onUpdate }) => {
    const data = event.data || {};
    const projectId = String(data.projectId || '');
    const projectName = String(data.projectName || 'The film');
    const festivalName = String(data.festivalName || event.title);
    const reaction = Number(data.reaction || 0);
    const prize = data.prize ? String(data.prize) : '';
    const [bidding, setBidding] = useState<FestivalBiddingState | null>(data.bidding || null);
    const [error, setError] = useState('');

    const finish = (next: Player) => onComplete(next);

    const accept = (offer: FestivalBidOffer) => {
        if (!bidding) return;
        const result = acceptFestivalBid(player, projectId, offer, bidding);
        if (result.error) {
            setError(result.error);
            return;
        }
        finish(result.player);
    };

    const counter = () => {
        if (!bidding) return;
        const next = counterFestivalBids(bidding);
        setBidding(next);
        onUpdate(current => persistFestivalBidding(current, projectId, next));
        if (next.status === 'WALKED') setError(next.note || 'The buyers left.');
    };

    const walk = () => {
        finish(walkFestivalBid(player, projectId, bidding || {
            round: 1,
            maxRounds: 3,
            heat: 0,
            offers: [],
            status: 'WALKED',
        }));
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" data-testid="festival-night">
            <div className="w-full max-w-3xl rounded-[28px] border border-amber-500/30 bg-[#140e09] text-white shadow-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-300 via-rose-400 to-amber-200" />
                <div className="p-6 sm:p-8 space-y-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">{festivalName}</div>
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <h2 className="text-3xl sm:text-5xl font-serif font-light leading-none">{projectName}</h2>
                            <p className="mt-3 text-sm text-zinc-400">Premiere reaction from the room.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-5xl font-black text-amber-200" data-testid="festival-reaction">{reaction}</div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Reaction</div>
                        </div>
                    </div>

                    {prize && (
                        <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 px-4 py-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Prize</div>
                            <div className="text-xl font-serif">{prize}</div>
                            <p className="text-xs text-amber-100/70 mt-1">Worth +5 when the Oscars and BAFTA score this season.</p>
                        </div>
                    )}

                    {!bidding && (
                        <button onClick={() => finish(player)} className="w-full rounded-full bg-white text-black font-black uppercase tracking-[0.18em] text-xs py-4">
                            Back to the slate
                        </button>
                    )}

                    {bidding && (
                        <div data-testid="festival-bidding-room" className="space-y-4">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Bidding room</div>
                                    <h3 className="text-2xl font-serif">Round {Math.min(bidding.round, bidding.maxRounds)} of {bidding.maxRounds}</h3>
                                </div>
                                <div className="text-right text-xs text-zinc-400">
                                    Festival heat {bidding.heat.toFixed(2)}
                                    <div>{bidding.offers.length} still in</div>
                                </div>
                            </div>
                            {bidding.note && <p className="text-sm text-amber-100/80">{bidding.note}</p>}
                            {error && <p className="text-sm text-rose-300">{error}</p>}
                            {bidding.status === 'OPEN' && bidding.offers.map(offer => (
                                <div key={offer.id} className="rounded-2xl border border-white/10 bg-black/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex-1">
                                        <div className="font-bold">{offer.bidderName}</div>
                                        <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{offer.kind === 'STREAMER' ? 'Streamer' : 'Studio'} · {offer.backendPct}% backend</div>
                                    </div>
                                    <div className="text-2xl font-black">{money(offer.amount)}</div>
                                    <button onClick={() => accept(offer)} className="rounded-full bg-amber-300 text-black text-xs font-black uppercase tracking-[0.16em] px-4 py-3" data-testid="festival-accept">
                                        Accept
                                    </button>
                                </div>
                            ))}
                            {bidding.status === 'OPEN' && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={counter}
                                        disabled={bidding.round >= bidding.maxRounds}
                                        className="flex-1 rounded-full border border-white/15 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
                                        data-testid="festival-counter"
                                    >
                                        Counter
                                    </button>
                                    <button onClick={walk} className="flex-1 rounded-full border border-rose-400/40 text-rose-200 py-3 text-xs font-black uppercase tracking-[0.16em]" data-testid="festival-walk">
                                        Walk away
                                    </button>
                                </div>
                            )}
                            {bidding.status !== 'OPEN' && (
                                <button onClick={walk} className="w-full rounded-full bg-white text-black font-black uppercase tracking-[0.18em] text-xs py-4">
                                    Leave the room
                                </button>
                            )}
                            <p className="text-[11px] text-zinc-500">A counter asks the table to pay more. Buyers can raise, hold, or leave. After three rounds you accept or walk.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
