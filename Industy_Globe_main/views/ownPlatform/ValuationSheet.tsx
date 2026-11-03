import React, { useMemo, useState } from 'react';
import { Player } from '../../types';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import { borrowerDesk } from '../../services/loanLogic';
import { formatCompact } from '../../services/ownPlatform/logic';
import { AcquisitionQuote, BuyFinancing, quoteAcquisition } from '../../services/ownPlatform/valuation';
import { headingFont } from './ui';

interface Props {
    player: Player;
    dealId: string;
    onClose: () => void;
    onConfirm: (dealId: string, financing: BuyFinancing) => void;
}

const money = (value: number) => formatCompact(Number.isFinite(value) ? value : 0);
const pct = (value: number) => `${Math.round(value * 100)}%`;

export const ValuationSheet: React.FC<Props> = ({ player, dealId, onClose, onConfirm }) => {
    const quote = useMemo(() => quoteAcquisition(player, dealId), [player, dealId]);
    const desk = useMemo(() => borrowerDesk(player, 'EMPIRE'), [player]);
    const [cashInput, setCashInput] = useState('0');
    const [loanInput, setLoanInput] = useState('0');
    if (!quote) {
        return (
            <Scrim onClose={onClose}>
                <p className="text-sm text-zinc-300">That company is not on the block.</p>
            </Scrim>
        );
    }
    const cash = Math.max(0, Math.floor(Number(cashInput.replace(/[^0-9]/g, '')) || 0));
    const loan = Math.max(0, Math.floor(Number(loanInput.replace(/[^0-9]/g, '')) || 0));
    const company = readCompanyCash(player);
    const covered = Math.min(cash, company) + Math.min(loan, desk.capacity);
    const short = Math.max(0, quote.equityCheque - covered);
    const blocked = !quote.regulator.ok || !quote.board.ok || short > 0 || cash > company || loan > desk.capacity;
    const reason = !quote.regulator.ok
        ? quote.regulator.reason
        : !quote.board.ok
            ? 'The board voted against a change of control at this size.'
            : cash > company
                ? 'The cash line is larger than company cash. Invest your own money first if you want to add more.'
                : loan > desk.capacity
                    ? `Empire+ can borrow ${money(desk.capacity)}.`
                    : short > 0
                        ? `Still short ${money(short)}.`
                        : 'The filing can go in.';

    return (
        <Scrim onClose={onClose}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#FFC44D]">Valuation · not a sticker price</div>
            <h3 className="text-3xl sm:text-4xl font-black uppercase leading-none mt-1" style={{ fontFamily: headingFont }}>{quote.name}</h3>
            <p className="text-sm text-zinc-400 mt-2">{quote.note}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                <Cell label="Equity cheque" value={money(quote.equityCheque)} />
                <Cell label="Control premium" value={pct(quote.controlPremiumPct)} />
                <Cell label="Debt you assume" value={money(quote.assumedDebt)} />
                <Cell label={quote.kind === 'LISTED' ? 'Market cap' : 'Implied equity'} value={money(quote.kind === 'LISTED' ? quote.marketCap : Math.max(0, quote.fundamentalValue - quote.netDebt))} />
                <Cell label="Enterprise value" value={money(quote.enterpriseValue)} />
                <Cell label="Net debt" value={money(quote.netDebt)} />
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 divide-y divide-white/10 text-sm">
                <Row label={quote.kind === 'LISTED' ? `Share price × ${quote.shares.toLocaleString('en-US')} shares` : 'No public shares'} value={quote.kind === 'LISTED' ? `${money(quote.sharePrice)} · cap ${money(quote.marketCap)}` : 'Private'} />
                <Row label="Cash" value={money(quote.cash)} />
                <Row label="Debt" value={money(quote.debt)} />
                <Row label={`Revenue ${money(quote.annualRevenue)} × ${quote.revenueMultiple.toFixed(1)}`} value={money(quote.revenueValue)} />
                <Row label={`${quote.subscribersM.toFixed(1)}M subscribers`} value={money(quote.subscriberValue)} />
                <Row label="Catalogue" value={money(quote.catalogueValue)} />
                <Row label={`Growth ${pct(quote.growthPct)}`} value={money(quote.growthValue)} />
                <Row label="Operating value" value={money(quote.fundamentalValue)} />
            </div>
            <div className={`mt-4 rounded-2xl border p-3 text-sm ${quote.regulator.ok ? 'border-emerald-400/30 text-emerald-200' : 'border-rose-400/40 text-rose-200'}`}>
                <div className="text-[10px] uppercase tracking-wider">{quote.regulator.ok ? 'Regulator' : 'Regulator blocks the filing'}</div>
                {quote.regulator.reason}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quote.board.lines.map(line => (
                    <div key={line.name} className={`rounded-xl border px-3 py-2 text-xs ${line.vote === 'FOR' ? 'border-emerald-400/30' : 'border-rose-400/30'}`}>
                        <div className="flex justify-between gap-2 font-bold"><span className="truncate">{line.name}</span><span>{line.vote}</span></div>
                        <div className="text-zinc-500">{line.role}</div>
                        <div className="text-zinc-400 mt-1">{line.note}</div>
                    </div>
                ))}
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500">Company cash
                    <input value={cashInput} inputMode="numeric" onChange={(event) => setCashInput(event.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-base" />
                    <span className="block text-zinc-600 normal-case tracking-normal mt-1">Company has {money(company)}. Your personal cash is separate.</span>
                </label>
                <label className="text-[10px] uppercase tracking-wider text-zinc-500">Empire+ loan
                    <input value={loanInput} inputMode="numeric" onChange={(event) => setLoanInput(event.target.value)} className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-base" />
                    <span className="block text-zinc-600 normal-case tracking-normal mt-1">Room {money(desk.capacity)}</span>
                </label>
            </div>
            <p className="text-xs text-zinc-400 mt-3">Need a bigger cheque? Sell a stake from the cap table first. That money lands in company cash. This sheet does not sell shares on its own.</p>
            <p className="text-xs text-zinc-400 mt-3">{reason} Covered {money(covered)} of {money(quote.equityCheque)}. Assumed debt is extra and starts billing the week after close.</p>
            <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2">
                <button onClick={onClose} className="px-4 py-3 rounded-full border border-white/15 text-xs font-bold uppercase tracking-wider">Close</button>
                <button
                    disabled={blocked}
                    onClick={() => onConfirm(dealId, { cash: Math.min(cash, quote.equityCheque), loan, equity: false })}
                    className="px-4 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-40"
                >
                    {blocked ? 'Cannot close' : `File the purchase · ${money(quote.equityCheque)}`}
                </button>
            </div>
        </Scrim>
    );
};

const Scrim: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
    <div className="fixed inset-0 z-[240] bg-black/75 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
        <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#12151c] p-4 sm:p-6" onClick={(event) => event.stopPropagation()} data-screen="valuation-sheet">
            {children}
        </div>
    </div>
);

const Cell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-2xl bg-white/5 px-3 py-2 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</div>
        <div className="font-black text-sm sm:text-base break-words">{value}</div>
    </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between gap-3 px-3 py-2">
        <span className="text-zinc-400 min-w-0">{label}</span>
        <span className="font-bold shrink-0">{value}</span>
    </div>
);

export type { AcquisitionQuote };
