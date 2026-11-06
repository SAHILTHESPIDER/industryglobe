import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { Player } from '../../types';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import { formatCompact } from '../../services/ownPlatform/logic';
import {
    StakeOffer,
    acceptStakeOffer,
    buyerKindLabel,
    impliedValuation,
} from '../../services/ownPlatform/stakeSale';
import { DealSigning, DealSigningModel } from './DealSigning';
import { headingFont } from './ui';

interface Props {
    player: Player;
    offer: StakeOffer;
    onBackToOffers: () => void;
    onCancelSale: () => void;
    onSigned: (next: Player) => void;
}

const STEPS = ['Offer letter', 'Handshake', 'Shartein', 'Lawyer stamp', 'Final sign'] as const;

const LINES = [
    'The buyer has put the price and the stake in writing.',
    'Meet across the table and shake hands. The wire picks it up.',
    'Read the conditions. They ride with the stake after you sign.',
    'Counsel stamps the terms. The cheque is still not written.',
    'Both sides sign. The money lands in company cash, not in your pocket.',
];

const paper = '"Instrument Serif", Georgia, serif';

const pointsOf = (pct: number) => Math.round(pct * 100);

export const StakeDealClose: React.FC<Props> = ({ player, offer, onBackToOffers, onCancelSale, onSigned }) => {
    const reduce = useReducedMotion();
    const [step, setStep] = useState(1);
    const [shook, setShook] = useState(false);
    const [news, setNews] = useState(false);
    const [stamped, setStamped] = useState(false);
    const [error, setError] = useState('');
    const [signing, setSigning] = useState<{ model: DealSigningModel; next: Player } | null>(null);
    const company = player.ownPlatform?.name || 'The company';
    const seller = player.name || 'Founder';
    const pct = pointsOf(offer.pct);
    const ticker = `${offer.name} ne company ka ${pct}% kharida`;

    useEffect(() => {
        if (!shook) return;
        if (reduce) {
            setNews(true);
            return;
        }
        const timer = window.setTimeout(() => setNews(true), 680);
        return () => window.clearTimeout(timer);
    }, [shook, reduce]);

    const goBack = () => {
        setError('');
        if (signing) {
            setError('Papers are out. Peeche stops here. Finish the signature. The cheque lands in company cash.');
            return;
        }
        if (step <= 1) {
            onBackToOffers();
            return;
        }
        setStep(current => current - 1);
    };

    const goNext = () => {
        setError('');
        if (step === 2 && !shook) {
            setError('Shake hands first. The meeting is not over.');
            return;
        }
        if (step === 4 && !stamped) {
            setError('The lawyer still has to stamp the papers.');
            return;
        }
        if (step >= 5 || signing) return;
        setStep(current => current + 1);
    };

    const shake = () => {
        if (shook || signing) return;
        setError('');
        setShook(true);
        if (reduce) setNews(true);
    };

    const stamp = () => {
        if (stamped || signing) return;
        setError('');
        setStamped(true);
    };

    const sign = () => {
        if (signing) return;
        setError('');
        const result = acceptStakeOffer(player, offer);
        if (result.error) {
            setError(result.error);
            return;
        }
        if (result.player.money !== player.money) {
            setError('Personal cash moved, so the sale was not kept.');
            return;
        }
        const next = result.player;
        setSigning({
            next,
            model: {
                documentTitle: 'Share purchase agreement',
                company,
                sellerName: seller,
                sellerRole: 'Founder',
                buyerName: offer.name,
                buyerRole: buyerKindLabel(offer.kind),
                facts: [
                    { label: 'Stake sold', value: `${pct}%` },
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

    const aageDisabled = Boolean(signing) || (step === 2 && !shook) || (step === 4 && !stamped);
    const prevName = step <= 1 ? 'the bids' : STEPS[step - 2].toLowerCase();
    const nextName = step >= 5 ? 'the signature' : STEPS[step].toLowerCase();

    return createPortal(
        <div className="fixed inset-0 z-[275] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4" data-screen="stake-confirm">
            <div
                data-testid="stake-confirm"
                data-step={step}
                role="dialog"
                aria-label={`Stake sale step ${step}: ${STEPS[step - 1]}`}
                className="w-full sm:max-w-3xl max-h-[100dvh] sm:max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0c1018] text-white flex flex-col"
            >
                <div className="px-4 sm:px-6 pt-4 pb-3 pr-14 border-b border-white/10">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#FFC44D]" data-testid="stake-confirm-step">Step {step} of {STEPS.length}</div>
                    <ol className="mt-2 flex gap-1.5 overflow-x-auto">
                        {STEPS.map((title, index) => {
                            const number = index + 1;
                            const on = number === step;
                            const done = number < step;
                            return (
                                <li
                                    key={title}
                                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${on ? 'bg-[#FFC44D] text-black' : done ? 'bg-white/15 text-white' : 'bg-white/5 text-zinc-500'}`}
                                >
                                    {number} {title}
                                </li>
                            );
                        })}
                    </ol>
                    <h3 className="text-4xl sm:text-5xl font-black uppercase leading-none mt-3" style={{ fontFamily: headingFont }}>{STEPS[step - 1]}</h3>
                    <p className="text-sm text-zinc-300 mt-2">{LINES[step - 1]}</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                    {error && <p className="mb-3 text-sm text-rose-200" data-testid="stake-confirm-error">{error}</p>}
                    {step === 1 && <OfferLetter player={player} offer={offer} company={company} seller={seller} pct={pct} />}
                    {step === 2 && (
                        <HandshakeRoom
                            offer={offer}
                            pct={pct}
                            shook={shook}
                            news={news}
                            ticker={ticker}
                            reduce={Boolean(reduce)}
                            onShake={shake}
                        />
                    )}
                    {step === 3 && <Shartein offer={offer} />}
                    {step === 4 && <LawyerStamp stamped={stamped} reduce={Boolean(reduce)} onStamp={stamp} />}
                    {step === 5 && <FinalSign offer={offer} company={company} pct={pct} pending={Boolean(signing)} onSign={sign} />}
                </div>
                <div className="shrink-0 border-t border-white/10 px-4 sm:px-6 py-3 flex flex-col gap-2 bg-[#0c1018]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <button type="button" data-testid="stake-peeche" onClick={goBack} className="px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">
                            Peeche
                        </button>
                        {!signing && (
                            <button type="button" data-testid="stake-confirm-cancel" onClick={onCancelSale} className="px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">
                                Cancel
                            </button>
                        )}
                        {step < 5 && (
                            <button
                                type="button"
                                data-testid="stake-aage"
                                disabled={aageDisabled}
                                onClick={goNext}
                                className="sm:ml-auto px-4 py-3 rounded-full bg-[#FFC44D] text-black text-xs font-black uppercase tracking-wider disabled:opacity-40"
                            >
                                Aage
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-zinc-500">Peeche goes back to {prevName}. The sale is not signed.</p>
                    {!signing && <p className="text-xs text-zinc-500">Cancel closes this sale. No money moves.</p>}
                    {step < 5 && (
                        <p className="text-xs text-zinc-500">
                            {aageDisabled
                                ? step === 2
                                    ? 'Aage waits until you shake hands. Company cash does not change.'
                                    : 'Aage waits until the lawyer stamps the papers. Company cash does not change.'
                                : `Aage opens ${nextName}. Company cash stays where it is.`}
                        </p>
                    )}
                    {signing && <p className="text-xs text-zinc-500">The signature is open. Company cash rises only when that signing finishes.</p>}
                </div>
            </div>
            {signing && (
                <DealSigning
                    model={signing.model}
                    onComplete={() => onSigned(signing.next)}
                />
            )}
            <style>{`
                @keyframes stake-flash {
                    0% { opacity: 0; transform: scale(0.4); }
                    18% { opacity: 0.95; }
                    100% { opacity: 0; transform: scale(1.35); }
                }
                @keyframes stake-ticker {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                [data-screen="stake-confirm"] .hand-you,
                [data-screen="stake-confirm"] .hand-buyer { transition: left 0.55s cubic-bezier(.16,.84,.32,1), top 0.55s cubic-bezier(.16,.84,.32,1); }
                [data-screen="stake-confirm"] .hand-you { left: 22%; top: 50%; }
                [data-screen="stake-confirm"] .hand-buyer { left: 64%; top: 34%; }
                [data-screen="stake-confirm"] .hand-you.is-shaking,
                [data-screen="stake-confirm"] .hand-you.is-done { left: 40%; top: 44%; }
                [data-screen="stake-confirm"] .hand-buyer.is-shaking,
                [data-screen="stake-confirm"] .hand-buyer.is-done { left: 46%; top: 42%; }
                [data-screen="stake-confirm"] .cam-flash { animation: stake-flash 0.55s ease forwards; }
                [data-screen="stake-confirm"] .ticker-track { animation: stake-ticker 14s linear infinite; }
                [data-screen="stake-confirm"] .seal-drop {
                    opacity: 0;
                    transform: rotate(-16deg) scale(1.55);
                }
                [data-screen="stake-confirm"] .seal-drop.on {
                    opacity: 1;
                    transform: rotate(-12deg) scale(1);
                    transition: transform 0.45s cubic-bezier(.2,1.4,.3,1), opacity 0.2s ease;
                }
                @media (prefers-reduced-motion: reduce) {
                    [data-screen="stake-confirm"] * { animation: none !important; transition: none !important; }
                }
            `}</style>
        </div>,
        document.body,
    );
};

const OfferLetter: React.FC<{ player: Player; offer: StakeOffer; company: string; seller: string; pct: number }> = ({ player, offer, company, seller, pct }) => (
    <article
        data-testid="stake-offer-letter"
        className="rounded-3xl px-5 sm:px-8 py-6 sm:py-8 shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #f7f1e4 0%, #efe4d0 100%)', color: '#1c1915', fontFamily: paper }}
    >
        <div className="h-1.5 -mx-5 sm:-mx-8 -mt-6 sm:-mt-8 mb-6" style={{ background: 'linear-gradient(90deg, #7c5c28, #e8c547, #7c5c28)' }} />
        <div className="text-[11px] uppercase tracking-[0.28em] text-[#7c5c28]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Offer letter</div>
        <h4 className="text-4xl leading-none mt-2" style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif' }}>Share purchase</h4>
        <p className="mt-2 text-lg italic text-[#5c5346]">{company} · week {player.currentWeek}</p>
        <p className="mt-4 text-base leading-relaxed">
            {offer.name} offers {formatCompact(offer.amount)} for {pct}% of {company}. {seller} would keep the rest until the papers are signed. The cheque is paid into company cash only at the final signature. Personal cash does not move.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
            {[
                ['Stake', `${pct}%`],
                ['Price', formatCompact(offer.amount)],
                ['Buyer', offer.name],
                ['Whole company at this price', formatCompact(impliedValuation(offer.amount, offer.pct))],
            ].map(([label, value]) => (
                <div key={label} className="border-t border-[#1c1915]/15 pt-2">
                    <div className="text-[10px] uppercase tracking-wider text-[#7a7164]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</div>
                    <div className="text-2xl leading-tight mt-1">{value}</div>
                </div>
            ))}
        </div>
        <p className="mt-4 text-sm text-[#5c5346]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {buyerKindLabel(offer.kind)}. This page is the offer. Nothing is signed here, and no money moves.
        </p>
    </article>
);

const HandshakeRoom: React.FC<{
    offer: StakeOffer;
    pct: number;
    shook: boolean;
    news: boolean;
    ticker: string;
    reduce: boolean;
    onShake: () => void;
}> = ({ offer, pct, shook, news, ticker, reduce, onShake }) => {
    const motion = shook ? (reduce ? 'is-done' : 'is-shaking') : '';
    const flashes = shook && !reduce;
    return (
        <div className="space-y-3">
            <div
                data-testid="stake-handshake-room"
                data-shook={shook ? 'yes' : 'no'}
                className="relative h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-white/10"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, #4a3428 0%, #1a120e 42%, #090807 100%)' }}
            >
                <svg viewBox="0 0 640 420" className="absolute inset-0 w-full h-full" aria-hidden="true">
                    <defs>
                        <linearGradient id="stake-sky" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#1d3557" />
                            <stop offset="1" stopColor="#0b1220" />
                        </linearGradient>
                        <linearGradient id="stake-wood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#8a5a38" />
                            <stop offset="1" stopColor="#3d2416" />
                        </linearGradient>
                        <radialGradient id="stake-lamp" cx="50%" cy="0%" r="60%">
                            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.55" />
                            <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <rect x="150" y="28" width="340" height="150" rx="8" fill="url(#stake-sky)" stroke="#c9a36a" strokeWidth="6" />
                    <g fill="#0e1726">
                        <rect x="176" y="92" width="28" height="86" />
                        <rect x="214" y="70" width="22" height="108" />
                        <rect x="246" y="104" width="36" height="74" />
                        <rect x="292" y="58" width="18" height="120" />
                        <rect x="320" y="88" width="40" height="90" />
                        <rect x="372" y="76" width="24" height="102" />
                        <rect x="406" y="100" width="32" height="78" />
                        <rect x="448" y="84" width="20" height="94" />
                    </g>
                    <g fill="#ffd27a" opacity="0.85">
                        <rect x="224" y="86" width="6" height="8" />
                        <rect x="300" y="78" width="5" height="7" />
                        <rect x="338" y="110" width="6" height="8" />
                        <rect x="384" y="96" width="5" height="7" />
                    </g>
                    <ellipse cx="320" cy="36" rx="70" ry="28" fill="url(#stake-lamp)" />
                    <rect x="312" y="8" width="16" height="22" fill="#d7b56a" />
                    <ellipse cx="320" cy="248" rx="240" ry="52" fill="url(#stake-wood)" />
                    <ellipse cx="320" cy="236" rx="214" ry="30" fill="#c48a58" opacity="0.35" />
                    <g>
                        <path d="M292 96c2-28 18-40 28-40s26 12 28 40c8 4 16 16 14 28-4 8-14 10-22 8 2 10-2 18-20 18s-22-8-20-18c-8 2-18 0-22-8-2-12 6-24 14-28z" fill="#1c1915" />
                        <circle cx="320" cy="112" r="24" fill="#efc7aa" />
                        <circle cx="311" cy="110" r="2.2" fill="#1c1915" />
                        <circle cx="329" cy="110" r="2.2" fill="#1c1915" />
                        <path d="M312 122c4 5 12 5 16 0" stroke="#a15b45" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                        <path d="M278 168c10-26 22-36 42-36s32 10 42 36l8 46H270z" fill="#172033" />
                        <path d="M304 150h32l8 28h-48z" fill="#f6f1e6" />
                        <path d="M320 154l-7 24h14z" fill="#9f1239" />
                    </g>
                    <g>
                        <circle cx="320" cy="292" r="30" fill="#3a2c24" />
                        <path d="M258 360c6-48 28-70 62-70s56 22 62 70z" fill="#1c2430" />
                        <path d="M294 274c6-14 16-20 26-20s20 6 26 20" fill="#4a382e" />
                    </g>
                    <g>
                        <rect x="246" y="214" width="148" height="40" rx="6" fill="#f7f1e4" />
                        <text x="320" y="230" textAnchor="middle" fontSize="11" fontFamily="Inter, sans-serif" fill="#7a7164">{offer.name.slice(0, 16)}</text>
                        <text x="320" y="246" textAnchor="middle" fontSize="14" fontFamily="Inter, sans-serif" fill="#1c1915">{pct}%</text>
                    </g>
                    <g fill="#d7d2c8">
                        <rect x="36" y="188" width="46" height="28" rx="5" />
                        <circle cx="58" cy="202" r="9" fill="#1a1a1a" />
                        <rect x="28" y="192" width="12" height="10" rx="2" />
                        <rect x="558" y="188" width="46" height="28" rx="5" />
                        <circle cx="580" cy="202" r="9" fill="#1a1a1a" />
                        <rect x="600" y="192" width="12" height="10" rx="2" />
                    </g>
                </svg>
                <div className={`hand-buyer ${motion} absolute w-16 h-16 pointer-events-none`} aria-hidden="true">
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                        <ellipse cx="30" cy="22" rx="18" ry="10" fill="#e7b898" />
                        <rect x="14" y="24" width="6" height="22" rx="3" fill="#efc7aa" />
                        <rect x="22" y="26" width="6" height="26" rx="3" fill="#efc7aa" />
                        <rect x="30" y="24" width="6" height="24" rx="3" fill="#efc7aa" />
                        <rect x="38" y="28" width="6" height="16" rx="3" fill="#efc7aa" />
                    </svg>
                </div>
                <div className={`hand-you ${motion} absolute w-16 h-16 pointer-events-none`} aria-hidden="true">
                    <svg viewBox="0 0 64 64" className="w-full h-full">
                        <ellipse cx="32" cy="42" rx="18" ry="10" fill="#c99578" />
                        <rect x="16" y="14" width="6" height="22" rx="3" fill="#d7a88a" />
                        <rect x="24" y="10" width="6" height="26" rx="3" fill="#d7a88a" />
                        <rect x="32" y="14" width="6" height="24" rx="3" fill="#d7a88a" />
                        <rect x="40" y="18" width="6" height="16" rx="3" fill="#d7a88a" />
                    </svg>
                </div>
                {flashes && (
                    <>
                        <span className="cam-flash absolute left-10 bottom-16 w-28 h-28 rounded-full" style={{ background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%)' }} />
                        <span className="cam-flash absolute right-8 bottom-24 w-32 h-32 rounded-full" style={{ animationDelay: '0.18s', background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%)' }} />
                        <span className="cam-flash absolute left-1/3 top-10 w-40 h-40 rounded-full" style={{ animationDelay: '0.32s', background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 68%)' }} />
                    </>
                )}
                <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-[10px] uppercase tracking-wider text-[#FFC44D]">
                    {buyerKindLabel(offer.kind)} across the table
                </div>
                <div
                    data-testid="stake-ticker"
                    data-live={news ? 'yes' : 'no'}
                    className="absolute left-0 right-0 bottom-0 overflow-hidden border-t border-black/40"
                    style={{ background: '#7f1d1d' }}
                >
                    {news ? (
                        reduce ? (
                            <p className="px-3 py-2 text-sm font-bold text-white">{ticker}</p>
                        ) : (
                            <div className="ticker-track flex w-max">
                                <p className="px-6 py-2 text-sm font-bold text-white whitespace-nowrap">{ticker} · {ticker}</p>
                                <p className="px-6 py-2 text-sm font-bold text-white whitespace-nowrap">{ticker} · {ticker}</p>
                            </div>
                        )
                    ) : (
                        <p className="px-3 py-2 text-sm text-rose-100">The wire is quiet until the handshake.</p>
                    )}
                </div>
            </div>
            <div>
                <button
                    type="button"
                    data-testid="stake-haath-milao"
                    onClick={onShake}
                    disabled={shook}
                    className="w-full sm:w-auto px-5 py-3 rounded-full bg-[#FFC44D] text-black text-sm font-black uppercase tracking-wider disabled:opacity-60"
                >
                    {shook ? 'Haath mil gaye' : 'Haath milao'}
                </button>
                <p className="text-xs text-zinc-500 mt-1">
                    {shook ? 'The handshake is done. No money moved.' : 'Shakes hands with the buyer across the table. No money moves.'}
                </p>
            </div>
        </div>
    );
};

const Shartein: React.FC<{ offer: StakeOffer }> = ({ offer }) => (
    <div data-testid="stake-shartein" className="space-y-3">
        <p className="text-sm text-zinc-300">These are the conditions {offer.name} wants on the {pointsOf(offer.pct)}% stake. They are not paid here.</p>
        {offer.conditions.length === 0 && (
            <article className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                <div className="text-[11px] uppercase tracking-wider text-[#FFC44D]">No extra conditions</div>
                <p className="text-lg mt-2">The price is the whole deal.</p>
            </article>
        )}
        {offer.conditions.map((condition, index) => (
            <article key={condition.kind} className="rounded-3xl border border-[#FFC44D]/30 bg-gradient-to-br from-[#1c160e] to-[#12151c] p-4 grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <div className="w-10 h-10 rounded-full border border-[#FFC44D] text-[#FFC44D] grid place-items-center font-black">{index + 1}</div>
                <div>
                    <div className="text-lg font-black leading-tight">{condition.label}</div>
                    <p className="text-sm text-zinc-400 mt-1">{condition.effect}</p>
                </div>
            </article>
        ))}
    </div>
);

const LawyerStamp: React.FC<{ stamped: boolean; reduce: boolean; onStamp: () => void }> = ({ stamped, reduce, onStamp }) => (
    <div data-testid="stake-lawyer-stamp" className="space-y-3">
        <div
            className="relative min-h-[280px] rounded-3xl px-5 py-6 overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #f7f1e4 0%, #efe4d0 100%)', color: '#1c1915' }}
        >
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#7c5c28]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Counsel</div>
            <h4 className="text-3xl mt-1" style={{ fontFamily: paper }}>Terms for the file</h4>
            <div className="mt-4 space-y-2">
                {['Price and percent as written', 'Conditions travel with the shares', 'Cheque waits for the last signature'].map(line => (
                    <div key={line} className="h-8 border-b border-[#1c1915]/15 text-sm text-[#5c5346] flex items-end" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{line}</div>
                ))}
            </div>
            <div
                data-testid="lawyer-seal"
                aria-hidden={!stamped}
                className={`seal-drop ${stamped ? 'on' : ''} absolute right-6 top-16 grid place-items-center text-center pointer-events-none`}
                style={{
                    width: 118,
                    height: 118,
                    borderRadius: 999,
                    border: '4px solid #9f1239',
                    color: '#9f1239',
                    background: 'rgba(247,241,228,0.92)',
                    fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                    letterSpacing: '0.08em',
                    fontSize: 22,
                    lineHeight: 0.9,
                    opacity: reduce && stamped ? 1 : undefined,
                    transform: reduce && stamped ? 'rotate(-12deg) scale(1)' : undefined,
                }}
            >
                COUNSEL
            </div>
        </div>
        <div>
            <button
                type="button"
                data-testid="stake-stamp"
                onClick={onStamp}
                disabled={stamped}
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-white text-black text-sm font-black uppercase tracking-wider disabled:opacity-60"
            >
                {stamped ? 'Stamped' : 'Stamp'}
            </button>
            <p className="text-xs text-zinc-500 mt-1">
                {stamped ? 'Counsel has stamped the terms. No money moved.' : 'Presses the lawyer seal onto the terms. No money moves.'}
            </p>
        </div>
    </div>
);

const FinalSign: React.FC<{ offer: StakeOffer; company: string; pct: number; pending: boolean; onSign: () => void }> = ({ offer, company, pct, pending, onSign }) => (
    <div data-testid="stake-final-sign" className="rounded-3xl border border-white/10 bg-[#12151c] p-4 sm:p-5">
        <p className="text-sm text-zinc-300">
            {offer.name} buys {pct}% of {company} for {formatCompact(offer.amount)}. Signing pays that into company cash. Your personal cash stays put.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 p-3">
                <div className="h-10 border-b border-white/20" style={{ fontFamily: paper, fontSize: 28, color: '#9ecbff' }}>{pending ? 'signed' : ''}</div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mt-2">Founder</div>
            </div>
            <div className="rounded-2xl border border-white/10 p-3">
                <div className="h-10 border-b border-white/20" style={{ fontFamily: paper, fontSize: 28, color: '#f0c98a' }}>{pending ? 'signed' : ''}</div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mt-2">{offer.name}</div>
            </div>
        </div>
        <div className="mt-4">
            <button
                type="button"
                data-testid="stake-sign"
                onClick={onSign}
                disabled={pending}
                className="w-full sm:w-auto px-5 py-3 rounded-full bg-white text-black text-sm font-black uppercase tracking-wider disabled:opacity-60"
            >
                {pending ? 'Signing' : 'Sign'}
            </button>
            <p className="text-xs text-zinc-500 mt-1">Opens the signature. Company cash rises only when that signing finishes. Personal cash does not move.</p>
        </div>
    </div>
);
