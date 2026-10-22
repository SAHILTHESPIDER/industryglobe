import React, { useEffect, useState } from 'react';
import { Player } from '../../types';
import { formatCompact } from '../../services/ownPlatform/logic';
import { debtPicture, repayLoan } from '../../services/loanLogic';
import {
    advanceBook,
    beginIpo,
    chooseDisclosure,
    closeBook,
    fileWithRegulator,
    finishTradingDay,
    goOnAir,
    leaveVote,
    moveResolution,
    publishBand,
    fairSharePrice,
    quoteValuation,
    setIpoTerms,
    submitForVote,
    voteCarried,
} from '../../services/ownPlatform/studio';
import { headingFont } from './ui';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

export const Boardroom: React.FC<Props> = ({ player, onPlayer }) => {
    const state = player.ownPlatform;
    const ipo = state?.ipo;
    const [error, setError] = useState('');
    const [floor, setFloor] = useState(ipo?.floor || 10);
    const [cap, setCap] = useState(ipo?.cap || 16);
    useEffect(() => {
        if (!ipo) return;
        setFloor(ipo.floor);
        setCap(ipo.cap);
    }, [ipo?.floor, ipo?.cap, ipo?.stage]);
    if (!state || !ipo) return null;
    const valuation = ipo.valuation || quoteValuation(player);
    const raise = Math.round(ipo.sharesForSale * ipo.price);
    const apply = (result: { player: Player; error?: string } | Player) => {
        if ('player' in result) {
            setError(result.error || '');
            onPlayer(result.player);
            return;
        }
        setError('');
        onPlayer(result);
    };
    const fors = ipo.votes.filter(vote => vote.vote === 'FOR').length;
    const against = ipo.votes.filter(vote => vote.vote === 'AGAINST').length;
    const picture = debtPicture(player);
    const empireLoans = (player.finance?.loans || []).filter(loan => (loan.borrower || 'PERSONAL') === 'EMPIRE' && loan.status !== 'PAID');
    const empireDebt = (state.books?.debt || 0) + empireLoans.reduce((sum, loan) => sum + loan.principal, 0);
    const companyValue = Math.max(quoteValuation(player), 1);
    const debtToEquity = empireDebt / companyValue;
    const facility = state.books?.debt || 0;
    const facilityRate = state.books?.facilityRate || 0.09;
    const facilityWeekly = facility > 0
        ? Math.round(facility * facilityRate / 52) + Math.min(facility, Math.max(25_000, Math.round(facility * 0.02)))
        : 0;

    return (
        <div className="space-y-4" data-screen="boardroom-ipo">
            <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#e8c547]">Minutes of the board · confidential</div>
                <h3 className="text-3xl lg:text-5xl font-black uppercase leading-[0.95]" style={{ fontFamily: headingFont }}>
                    {ipo.stage === 'LISTED' || ipo.stage === 'TRADING' ? `${ipo.ticker} is on the tape` : 'Take the company public'}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Valuation, the filing, the price band, the investors, and the first morning of trading. The cash that lands is the shares you actually sell, in dollars.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4" data-screen="board-debt">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">Empire+ debt</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    <div>
                        <div className="text-[10px] uppercase text-zinc-500">Total company debt</div>
                        <div className="text-xl font-black">{formatCompact(empireDebt)}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-zinc-500">Debt to equity</div>
                        <div className="text-xl font-black">{debtToEquity.toFixed(2)}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-zinc-500">Due this week</div>
                        <div className="text-xl font-black">{formatCompact(empireLoans.reduce((sum, loan) => sum + (loan.status === 'ACTIVE' ? loan.weeklyPayment : 0), 0) + facilityWeekly)}</div>
                    </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Equity for this ratio is the company value, {formatCompact(companyValue)}. Across the whole life it is {formatCompact(picture.total)} of debt against {formatCompact(picture.equity)}.</p>
                {facility > 0 && <p className="text-xs text-zinc-400 mt-2">Bank facility {formatCompact(facility)} · about {formatCompact(facilityWeekly)} leaves the books each week.</p>}
                <div className="mt-3 space-y-2">
                    {empireLoans.length === 0 && facility <= 0 && <p className="text-sm text-zinc-500">No company loans yet. The Bank writes them.</p>}
                    {empireLoans.map(loan => (
                        <div key={loan.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-white/10 px-3 py-2">
                            <div className="min-w-0">
                                <div className="font-bold truncate">{loan.lenderName}</div>
                                <div className="text-xs text-zinc-500">{formatCompact(loan.principal)} left · {formatCompact(loan.weeklyPayment)} / week · {loan.weeksRemaining} weeks · {loan.status}</div>
                            </div>
                            <button
                                onClick={() => apply(repayLoan(player, loan.id, 'BALANCE'))}
                                className="shrink-0 px-3 py-2 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-wider"
                            >
                                Pay off
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {error && <p className="text-rose-300 text-sm">{error}</p>}

            {ipo.stage === 'IDLE' && (
                <Paper>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">{state.name}</div>
                    <div className="text-2xl font-black mt-1">Resolution to proceed with an initial public offering</div>
                    <p className="text-sm text-zinc-600 mt-2">The company would apply to list ordinary shares. Indicated value today is {formatCompact(quoteValuation(player))}.</p>
                    <Gold onClick={() => apply(beginIpo(player))}>Open the resolution</Gold>
                </Paper>
            )}

            {ipo.stage === 'RESOLUTION' && (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
                    <Paper>
                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{state.name} · confidential</div>
                        <h4 className="text-3xl font-black leading-tight mt-2">Resolution to proceed with an initial public offering</h4>
                        <p className="text-sm text-zinc-600 mt-3">It is proposed that the company apply for admission of its ordinary shares, and that new shares be issued for that purpose in a number the founder sets.</p>
                        <div className="mt-4 text-sm text-zinc-700">Indicated valuation {formatCompact(valuation)}. You keep {Math.round(ipo.founderKeepPct * 100)}%.</div>
                        <Gold onClick={() => apply(moveResolution(player))}>Move the resolution</Gold>
                    </Paper>
                    <SideNote title="What the room is deciding" body="Nothing leaves the treasury on this page. Moving the resolution only opens the price." />
                </div>
            )}

            {ipo.stage === 'PRICE' && (
                <div className="grid lg:grid-cols-2 gap-4">
                    <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 space-y-3">
                        <label className="block text-[11px] uppercase tracking-wider text-zinc-500">Share price
                            <input type="number" value={ipo.price} min={1} step={0.5} onChange={(event) => apply(setIpoTerms(player, Number(event.target.value), ipo.sharesForSale))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-3xl font-black" />
                        </label>
                        <label className="block text-[11px] uppercase tracking-wider text-zinc-500">Shares you sell
                            <input type="number" value={ipo.sharesForSale} step={50000} onChange={(event) => apply(setIpoTerms(player, ipo.price, Number(event.target.value)))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-xl font-bold" />
                        </label>
                        <div className="text-sm text-zinc-400">Raising about {formatCompact(raise)} before fees. Fair price from the books is ${fairSharePrice(player).toFixed(2)}.</div>
                        <p className="text-xs text-amber-200">A stretch price makes the CFO and counsel vote against you.</p>
                        <Gold onClick={() => apply(submitForVote(player))}>Submit for sign-off</Gold>
                    </div>
                    <SideNote title="The number has to be lived with" body="Price it like a company you would still want to own the morning after. The vote is the next gate." />
                </div>
            )}

            {ipo.stage === 'VOTE' && (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <div className="text-[11px] uppercase tracking-wider text-zinc-500">Approval of the indicative valuation</div>
                            <div className="text-4xl font-black" style={{ fontFamily: headingFont }}>{formatCompact(valuation)}</div>
                        </div>
                        <div className="text-sm">For {fors} · Against {against} · {voteCarried(ipo) ? 'Carried' : 'Not carried'}</div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {ipo.votes.map(vote => (
                            <div key={vote.name} className={`rounded-2xl px-3 py-3 border ${vote.vote === 'FOR' ? 'border-emerald-400/40 bg-emerald-400/10' : vote.vote === 'AGAINST' ? 'border-rose-400/40 bg-rose-400/10' : 'border-white/10'}`}>
                                <div className="flex justify-between gap-2">
                                    <div>
                                        <div className="font-bold">{vote.name}</div>
                                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{vote.role}</div>
                                    </div>
                                    <div className="text-xs font-black">{vote.vote}</div>
                                </div>
                                <p className="text-xs text-zinc-400 mt-1">{vote.note}</p>
                            </div>
                        ))}
                    </div>
                    <Gold onClick={() => apply(leaveVote(player))}>{voteCarried(ipo) ? 'Next gate' : 'Back to the price'}</Gold>
                </div>
            )}

            {ipo.stage === 'FILING' && (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
                    <Paper>
                        <div className="text-[11px] uppercase tracking-wider text-zinc-500">Form S-1 · {state.name} · proposed symbol {ipo.ticker}</div>
                        <h4 className="text-2xl font-black mt-2">Risk factors</h4>
                        <p className="text-sm text-zinc-600">Tell them, and the number bleeds. Keep it, and it goes in a drawer the regulator is about to open.</p>
                        <div className="space-y-3 mt-4">
                            {ipo.disclosures.map(row => (
                                <div key={row.id} className="border border-zinc-200 rounded-2xl p-3">
                                    <div className="font-bold text-zinc-900">{row.title}</div>
                                    <p className="text-sm text-zinc-600 mt-1">{row.body}</p>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => apply(chooseDisclosure(player, row.id, 'DISCLOSE'))} className={`px-3 py-1 rounded-full text-xs font-bold ${row.choice === 'DISCLOSE' ? 'bg-black text-white' : 'bg-zinc-200'}`}>Disclose</button>
                                        <button onClick={() => apply(chooseDisclosure(player, row.id, 'OMIT'))} className={`px-3 py-1 rounded-full text-xs font-bold ${row.choice === 'OMIT' ? 'bg-black text-white' : 'bg-zinc-200'}`}>Omit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Gold onClick={() => apply(fileWithRegulator(player))}>File with the regulator</Gold>
                    </Paper>
                    <SideNote title="The drawer" body="Omitting two or more factors makes the anchor investor walk. The book still opens. It just opens colder." />
                </div>
            )}

            {ipo.stage === 'BAND' && (
                <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 space-y-3">
                    <p className="text-sm text-zinc-300">You do not sell at one price. You publish a range, and investors bid inside it.</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <label className="text-[11px] uppercase text-zinc-500">Floor
                            <input type="number" value={floor} onChange={(event) => setFloor(Number(event.target.value))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-2xl font-black" />
                        </label>
                        <label className="text-[11px] uppercase text-zinc-500">Cap
                            <input type="number" value={cap} onChange={(event) => setCap(Number(event.target.value))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-2xl font-black" />
                        </label>
                    </div>
                    <p className="text-xs text-amber-200">A range that wide tells the market you do not know what you are worth.</p>
                    <Gold onClick={() => apply(publishBand(player, floor, cap))}>Publish the band</Gold>
                </div>
            )}

            {ipo.stage === 'ANCHOR' && (
                <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
                    <div className="rounded-3xl border border-[#e8c547]/30 bg-[#14140f] p-4">
                        <div className="text-[11px] uppercase tracking-wider text-[#e8c547]">The anchor book</div>
                        <p className="text-sm text-zinc-300 mt-2">The day before anyone else can buy, the biggest institutions commit. Their names are published.</p>
                        <div className="mt-4 text-5xl font-black text-[#e8c547]" style={{ fontFamily: headingFont }}>{Math.round(ipo.anchorPct * 100)}%</div>
                        <div className="font-bold mt-2">{ipo.anchorName}</div>
                        <p className="text-sm text-zinc-400">{ipo.anchorWalked ? 'The first choice walked. What is left covered the book without them.' : 'They held. The rest of the book can follow.'}</p>
                        <Gold onClick={() => apply(goOnAir(player))}>Go on air</Gold>
                    </div>
                    <SideNote title="Staff" body={`${Math.round(ipo.staffReservePct * 100)}% of the deal is reserved for the people who built it. It comes off your cheque.`} />
                </div>
            )}

            {ipo.stage === 'BOOK' && (
                <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">The book is open · day {ipo.bookDay} of 3</div>
                    <p className="text-sm text-zinc-400 mt-2">For three days anybody can bid. You cannot advertise, you cannot negotiate, and you cannot stop it.</p>
                    <div className="text-5xl font-black text-emerald-300 mt-3" style={{ fontFamily: headingFont }}>{ipo.bookMultiple.toFixed(2)}×</div>
                    <p className="text-sm text-zinc-400">Anything under 1.00× means there were not enough buyers. The open then prints at the floor.</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {ipo.bookDay < 3 && <Gold onClick={() => apply(advanceBook(player))}>Next day</Gold>}
                        {ipo.bookDay >= 3 && <Gold onClick={() => apply(closeBook(player))}>Close the book</Gold>}
                    </div>
                </div>
            )}

            {(ipo.stage === 'TRADING' || ipo.stage === 'LISTED') && (
                <div className="rounded-3xl border border-white/10 bg-[#0d1410] p-4">
                    <div className="flex justify-between">
                        <div>
                            <div className="text-[11px] uppercase tracking-wider text-emerald-300">{ipo.ticker} · first day</div>
                            <div className="text-4xl font-black text-emerald-300">${ipo.lastPrice.toFixed(2)}</div>
                        </div>
                        <div className="text-sm text-zinc-400">Opened ${ipo.openPrice.toFixed(2)}</div>
                    </div>
                    <div className="mt-4 h-36 flex items-end gap-2">
                        {ipo.dayMove.map((point, index) => {
                            const min = Math.min(...ipo.dayMove) * 0.95;
                            const max = Math.max(...ipo.dayMove) * 1.05;
                            const height = ((point - min) / Math.max(0.01, max - min)) * 100;
                            return <div key={`${point}-${index}`} className="flex-1 bg-emerald-400 rounded-t" style={{ height: `${height}%` }} />;
                        })}
                    </div>
                    <p className="text-sm text-zinc-400 mt-3">The shares are on the phone's Stocks desk under {ipo.ticker}. You can buy more, or sell what the listing left you able to trade.</p>
                    {ipo.stage === 'TRADING' && <Gold onClick={() => apply(finishTradingDay(player))}>The morning after</Gold>}
                </div>
            )}
        </div>
    );
};

const Paper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="rounded-3xl bg-[#f4efe4] text-zinc-900 p-5">{children}</div>
);

const SideNote: React.FC<{ title: string; body: string }> = ({ title, body }) => (
    <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 h-fit">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">{title}</div>
        <p className="text-sm text-zinc-300 mt-2">{body}</p>
    </div>
);

const Gold: React.FC<{ children: React.ReactNode; onClick: () => void }> = ({ children, onClick }) => (
    <button onClick={onClick} className="mt-4 w-full sm:w-auto px-5 py-3 rounded-full bg-[#e8c547] text-black text-xs font-black uppercase tracking-wider">{children}</button>
);
