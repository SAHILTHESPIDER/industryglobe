import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { formatCompact } from '../../services/ownPlatform/logic';

/**
 * Shared signing room. Stake sales use it now.
 * A future listing can pass the same model. Do not special-case the stake sale in here.
 */
export interface DealClause {
    title: string;
    body: string;
}

export interface DealFact {
    label: string;
    value: string;
}

export interface DealSigningModel {
    documentTitle: string;
    company: string;
    sellerName: string;
    sellerRole: string;
    buyerName: string;
    buyerRole: string;
    facts: DealFact[];
    clauses: DealClause[];
    stamp: string;
    /** Ledger line, such as "Stake sale to Netflax". */
    cashLabel: string;
    cashFrom: number;
    cashTo: number;
}

interface Props {
    model: DealSigningModel;
    onComplete: () => void;
}

const paper = '"Instrument Serif", Georgia, serif';
const mono = '"JetBrains Mono", ui-monospace, monospace';

/** Finer than the desk's rounded millions, so the count is visible. */
const countMoney = (amount: number): string => {
    if (!Number.isFinite(amount)) return '$0';
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    return formatCompact(amount);
};

const sellerPath = 'M6 38 C 22 8, 28 52, 48 30 S 78 6, 96 34 128 48, 156 26 190 14, 214 32';
const buyerPath = 'M8 34 C 24 52, 36 12, 58 28 S 88 50, 112 24 148 8, 176 36 200 46, 222 22';

export const DealSigning: React.FC<Props> = ({ model, onComplete }) => {
    const reduce = useReducedMotion();
    const [phase, setPhase] = useState(reduce ? 5 : 0);
    const [shown, setShown] = useState(reduce ? model.cashTo : model.cashFrom);
    const finished = useRef(false);
    const complete = () => {
        if (finished.current) return;
        finished.current = true;
        onComplete();
    };

    useEffect(() => {
        if (reduce) return;
        const timers = [600, 1300, 1900, 2400, 4000].map((delay, index) => (
            window.setTimeout(() => setPhase(index + 1), delay)
        ));
        return () => timers.forEach(window.clearTimeout);
    }, [reduce]);

    useEffect(() => {
        if (phase < 4) return;
        if (reduce) {
            setShown(model.cashTo);
            return;
        }
        const start = performance.now();
        let frame = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 1100);
            const eased = 1 - (1 - t) ** 3;
            setShown(Math.round(model.cashFrom + (model.cashTo - model.cashFrom) * eased));
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [phase, reduce, model.cashFrom, model.cashTo]);

    useEffect(() => {
        if (phase < 5) return;
        const timer = window.setTimeout(complete, reduce ? 2200 : 1800);
        return () => window.clearTimeout(timer);
    }, [phase, reduce]);

    const signedSeller = phase >= 1;
    const signedBuyer = phase >= 2;
    const stamped = phase >= 3;
    const counting = phase >= 4;

    return createPortal(
        <div
            className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center p-0 sm:p-6"
            style={{ background: 'rgba(4, 5, 10, 0.82)' }}
            data-screen="deal-signing"
            data-testid="deal-signing"
            role="dialog"
            aria-label="Signing the contract"
        >
            <button
                type="button"
                data-testid="deal-skip"
                onClick={complete}
                className="absolute top-[max(12px,env(safe-area-inset-top))] right-3 z-10 px-4 py-2 rounded-full border border-white/20 bg-black/50 text-[11px] font-bold uppercase tracking-wider text-white"
            >
                Skip
            </button>
            <motion.article
                initial={reduce ? false : { y: 90, opacity: 0, rotate: -1.4 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 18 }}
                className="relative w-full sm:max-w-xl max-h-[100dvh] sm:max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, #f7f1e4 0%, #efe4d0 100%)',
                    color: '#1c1915',
                    fontFamily: paper,
                }}
            >
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #7c5c28, #e8c547, #7c5c28)' }} />
                <div
                    data-testid="deal-stamp"
                    aria-hidden={!stamped}
                    className="absolute right-4 top-16 sm:right-8 sm:top-20 z-10 grid place-items-center text-center pointer-events-none"
                    style={{
                        width: 118,
                        height: 118,
                        borderRadius: 999,
                        border: '4px solid #9f1239',
                        boxShadow: 'inset 0 0 0 2px rgba(159,18,57,0.35)',
                        color: '#9f1239',
                        background: 'rgba(247,241,228,0.92)',
                        transform: stamped ? 'rotate(-12deg) scale(1)' : 'rotate(-18deg) scale(1.4)',
                        opacity: stamped ? 1 : 0,
                        transition: reduce ? 'none' : 'transform 0.45s cubic-bezier(0.2, 1.4, 0.3, 1), opacity 0.2s ease',
                        fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
                        letterSpacing: '0.08em',
                        fontSize: 22,
                        lineHeight: 0.9,
                    }}
                >
                    {model.stamp}
                </div>
                <div className="px-5 sm:px-8 py-6 sm:py-8 overflow-y-auto flex-1 min-h-0 pr-28 sm:pr-36">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-[#7c5c28]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Private agreement</div>
                    <h2 className="text-4xl sm:text-5xl leading-none mt-2" style={{ fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif' }}>{model.documentTitle}</h2>
                    <p className="mt-2 text-lg italic text-[#5c5346]">{model.company}</p>
                    <p className="mt-2 text-sm text-[#5c5346]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Skip finishes the signing now. The deal still stands, and the money still lands in company cash.</p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {model.facts.map(fact => (
                            <div key={fact.label} className="border-t border-[#1c1915]/15 pt-2">
                                <div className="text-[10px] uppercase tracking-wider text-[#7a7164]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{fact.label}</div>
                                <div className="text-2xl leading-tight mt-1">{fact.value}</div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-base leading-relaxed">
                        {model.sellerName} sells the stake below to {model.buyerName}. The price is paid into company cash. Personal cash does not move.
                    </p>
                    <ol className="mt-4 space-y-3">
                        {model.clauses.map((clause, index) => (
                            <li key={`${clause.title}-${index}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
                                <span className="text-[#7c5c28]">{index + 1}.</span>
                                <span>
                                    <span className="block text-lg leading-tight">{clause.title}</span>
                                    <span className="block text-sm text-[#5c5346] not-italic" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{clause.body}</span>
                                </span>
                            </li>
                        ))}
                        {model.clauses.length === 0 && <li className="text-sm text-[#5c5346]">No extra clauses. The price is the whole deal.</li>}
                    </ol>
                    <div className="mt-6 grid sm:grid-cols-2 gap-4">
                        <Signature name={model.sellerName} role={model.sellerRole} path={sellerPath} drawn={signedSeller} reduce={Boolean(reduce)} />
                        <Signature name={model.buyerName} role={model.buyerRole} path={buyerPath} drawn={signedBuyer} reduce={Boolean(reduce)} />
                    </div>
                </div>
                <div className="shrink-0 border-t border-[#1c1915]/15 px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: '#f3ead8' }}>
                    <div className="min-w-0 flex-1" style={{ opacity: counting || reduce ? 1 : 0.45, transition: reduce ? 'none' : 'opacity 0.3s ease' }}>
                        <div className="text-[10px] uppercase tracking-wider text-[#7a7164]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Company cash</div>
                        <div className="text-3xl" data-testid="deal-cash" data-amount={shown} style={{ fontFamily: mono }}>{countMoney(shown)}</div>
                        <div className="text-sm text-[#5c5346]" data-testid="deal-cash-label">{model.cashLabel}</div>
                    </div>
                    {phase >= 5 && (
                        <button
                            type="button"
                            data-testid="deal-done"
                            onClick={complete}
                            className="px-4 py-3 rounded-full bg-[#1c1915] text-[#f7f1e4] text-xs font-bold uppercase tracking-wider"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                        >
                            Back to the desk
                        </button>
                    )}
                </div>
            </motion.article>
            <style>{`
                @media (prefers-reduced-motion: reduce) {
                    [data-screen="deal-signing"] * { animation: none !important; transition: none !important; }
                }
            `}</style>
        </div>,
        document.body,
    );
};

const Signature: React.FC<{ name: string; role: string; path: string; drawn: boolean; reduce: boolean }> = ({ name, role, path, drawn, reduce }) => (
    <div>
        <svg viewBox="0 0 230 58" className="w-full h-14" aria-hidden="true">
            <path
                d={path}
                fill="none"
                stroke="#1a2744"
                strokeWidth="2.2"
                strokeLinecap="round"
                style={{
                    strokeDasharray: 420,
                    strokeDashoffset: drawn ? 0 : 420,
                    transition: reduce ? 'none' : 'stroke-dashoffset 0.85s ease',
                }}
            />
        </svg>
        <div className="border-t border-[#1c1915]/30 pt-1">
            <div className="text-lg leading-none">{name}</div>
            <div className="text-[10px] uppercase tracking-wider text-[#7a7164]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{role}</div>
        </div>
    </div>
);
