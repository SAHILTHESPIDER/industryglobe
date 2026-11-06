import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Player } from '../../types';
import { Confetti } from '../../components/motion';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import { formatCompact } from '../../services/ownPlatform/logic';
import {
    FLOAT_CHOICES,
    IpoQuote,
    completeIpo,
    founderAfterFloat,
    founderStake,
    ipoBanks,
    losesMajority,
    quoteIpo,
    showIpoMoney,
    showPct,
} from '../../services/ownPlatform/ipo';
import { paintedWorldPaths } from '../../services/ownPlatform/worldMapPaint';
import { WORLD_MAP_HEIGHT, WORLD_MAP_WIDTH, projectMarket } from '../../services/ownPlatform/worldPaths';
import { DealSigning, DealSigningModel } from './DealSigning';
import { headingFont } from './ui';

interface Props {
    player: Player;
    onClose: () => void;
    onApply: (result: { player: Player; error?: string }) => void;
}

const SEATS = [
    { name: 'You', role: 'Founder' },
    { name: 'Marta Oyelaran', role: 'Executive' },
    { name: 'Dinah Ayre', role: 'Finance' },
    { name: 'Helena Brandt', role: 'Independent' },
    { name: 'Yusuf Karim', role: 'Investor' },
    { name: 'Peter Lund', role: 'Counsel' },
];

const LAND = paintedWorldPaths();
const pctLabel = (value: number) => showPct(value);
const moneyPct = (value: number) => `${Math.round(value * 1000) / 10}%`;

export const IpoFlow: React.FC<Props> = ({ player, onClose, onApply }) => {
    const reduce = useReducedMotion();
    const banks = ipoBanks();
    const [step, setStep] = useState(1);
    const [bankId, setBankId] = useState('');
    const [floatPct, setFloatPct] = useState<number>(0.15);
    const [acceptLoss, setAcceptLoss] = useState(false);
    const [hands, setHands] = useState(reduce ? SEATS.length : 0);
    const [shownValue, setShownValue] = useState(0);
    const [hop, setHop] = useState(0);
    const [seenOrders, setSeenOrders] = useState(0);
    const [rung, setRung] = useState(false);
    const [chartSettled, setChartSettled] = useState(Boolean(reduce));
    const [signing, setSigning] = useState<DealSigningModel | null>(null);
    const [done, setDone] = useState<IpoQuote | null>(null);
    const [error, setError] = useState('');
    const quote = quoteIpo(player, bankId, floatPct);
    const company = player.ownPlatform?.name || 'The company';
    const signed = Boolean(done);

    useEffect(() => {
        if (step !== 1) return;
        if (reduce) {
            setHands(SEATS.length);
            return;
        }
        setHands(0);
        const timers = SEATS.map((_, index) => window.setTimeout(() => setHands(index + 1), 320 * (index + 1)));
        return () => timers.forEach(window.clearTimeout);
    }, [step, reduce]);

    useEffect(() => {
        if (step !== 3 || !quote) return;
        if (reduce) {
            setShownValue(quote.pitched);
            return;
        }
        const target = quote.pitched;
        const start = performance.now();
        let frame = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 1700);
            const swing = t < 1 ? Math.sin(t * 16) * (1 - t) * 0.07 : 0;
            const eased = 1 - (1 - t) ** 3;
            setShownValue(Math.max(0, Math.round(target * (eased + swing))));
            if (t < 1) frame = requestAnimationFrame(tick);
            else setShownValue(target);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [step, reduce, quote?.pitched]);

    useEffect(() => {
        if (step !== 4 || !quote) return;
        if (reduce) {
            setHop(quote.stops.length);
            return;
        }
        setHop(0);
        const timers = quote.stops.map((_, index) => window.setTimeout(() => setHop(index + 1), 780 * (index + 1)));
        return () => timers.forEach(window.clearTimeout);
    }, [step, reduce, quote?.oversubscription]);

    useEffect(() => {
        if (step !== 5 || !quote) return;
        if (reduce) {
            setSeenOrders(quote.orders.length);
            return;
        }
        setSeenOrders(0);
        const timers = quote.orders.map((_, index) => window.setTimeout(() => setSeenOrders(index + 1), 240 * (index + 1)));
        return () => timers.forEach(window.clearTimeout);
    }, [step, reduce, quote?.oversubscription]);

    useEffect(() => {
        if (step !== 8 || !done) return;
        if (reduce) {
            setChartSettled(true);
            return;
        }
        setChartSettled(false);
        const timer = window.setTimeout(() => setChartSettled(true), 1100);
        return () => window.clearTimeout(timer);
    }, [step, reduce, done]);

    const skipMotion = () => {
        setHands(SEATS.length);
        if (quote) {
            setShownValue(quote.pitched);
            setHop(quote.stops.length);
            setSeenOrders(quote.orders.length);
        }
        setChartSettled(true);
        setRung(true);
    };

    const goNext = () => {
        setError('');
        if (step === 2) {
            if (!quote) {
                setError('Pick a bank. That sets the fee, the cut, and the price they pitch.');
                return;
            }
            if (quote.losesControl && !acceptLoss) {
                setError('This listing drops you under 51%. Tap the red warning if you still want it.');
                return;
            }
        }
        if (step === 6) {
            openSign();
            return;
        }
        if (step >= 8) {
            onClose();
            return;
        }
        setStep(value => Math.min(8, value + 1));
    };

    const goBack = () => {
        setError('');
        if (signed && step <= 7) {
            setError('Papers are signed. Peeche stops here. The cheque is already in company cash.');
            return;
        }
        if (step <= 1) {
            onClose();
            return;
        }
        setStep(value => value - 1);
    };

    const openSign = () => {
        if (!quote) {
            setError('Pick a bank before the papers come out.');
            return;
        }
        const cash = readCompanyCash(player);
        setSigning({
            documentTitle: 'Listing agreement',
            kicker: 'Public offering',
            company,
            sellerName: player.name || 'Founder',
            sellerRole: 'Founder',
            buyerName: 'Public shareholders',
            buyerRole: quote.bank.name,
            preamble: `${player.name || 'The founder'} lists ${pctLabel(quote.floatPct)} of ${company}. ${quote.bank.name} underwrites it. The cheque is IPO proceeds and lands in company cash. Personal cash does not move.`,
            facts: [
                { label: 'Listed', value: pctLabel(quote.floatPct) },
                { label: 'Share price', value: `$${quote.price.toFixed(2)}` },
                { label: 'IPO proceeds', value: formatCompact(quote.net) },
                { label: 'Exchange', value: quote.exchange },
            ],
            clauses: [
                { title: 'New shares', body: 'The public float is new shares. Everyone already on the cap table is diluted, including you.' },
                { title: `${quote.bank.name} cut`, body: `They keep ${moneyPct(quote.bank.feePct)} as a fee and ${moneyPct(quote.bank.spreadPct)} as the underwriting cut. Both come off the cheque.` },
                { title: 'Company cash', body: 'What is left is labelled IPO proceeds. It is not salary, and it is not your personal cash.' },
            ],
            stamp: 'LISTED',
            cashLabel: 'IPO proceeds',
            cashFrom: cash,
            cashTo: cash + quote.net,
        });
    };

    const finishSign = () => {
        if (!quote) return;
        const result = completeIpo(player, {
            bankId: quote.bank.id,
            floatPct: quote.floatPct,
            acceptControlLoss: quote.losesControl ? acceptLoss : true,
        });
        setSigning(null);
        if (result.error) {
            setError(result.error);
            return;
        }
        if (result.player.money !== player.money) {
            setError('Personal cash moved, so the listing was not kept.');
            return;
        }
        onApply({ player: result.player });
        setDone(quote);
        setStep(7);
    };

    const titles = [
        'Board meeting',
        'Bank chuno',
        'Valuation',
        'Roadshow',
        'Order book',
        'Documents',
        'Listing day',
        'First trading day',
    ];
    const lines = [
        'Board IPO ke liye vote karti hai. Haath ek ek karke uthte hain.',
        'Ek bank chuno, aur kitna percent list karna hai.',
        'Value books, subscribers, aur shelf se aati hai.',
        'Plane shehar shehar jaata hai. Har shehar mein demand badhti hai.',
        'Investors orders daalte hain. Badge demand ko shares se compare karta hai.',
        'Papers sign karo. Paisa company cash mein jayega.',
        'Bell bajao. Hall mein confetti aur taaliyan.',
        'Chart hilta hai, phir company cash mein cheque dikhta hai.',
    ];

    return createPortal(
        <div className="fixed inset-0 z-[270] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" data-screen="ipo-flow">
            <div
                data-testid="ipo-flow"
                data-step={step}
                role="dialog"
                aria-label={`IPO step ${step}: ${titles[step - 1]}`}
                className="w-full sm:max-w-3xl max-h-[100dvh] sm:max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0c1018] text-white flex flex-col"
            >
                <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-white/10">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] uppercase tracking-[0.22em] text-[#e8c547]" data-testid="ipo-step">Step {step} of 8</div>
                        {!reduce && step < 7 && (
                            <button type="button" onClick={skipMotion} className="text-[11px] uppercase tracking-wider text-zinc-400 underline">
                                Skip the motion
                            </button>
                        )}
                    </div>
                    <h3 className="text-4xl sm:text-5xl font-black uppercase leading-none mt-1" style={{ fontFamily: headingFont }}>{titles[step - 1]}</h3>
                    <p className="text-sm text-zinc-300 mt-2">{lines[step - 1]}</p>
                    {!reduce && step < 7 && <p className="text-xs text-zinc-500 mt-1">Skip the motion finishes the animation. You still tap Aage to move on.</p>}
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                    {error && <p className="mb-3 text-sm text-rose-200" data-testid="ipo-error">{error}</p>}
                    {step === 1 && <BoardStep hands={hands} />}
                    {step === 2 && (
                        <BankStep
                            player={player}
                            banks={banks}
                            bankId={bankId}
                            floatPct={floatPct}
                            quote={quote}
                            acceptLoss={acceptLoss}
                            onBank={id => { setBankId(id); setAcceptLoss(false); setError(''); }}
                            onFloat={value => { setFloatPct(value); setAcceptLoss(false); setError(''); }}
                            onAcceptLoss={() => { setAcceptLoss(true); setError(''); }}
                        />
                    )}
                    {step === 3 && quote && <ValueStep quote={quote} shown={shownValue} />}
                    {step === 4 && quote && <RoadshowStep quote={quote} hop={hop} reduce={Boolean(reduce)} />}
                    {step === 5 && quote && <BookStep quote={quote} seen={seenOrders} />}
                    {step === 6 && quote && <DocsStep quote={quote} company={company} />}
                    {step === 7 && done && <BellStep rung={rung} reduce={Boolean(reduce)} onRing={() => setRung(true)} />}
                    {step === 8 && done && (
                        <TradeStep player={player} quote={done} settled={chartSettled} cash={readCompanyCash(player)} />
                    )}
                </div>
                <div className="shrink-0 border-t border-white/10 px-4 sm:px-6 py-3 flex flex-col gap-2 bg-[#0c1018]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <button type="button" data-testid="ipo-back" onClick={goBack} className="px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">
                            Peeche
                        </button>
                        {!signed && (
                            <button type="button" data-testid="ipo-cancel" onClick={onClose} className="px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">
                                Cancel IPO
                            </button>
                        )}
                        <button type="button" data-testid="ipo-next" onClick={goNext} className="sm:ml-auto px-4 py-3 rounded-full bg-[#e8c547] text-black text-xs font-black uppercase tracking-wider">
                            {step === 6 ? 'Sign the papers' : step === 8 ? 'Back to the desk' : 'Aage'}
                        </button>
                    </div>
                    <p className="text-xs text-zinc-500">
                        {step === 1
                            ? 'Peeche and Cancel IPO both close this. No money moves.'
                            : step === 6
                                ? 'Opens the papers. Nothing is final until you finish signing. Cancel IPO is still here until then.'
                                : step === 8
                                    ? 'Closes this day. The IPO proceeds are already in company cash.'
                                    : signed
                                        ? 'Peeche stops once the papers are signed. The cheque has already landed in company cash.'
                                        : 'Peeche goes to the previous step. Cancel IPO closes this. No money moves until the papers are signed.'}
                    </p>
                </div>
            </div>
            {signing && <DealSigning model={signing} onComplete={finishSign} />}
            <style>{`
                @keyframes ipo-bell {
                    0% { transform: rotate(0deg); }
                    20% { transform: rotate(-18deg); }
                    45% { transform: rotate(14deg); }
                    70% { transform: rotate(-8deg); }
                    100% { transform: rotate(0deg); }
                }
                .ipo-bell-swing { transform-origin: 50% 0%; animation: ipo-bell 0.7s ease-in-out 2; }
                @keyframes ipo-clap {
                    0%, 100% { transform: scaleY(0.35); }
                    50% { transform: scaleY(1); }
                }
                .ipo-clap { width: 6px; height: 28px; border-radius: 999px; background: #e8c547; transform-origin: center bottom; animation: ipo-clap 0.45s ease-in-out infinite; }
                @keyframes ipo-wobble {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                .ipo-chart-wobble { animation: ipo-wobble 0.35s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    [data-screen="ipo-flow"] * { animation: none !important; transition: none !important; }
                }
            `}</style>
        </div>,
        document.body,
    );
};

const BoardStep: React.FC<{ hands: number }> = ({ hands }) => (
    <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SEATS.map((seat, index) => {
                const up = hands > index;
                return (
                    <div key={seat.name} className="rounded-3xl border border-white/10 bg-[#141822] p-3 min-h-[132px] flex flex-col justify-end">
                        <div className="flex-1 flex items-end justify-center">
                            <div
                                className="text-4xl"
                                style={{
                                    transform: up ? 'translateY(0) rotate(-8deg)' : 'translateY(28px)',
                                    opacity: up ? 1 : 0.25,
                                    transition: 'transform 0.35s ease, opacity 0.35s ease',
                                }}
                                aria-hidden
                            >
                                ✋
                            </div>
                        </div>
                        <div className="font-bold leading-tight">{seat.name}</div>
                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{seat.role}</div>
                        <div className="text-xs text-emerald-300 mt-1">{up ? 'For' : 'Waiting'}</div>
                    </div>
                );
            })}
        </div>
        <p className={`mt-4 text-center text-3xl font-black uppercase tracking-wide ${hands >= SEATS.length ? 'text-emerald-300' : 'text-zinc-600'}`} style={{ fontFamily: headingFont }} data-testid="ipo-board">
            {hands >= SEATS.length ? 'Approved' : 'Voting'}
        </p>
        <p className="text-xs text-zinc-500 text-center mt-1">Aage takes you to the banks. The vote itself does not move money.</p>
    </div>
);

const BankStep: React.FC<{
    player: Player;
    banks: ReturnType<typeof ipoBanks>;
    bankId: string;
    floatPct: number;
    quote: IpoQuote | null;
    acceptLoss: boolean;
    onBank: (id: string) => void;
    onFloat: (value: number) => void;
    onAcceptLoss: () => void;
}> = ({ player, banks, bankId, floatPct, quote, acceptLoss, onBank, onFloat, onAcceptLoss }) => (
    <div className="space-y-4">
        <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">How much to list</div>
            <div className="flex flex-wrap gap-2 mt-2">
                {FLOAT_CHOICES.map(value => (
                    <button
                        key={value}
                        type="button"
                        data-testid={`ipo-float-${Math.round(value * 100)}`}
                        onClick={() => onFloat(value)}
                        className={`px-4 py-2 rounded-full text-sm font-bold ${floatPct === value ? 'bg-[#4F3BFF] text-white' : 'bg-white/5 text-zinc-200'}`}
                    >
                        {pctLabel(value)}
                    </button>
                ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Sets the new shares. 10% is the smallest listing. 30% is the largest.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
            {banks.map(bank => {
                const picked = bank.id === bankId;
                const face: React.CSSProperties = {
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 24,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: '#141822',
                    padding: 16,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                };
                return (
                    <button
                        key={bank.id}
                        type="button"
                        data-testid={`ipo-bank-${bank.id}`}
                        onClick={() => onBank(bank.id)}
                        className="text-left h-52"
                        style={{ perspective: 900 }}
                    >
                        <div style={{
                            position: 'relative',
                            height: '100%',
                            transformStyle: 'preserve-3d',
                            transition: 'transform 0.5s ease',
                            transform: picked ? 'rotateY(180deg)' : 'none',
                        }}>
                            <div style={face}>
                                <div className="text-[11px] uppercase tracking-wider text-[#e8c547]">Tap to flip</div>
                                <div className="text-2xl font-black leading-none mt-3" style={{ fontFamily: headingFont }}>{bank.name}</div>
                                <p className="text-sm text-zinc-400 mt-3">Shows this bank&apos;s fee, underwriting cut, and the valuation they pitch.</p>
                            </div>
                            <div style={{ ...face, transform: 'rotateY(180deg)' }}>
                                <div className="text-[11px] uppercase tracking-wider text-[#e8c547]">Picked</div>
                                <div className="text-xl font-black leading-none mt-2" style={{ fontFamily: headingFont }}>{bank.name}</div>
                                <p className="text-sm text-zinc-300 mt-2">{bank.line}</p>
                                <div className="text-sm mt-2">Fee {moneyPct(bank.feePct)} · cut {moneyPct(bank.spreadPct)}</div>
                                <div className="text-sm text-zinc-400">Pitch {bank.pitchMultiple.toFixed(2)}× book value.</div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
        <p className="text-xs text-zinc-500">Flips the card and picks that bank. Tap another card to switch.</p>
        <div className="rounded-2xl border border-white/10 p-3 text-sm text-zinc-300">
            You hold {pctLabel(founderStake(player))} now. After this listing you would hold {pctLabel(founderAfterFloat(player, floatPct))}.
        </div>
        {(quote?.losesControl || losesMajority(player, floatPct)) && (
            <div className="rounded-2xl border border-rose-400/50 bg-rose-500/10 p-3">
                <p className="text-sm text-rose-100">This drops you under 51%. You would not control the company.</p>
                <button type="button" data-testid="ipo-accept-loss" onClick={onAcceptLoss} className={`mt-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${acceptLoss ? 'bg-rose-200 text-black' : 'bg-white text-black'}`}>
                    {acceptLoss ? 'You confirmed the warning' : 'I still want to list this much'}
                </button>
                <p className="text-xs text-rose-100/80 mt-2">Confirms a listing that leaves you under 51%. Nothing is signed yet.</p>
            </div>
        )}
    </div>
);

const ValueStep: React.FC<{ quote: IpoQuote; shown: number }> = ({ quote, shown }) => (
    <div>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{quote.bank.name} pitch</div>
        <div className="text-5xl sm:text-7xl font-black text-[#e8c547] leading-none mt-2" style={{ fontFamily: headingFont }} data-testid="ipo-value">
            {showIpoMoney(shown)}
        </div>
        <p className="text-sm text-zinc-400 mt-2">Book value is {formatCompact(quote.valuation)}. {quote.bank.name} multiplies it by {quote.bank.pitchMultiple.toFixed(2)}.</p>
        <div className="mt-4 space-y-2">
            {quote.drivers.map(driver => (
                <div key={driver.label} className="rounded-2xl border border-white/10 px-3 py-2">
                    <div className="flex justify-between gap-3 text-sm">
                        <span className="font-bold">{driver.label}</span>
                        <span>{formatCompact(driver.amount)}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{driver.line}</p>
                </div>
            ))}
        </div>
    </div>
);

const RoadshowStep: React.FC<{ quote: IpoQuote; hop: number; reduce: boolean }> = ({ quote, hop, reduce }) => {
    const index = Math.max(0, Math.min(quote.stops.length - 1, hop - 1));
    const city = quote.stops[index];
    const point = projectMarket(city.lat, city.lon);
    return (
        <div className="space-y-3">
            <div className="rounded-3xl border border-white/10 bg-[#070b16] p-2">
                <svg viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`} className="w-full h-auto" role="img" aria-label="Roadshow world map">
                    <rect width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} fill="#070b16" />
                    {LAND.map(path => (
                        <path key={path.id} d={path.d} fill="#243044" stroke="#0b1020" strokeWidth="0.6" fillRule={path.holed ? 'evenodd' : 'nonzero'} />
                    ))}
                    {quote.stops.map((stop, stopIndex) => {
                        const at = projectMarket(stop.lat, stop.lon);
                        const been = hop > stopIndex;
                        return (
                            <g key={stop.id}>
                                <circle cx={at.x} cy={at.y} r={been ? 6 : 3.5} fill={been ? '#e8c547' : '#94a3b8'} />
                                {been && (
                                    <text x={at.x + 8} y={at.y - 8} fill="#ffffff" fontSize="13" fontWeight="700">{stop.city}</text>
                                )}
                            </g>
                        );
                    })}
                    <motion.g
                        animate={{ x: point.x, y: point.y }}
                        transition={reduce ? { duration: 0 } : { type: 'tween', duration: 0.7 }}
                    >
                        <path d="M0 -8 L10 0 L0 8 L2 0 Z" fill="#ffffff" />
                    </motion.g>
                </svg>
            </div>
            <div className="space-y-2">
                {quote.stops.map((stop, stopIndex) => (
                    <div key={stop.id}>
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>{stop.city}</span>
                            <span>{hop > stopIndex ? `${Math.round(stop.demand * 100)}% appetite` : 'Waiting'}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-1">
                            <div
                                className="h-full bg-[#e8c547]"
                                style={{
                                    width: hop > stopIndex ? `${Math.round(stop.demand * 100)}%` : '0%',
                                    transition: reduce ? 'none' : 'width 0.6s ease',
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-xs text-zinc-500">Each bar is that city&apos;s appetite. The order book turns all of it into one multiple.</p>
        </div>
    );
};

const BookStep: React.FC<{ quote: IpoQuote; seen: number }> = ({ quote, seen }) => (
    <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Shares offered</div>
                <div className="text-3xl font-black">{quote.shares.toLocaleString()}</div>
            </div>
            <div className="rounded-full bg-emerald-400/15 text-emerald-200 px-4 py-2 text-sm font-black" data-testid="ipo-oversub">
                {quote.oversubscription.toFixed(1)}× oversubscribed
            </div>
        </div>
        <p className="text-xs text-zinc-500 mt-2">The badge is orders divided by the shares you are selling. Over 1× means more buyers than shares.</p>
        <div className="mt-3 space-y-2">
            {quote.orders.slice(0, seen).map(order => (
                <div key={order.name} className="flex justify-between gap-3 rounded-2xl border border-white/10 px-3 py-2 text-sm">
                    <span>{order.name}</span>
                    <span>{order.shares.toLocaleString()} shares</span>
                </div>
            ))}
        </div>
        <p className="text-sm text-zinc-300 mt-3">Clearing price ${quote.price.toFixed(2)}. Gross {formatCompact(quote.gross)}. Fees {formatCompact(quote.fees)}. Company cheque {formatCompact(quote.net)}.</p>
        <p className="text-xs text-zinc-500 mt-1">The price moves with the bank&apos;s pitch and how full the book is. Fees come off before company cash.</p>
    </div>
);

const DocsStep: React.FC<{ quote: IpoQuote; company: string }> = ({ quote, company }) => (
    <div className="rounded-3xl bg-[#f4efe4] text-zinc-900 p-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#7c5c28]">Ready to sign</div>
        <h4 className="text-3xl font-black leading-none mt-2" style={{ fontFamily: headingFont }}>{company}</h4>
        <p className="text-sm mt-3">{pctLabel(quote.floatPct)} new shares · ${quote.price.toFixed(2)} · {quote.exchange} · {quote.ticker}</p>
        <p className="text-sm mt-2">IPO proceeds {formatCompact(quote.net)} go to company cash. Your personal cash stays where it is.</p>
        <p className="text-xs text-zinc-600 mt-3">Sign the papers opens the signing room. Cancel IPO is still here until that signing finishes.</p>
    </div>
);

const BellStep: React.FC<{ rung: boolean; reduce: boolean; onRing: () => void }> = ({ rung, reduce, onRing }) => (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1408] to-[#0d1016] min-h-[280px] flex flex-col items-center justify-center text-center px-4 py-8">
        {rung && <Confetti count={28} />}
        <button type="button" data-testid="ipo-bell" onClick={onRing} className="relative z-10" aria-label="Ring the listing bell">
            <svg viewBox="0 0 120 120" className={`w-36 h-36 ${rung && !reduce ? 'ipo-bell-swing' : ''}`}>
                <rect x="56" y="6" width="8" height="16" rx="2" fill="#e8c547" />
                <path d="M28 78c0-28 12-48 32-48s32 20 32 48H28z" fill="#f4efe4" stroke="#e8c547" strokeWidth="3" />
                <rect x="22" y="76" width="76" height="8" rx="3" fill="#e8c547" />
                <circle cx="60" cy="96" r="8" fill="#e8c547" />
            </svg>
        </button>
        <div className="text-3xl font-black uppercase mt-2" style={{ fontFamily: headingFont }}>{rung ? 'The bell is rung' : 'Ring the bell'}</div>
        <p className="text-sm text-zinc-300 mt-2 max-w-sm">{rung ? 'Confetti, then applause. Aage opens the first trading day.' : 'Rings the exchange bell and starts the hall.'}</p>
        {rung && (
            <div className="flex items-end gap-1 h-8 mt-4" aria-hidden>
                {[0, 1, 2, 3, 4, 5].map(index => (
                    <span key={index} className="ipo-clap" style={{ animationDelay: `${index * 0.08}s` }} />
                ))}
            </div>
        )}
    </div>
);

const TradeStep: React.FC<{ player: Player; quote: IpoQuote; settled: boolean; cash: number }> = ({ player, quote, settled, cash }) => {
    const points = quote.dayMove;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = Math.max(0.01, max - min);
    const line = points.map((point, index) => {
        const x = (index / Math.max(1, points.length - 1)) * 320;
        const y = 96 - ((point - min) / span) * 78;
        return `${x},${y}`;
    }).join(' ');
    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#07110d] p-4">
                <div className="flex justify-between text-sm text-emerald-200">
                    <span>{quote.ticker}</span>
                    <span>${(points[points.length - 1] || quote.price).toFixed(2)}</span>
                </div>
                <svg viewBox="0 0 320 110" className={`w-full h-32 mt-2 ${settled ? '' : 'ipo-chart-wobble'}`} role="img" aria-label="First trading day share chart">
                    <polyline fill="none" stroke="#34d399" strokeWidth="3" points={line} />
                </svg>
                <p className="text-xs text-zinc-400">The line wobbles through the open, then settles on the close.</p>
            </div>
            {settled && (
                <div data-testid="ipo-proceeds">
                    <div className="text-3xl sm:text-4xl font-black text-emerald-300 leading-tight" style={{ fontFamily: headingFont }}>
                        Company cash mein {formatCompact(quote.net)} aaya
                    </div>
                    <p className="text-sm text-zinc-300 mt-2">Labelled IPO proceeds. Company cash is now {formatCompact(cash)}. Your cash stays {formatCompact(player.money)}.</p>
                    <p className="text-xs text-zinc-500 mt-1" data-testid="ipo-personal">Personal cash does not change on a listing.</p>
                    <article className="mt-4 rounded-2xl bg-[#f4efe4] text-zinc-900 p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c5c28]">Empire Gazette</div>
                        <h4 className="text-2xl font-black leading-tight mt-1" data-testid="ipo-headline">{quote.headline}</h4>
                        <p className="text-sm mt-2">Public float {pctLabel(quote.floatPct)} · new shareholders on {quote.exchange}. You hold about {pctLabel(quote.founderAfter)} after dilution.</p>
                    </article>
                </div>
            )}
        </div>
    );
};
