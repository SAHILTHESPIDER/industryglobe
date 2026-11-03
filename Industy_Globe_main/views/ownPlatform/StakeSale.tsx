import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, Clapperboard, Trophy, Tv, UserRound } from 'lucide-react';
import { Player, StakeBuyerKind, StakeConditionKind } from '../../types';
import { loadCatalogue } from '../../services/rights/catalogue';
import { formatCompact } from '../../services/ownPlatform/logic';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import {
    STAKE_CHIPS,
    STAKE_SALE_LINE,
    StakeOffer,
    acceptStakeOffer,
    buildStakeOffers,
    buyerKindLabel,
    capSlices,
    impliedValuation,
    losesControl,
    maxSellPoints,
    negotiateOffer,
    offerMoneyRange,
    rejectOffer,
} from '../../services/ownPlatform/stakeSale';
import { DealSigning, DealSigningModel } from './DealSigning';
import { headingFont } from './ui';

interface Props {
    player: Player;
    valuation: number;
    onClose: () => void;
    onApply: (result: { player: Player; error?: string }) => void;
}

const ICONS: Record<StakeBuyerKind, React.ReactNode> = {
    PRODUCTION: <Clapperboard size={18} />,
    ACTOR: <UserRound size={18} />,
    RIVAL: <Tv size={18} />,
    SPORT: <Trophy size={18} />,
    BUSINESS: <Briefcase size={18} />,
};

export const StakeSale: React.FC<Props> = ({ player, valuation, onClose, onApply }) => {
    const maxPoints = maxSellPoints(player);
    const [points, setPoints] = useState(() => Math.min(10, Math.max(1, maxPoints || 1)));
    const [step, setStep] = useState<1 | 2>(1);
    const [offers, setOffers] = useState<StakeOffer[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [chipNote, setChipNote] = useState('');
    const [talkingId, setTalkingId] = useState<string | null>(null);
    const [ask, setAsk] = useState('');
    const [signing, setSigning] = useState<{ model: DealSigningModel; next: Player } | null>(null);
    const salt = useMemo(() => Math.floor(Math.random() * 1_000_000), []);
    const pct = points / 100;
    const range = offerMoneyRange(valuation, pct);
    const founder = capSlices(player).founder;
    const after = Math.max(0, founder - pct);
    const warning = losesControl(player, pct);
    const openOffers = (offers || []).filter(row => row.status === 'OPEN');

    const chooseChip = (chip: number) => {
        if (chip > maxPoints) {
            setPoints(maxPoints);
            setChipNote(`You only hold ${maxPoints}%, so this chip stops there.`);
            return;
        }
        setPoints(chip);
        setChipNote(`Sells ${chip}% of the company.`);
    };

    const seeOffers = async () => {
        if (maxPoints < 1 || busy) return;
        setBusy(true);
        setError('');
        let records: Awaited<ReturnType<typeof loadCatalogue>> = [];
        try {
            records = await loadCatalogue();
        } catch {
            records = [];
        }
        const built = buildStakeOffers(player, points / 100, salt, valuation, records);
        setOffers(built);
        setStep(2);
        setBusy(false);
        setTalkingId(null);
    };

    const patchOffer = (next: StakeOffer) => {
        setOffers(list => (list || []).map(row => row.id === next.id ? next : row));
    };

    const accept = (offer: StakeOffer) => {
        const result = acceptStakeOffer(player, offer);
        if (result.error) {
            setError(result.error);
            return;
        }
        const next = result.player;
        setSigning({
            next,
            model: {
                documentTitle: 'Share purchase agreement',
                company: player.ownPlatform?.name || 'The company',
                sellerName: player.name || 'Founder',
                sellerRole: 'Founder',
                buyerName: offer.name,
                buyerRole: buyerKindLabel(offer.kind),
                facts: [
                    { label: 'Stake sold', value: `${Math.round(offer.pct * 100)}%` },
                    { label: 'Price', value: formatCompact(offer.amount) },
                    { label: 'Buyer', value: offer.name },
                    { label: 'Implied value', value: formatCompact(impliedValuation(offer.amount, offer.pct)) },
                ],
                clauses: offer.conditions.map(condition => ({ title: condition.label, body: condition.effect })),
                stamp: 'DEAL DONE',
                cashLabel: `Stake sale to ${offer.name}`,
                cashFrom: readCompanyCash(player),
                cashTo: readCompanyCash(next),
            },
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[260] bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div
                data-screen="stake-sale"
                data-testid="stake-flow"
                className="w-full sm:max-w-3xl max-h-[100dvh] sm:max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0d1016] p-4 sm:p-6"
                onClick={event => event.stopPropagation()}
                role="dialog"
                aria-label="Sell a stake"
            >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#FFC44D]">Cap table</div>
                <h3 className="text-4xl sm:text-5xl font-black uppercase leading-none mt-1" style={{ fontFamily: headingFont }}>Stake becho</h3>
                <p className="text-sm text-zinc-300 mt-2">{STAKE_SALE_LINE}</p>
                {maxPoints < 1 && (
                    <div className="mt-4">
                        <p className="text-sm text-zinc-300">You do not hold a stake you can sell. Launch investors, earlier buyers, or the public already own the rest.</p>
                        <button type="button" onClick={onClose} className="mt-4 px-4 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider">Close</button>
                    </div>
                )}
                {maxPoints >= 1 && step === 1 && (
                    <div className="mt-5 space-y-4">
                        <div>
                            <div className="text-[11px] uppercase tracking-wider text-zinc-500">How much</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {STAKE_CHIPS.map(chip => (
                                    <button
                                        key={chip}
                                        type="button"
                                        data-testid={`stake-chip-${chip}`}
                                        onClick={() => chooseChip(chip)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold ${points === chip ? 'bg-[#4F3BFF] text-white' : 'bg-white/5 text-zinc-200'}`}
                                    >
                                        {chip}%
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">{chipNote || 'Each chip sets the slice buyers will bid on.'}</p>
                        </div>
                        <label className="block">
                            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Slider · {points}%</span>
                            <input
                                data-testid="stake-slider"
                                type="range"
                                min={1}
                                max={maxPoints}
                                step={1}
                                value={Math.min(points, maxPoints)}
                                onChange={event => {
                                    setPoints(Number(event.target.value));
                                    setChipNote('');
                                }}
                                className="mt-2 w-full accent-[#4F3BFF]"
                            />
                            <span className="block text-xs text-zinc-500 mt-1">Drag anywhere from 1% to {maxPoints}%. You cannot sell more than you hold, and you cannot sell less than 1%.</span>
                        </label>
                        <div className="rounded-2xl border border-white/10 p-4 space-y-1">
                            <p className="text-sm text-zinc-200">Company valuation is {formatCompact(valuation)}.</p>
                            <p className="text-sm text-zinc-400">A straight slice at that value is {formatCompact(range.fair)}. Buyers usually offer between {formatCompact(range.low)} and {formatCompact(range.high)}.</p>
                            <p className="text-sm text-zinc-400">You would keep {Math.round(after * 100)}% after this sale. You hold {Math.round(founder * 100)}% now.</p>
                        </div>
                        {warning && (
                            <p data-testid="stake-control-warning" className="rounded-2xl border border-rose-400/50 bg-rose-500/10 text-rose-100 text-sm p-3">
                                This drops you under 51%. You would not control the company.
                            </p>
                        )}
                        {error && <p className="text-sm text-rose-300">{error}</p>}
                        <div className="flex flex-col-reverse sm:flex-row gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">Cancel the sale</button>
                            <button type="button" data-testid="stake-see-offers" disabled={busy} onClick={seeOffers} className="px-4 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-50">
                                {busy ? 'Buyers are reading the company' : warning ? 'See offers anyway' : 'See offers'}
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">{warning ? 'You will not hold 51% after this sale. Buyers can still bid.' : 'Asks buyers to bid for this slice. Nothing is signed yet.'}</p>
                        <p className="text-xs text-zinc-500">Cancel closes this sale. No money moves.</p>
                    </div>
                )}
                {maxPoints >= 1 && step === 2 && (
                    <div className="mt-5 space-y-3">
                        <p className="text-sm text-zinc-400">Bids for {points}% of {player.ownPlatform?.name || 'the company'}. Accept one, turn the others down, or talk.</p>
                        {error && <p className="text-sm text-rose-300">{error}</p>}
                        {(offers || []).map(offer => (
                            <OfferCard
                                key={offer.id}
                                offer={offer}
                                talking={talkingId === offer.id}
                                ask={ask}
                                onAsk={setAsk}
                                onTalk={() => {
                                    setTalkingId(offer.id);
                                    setAsk(String(Math.round(offer.amount * 1.1)));
                                }}
                                onCloseTalk={() => setTalkingId(null)}
                                onNegotiate={move => patchOffer(negotiateOffer(offer, move))}
                                onReject={() => patchOffer(rejectOffer(offer))}
                                onAccept={() => accept(offer)}
                            />
                        ))}
                        {openOffers.length === 0 && <p className="text-sm text-zinc-300">Nobody is left at the table. Close this and start again when you want new bids.</p>}
                        <button type="button" data-testid="stake-cancel" onClick={onClose} className="w-full sm:w-auto px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">Cancel the sale</button>
                        <p className="text-xs text-zinc-500">Closes the whole sale. Nothing is signed and no money moves.</p>
                    </div>
                )}
            </div>
            {signing && (
                <DealSigning
                    model={signing.model}
                    onComplete={() => {
                        onApply({ player: signing.next });
                        onClose();
                    }}
                />
            )}
        </div>,
        document.body,
    );
};

const OfferCard: React.FC<{
    offer: StakeOffer;
    talking: boolean;
    ask: string;
    onAsk: (value: string) => void;
    onTalk: () => void;
    onCloseTalk: () => void;
    onNegotiate: (move: { type: 'PRICE'; ask: number } | { type: 'DROP'; kind: StakeConditionKind }) => void;
    onReject: () => void;
    onAccept: () => void;
}> = ({ offer, talking, ask, onAsk, onTalk, onCloseTalk, onNegotiate, onReject, onAccept }) => {
    const open = offer.status === 'OPEN';
    const talksLeft = open && offer.rounds < 2;
    const typed = Math.round(Number(ask.replace(/[^0-9]/g, '')) || 0);
    return (
        <article data-testid="stake-offer" data-kind={offer.kind} className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 grid place-items-center text-[#FFC44D] shrink-0" aria-hidden="true">{ICONS[offer.kind]}</div>
                <div className="min-w-0">
                    <div className="font-black text-lg leading-tight truncate">{offer.name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500" data-testid={`stake-kind-${offer.kind}`}>{buyerKindLabel(offer.kind)}</div>
                </div>
            </div>
            {offer.status === 'WALKED' && <p className="text-sm text-rose-200 mt-3">They walked away.</p>}
            {offer.status === 'REJECTED' && <p className="text-sm text-zinc-500 mt-3">You turned them down.</p>}
            {open && (
                <>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Amount offered</div>
                            <div className="text-2xl font-black">{formatCompact(offer.amount)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Implied valuation</div>
                            <div className="text-2xl font-black">{formatCompact(impliedValuation(offer.amount, offer.pct))}</div>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">This price values the whole company at {formatCompact(impliedValuation(offer.amount, offer.pct))}.</p>
                    <ul className="mt-3 space-y-2">
                        {offer.conditions.map(condition => (
                            <li key={condition.kind}>
                                <div className="text-sm font-bold text-zinc-100">{condition.label}</div>
                                <p className="text-xs text-zinc-400">{condition.effect}</p>
                            </li>
                        ))}
                    </ul>
                    {offer.note && <p className="text-sm text-[#FFC44D] mt-3" data-testid="stake-negotiate-result">{offer.note}</p>}
                    <div className="mt-4 grid sm:grid-cols-3 gap-2">
                        <div>
                            <button type="button" data-testid="stake-accept" onClick={onAccept} className="w-full py-2.5 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider">Accept</button>
                            <p className="text-[11px] text-zinc-500 mt-1">Sells the stake at this price. The money goes to company cash.</p>
                        </div>
                        <div>
                            <button type="button" data-testid="stake-reject" onClick={onReject} className="w-full py-2.5 rounded-full border border-white/15 text-[11px] font-bold uppercase tracking-wider">Reject</button>
                            <p className="text-[11px] text-zinc-500 mt-1">Turns this buyer down. The other offers stay.</p>
                        </div>
                        <div>
                            {talksLeft ? (
                                <button type="button" data-testid="stake-negotiate" onClick={talking ? onCloseTalk : onTalk} className="w-full py-2.5 rounded-full border border-[#FFC44D]/50 text-[#FFC44D] text-[11px] font-bold uppercase tracking-wider">
                                    {talking ? 'Hide talk' : 'Negotiate'}
                                </button>
                            ) : (
                                <p className="text-[11px] text-zinc-400 py-2">No talks left on this offer. Accept it or reject it.</p>
                            )}
                            {talksLeft && <p className="text-[11px] text-zinc-500 mt-1">Ask for more money, or ask them to drop one condition. {2 - offer.rounds} talk{offer.rounds === 1 ? '' : 's'} left.</p>}
                        </div>
                    </div>
                    {talking && talksLeft && (
                        <div className="mt-3 rounded-2xl border border-white/10 p-3 space-y-3">
                            <div>
                                <button
                                    type="button"
                                    data-testid="stake-ask-higher"
                                    onClick={() => onNegotiate({ type: 'PRICE', ask: Math.round(offer.amount * 1.1) })}
                                    className="px-3 py-2 rounded-full bg-[#4F3BFF] text-white text-[11px] font-bold uppercase tracking-wider"
                                >
                                    Ask for 10% more
                                </button>
                                <p className="text-[11px] text-zinc-500 mt-1">Sends a price 10% above this bid. They can take it, meet you halfway, or walk.</p>
                            </div>
                            <label className="block text-[11px] text-zinc-400">
                                Or type a higher price
                                <input
                                    data-testid="stake-ask-input"
                                    inputMode="numeric"
                                    value={ask}
                                    onChange={event => onAsk(event.target.value.replace(/[^0-9]/g, ''))}
                                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-base"
                                />
                            </label>
                            <div>
                                <button
                                    type="button"
                                    onClick={() => onNegotiate({ type: 'PRICE', ask: typed })}
                                    className="px-3 py-2 rounded-full border border-white/20 text-[11px] font-bold uppercase tracking-wider"
                                >
                                    Send this price
                                </button>
                                <p className="text-[11px] text-zinc-500 mt-1">Sends the number you typed, if it is higher than the bid.</p>
                            </div>
                            {offer.conditions.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[11px] text-zinc-400">Drop one condition. They can agree, meet you halfway, or walk.</p>
                                    {offer.conditions.map(condition => (
                                        <button
                                            key={condition.kind}
                                            type="button"
                                            onClick={() => onNegotiate({ type: 'DROP', kind: condition.kind })}
                                            className="block w-full text-left px-3 py-2 rounded-2xl border border-white/10 text-sm"
                                        >
                                            Drop “{condition.label}”
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
            {!open && offer.note && <p className="text-xs text-zinc-500 mt-2">{offer.note}</p>}
        </article>
    );
};
