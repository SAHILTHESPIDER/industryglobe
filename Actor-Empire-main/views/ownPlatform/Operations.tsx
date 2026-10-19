import React, { useState } from 'react';
import { Player } from '../../types';
import { LAUNCH_REGIONS, MARKET_COUNTRIES } from '../../services/ownPlatform/catalog';
import { formatCompact, formatPeople, quoteLaunch } from '../../services/ownPlatform/logic';
import {
    FACILITY_USD,
    PE_NAME,
    PE_STAKE,
    chooseFunding,
    listCommissions,
    listPlatformDeals,
    purchasePlatform,
    quoteValuation,
    resolveCommission,
    revenueSplit,
    titleRows,
} from '../../services/ownPlatform/studio';
import { Boardroom } from './Boardroom';
import { headingFont } from './ui';

type Desk = 'content' | 'network' | 'audience' | 'board';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

export const Operations: React.FC<Props> = ({ player, onPlayer }) => {
    const [desk, setDesk] = useState<Desk>('board');
    const [error, setError] = useState('');
    const state = player.ownPlatform;
    if (!state) return null;
    const books = state.books;
    const quote = quoteLaunch(player);
    const apply = (result: { player: Player; error?: string }) => {
        setError(result.error || '');
        if (!result.error) onPlayer(result.player);
        else if (result.player !== player) onPlayer(result.player);
    };

    return (
        <div className="p-4 lg:p-10 space-y-4" data-screen="operations">
            <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#ff4d4d]">Operations</div>
                <h2 className="text-4xl lg:text-6xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>Run {state.name}</h2>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Content Desk, Network, Audience, and the Boardroom. Each one is a different side of the same company.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto">
                {([
                    ['content', 'Content Desk'],
                    ['network', 'Network'],
                    ['audience', 'Audience'],
                    ['board', 'Boardroom'],
                ] as [Desk, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => { setDesk(id); setError(''); }} className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider ${desk === id ? 'bg-[#ff3b30] text-white' : 'bg-white/5 text-zinc-400'}`}>{label}</button>
                ))}
            </div>
            {error && <p className="text-rose-300 text-sm">{error}</p>}
            {desk === 'content' && <ContentDesk player={player} onApply={apply} />}
            {desk === 'network' && <NetworkDesk player={player} quoteHouseholds={quote.households} burn={quote.weeklyBurn} />}
            {desk === 'audience' && <AudienceDesk player={player} />}
            {desk === 'board' && (
                <div className="space-y-8">
                    <FinanceDesk player={player} onApply={apply} valuation={quoteValuation(player)} />
                    <AcquireDesk player={player} onApply={apply} />
                    <Boardroom player={player} onPlayer={onPlayer} />
                </div>
            )}
            {books && desk !== 'board' && (
                <p className="text-xs text-zinc-500">Funding {books.funding.toLowerCase()} · debt {formatCompact(books.debt)} · outside owners {Math.round(books.equitySoldPct * 100)}%</p>
            )}
        </div>
    );
};

const ContentDesk: React.FC<{ player: Player; onApply: (result: { player: Player; error?: string }) => void }> = ({ player, onApply }) => {
    const orders = listCommissions(player);
    const state = player.ownPlatform!;
    return (
        <div className="space-y-4">
            <p className="text-sm text-zinc-400 max-w-2xl">Studios and streamers send commission orders. Accepting pays 25% now. The production cap funds the film. It is not studio income. Passing closes the note.</p>
            <div className="grid lg:grid-cols-2 gap-3">
                {orders.map(order => (
                    <article key={order.id} className="rounded-3xl border border-white/10 bg-[#12151c] overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between" style={{ background: order.color }}>
                            <div className="font-black">{order.studio}</div>
                            <div className="text-[11px] uppercase tracking-wider">Commission order</div>
                        </div>
                        <div className="p-4">
                            <div className="text-2xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>{order.title}</div>
                            <div className="text-xs text-zinc-500 mt-1">{order.genre} · {order.kind}</div>
                            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mt-4">Producer fee</div>
                            <div className="text-4xl font-black" style={{ color: order.color }}>{formatCompact(order.fee)}</div>
                            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                <div><div className="text-[10px] uppercase text-zinc-500">Production cap</div>{formatCompact(order.cap)}</div>
                                <div><div className="text-[10px] uppercase text-zinc-500">Minimum rating</div>{order.minRating.toFixed(1)} IMDb</div>
                                <div><div className="text-[10px] uppercase text-zinc-500">Delivery</div>{order.weeks}+ weeks</div>
                                <div><div className="text-[10px] uppercase text-zinc-500">Now / later</div>25% / 75%</div>
                            </div>
                            <p className="text-xs text-zinc-500 mt-3">The production cap funds the film. It is not studio income. {order.blurb}</p>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => onApply(resolveCommission(player, order.id, true))} className="flex-1 py-3 rounded-full font-black uppercase tracking-wider text-xs text-white" style={{ background: order.color }}>Accept commission</button>
                                <button onClick={() => onApply(resolveCommission(player, order.id, false))} className="px-4 py-3 rounded-full border border-white/15 text-xs uppercase tracking-wider">Pass</button>
                            </div>
                        </div>
                    </article>
                ))}
                {orders.length === 0 && <p className="text-sm text-zinc-500">The inbox is clear.</p>}
            </div>
            <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">On the shelf</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {state.catalogue.length === 0 && <p className="text-sm text-zinc-500">No titles yet. Accept a commission or add one in the launch catalogue.</p>}
                    {state.catalogue.map(row => (
                        <div key={row.id} className="rounded-2xl border border-white/10 px-3 py-2">
                            <div className="font-bold">{row.title}</div>
                            <div className="text-[11px] text-zinc-500">{row.genre} · {row.language} · {row.source}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const NetworkDesk: React.FC<{ player: Player; quoteHouseholds: number; burn: number }> = ({ player, quoteHouseholds, burn }) => {
    const state = player.ownPlatform!;
    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div className="space-y-3">
                <p className="text-sm text-zinc-400">Servers sit by region. Construction and the weekly burn are the same numbers the build page signs.</p>
                {state.regions.length === 0 && <p className="text-sm text-zinc-500">Add a day-one market first. The network only has a region once a country is on the opening slate.</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                    {state.regions.map(region => {
                        const name = LAUNCH_REGIONS.find(row => row.id === region.regionId)?.name || region.regionId;
                        const boxes = region.scout + region.workhorse + region.titan;
                        return (
                            <div key={region.regionId} className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                                <div className="text-[11px] uppercase tracking-wider text-zinc-500">{name}</div>
                                <div className="text-3xl font-black" style={{ fontFamily: headingFont }}>{boxes}</div>
                                <div className="text-xs text-zinc-400">{region.scout} scout · {region.workhorse} workhorse · {region.titan} titan</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4 h-fit">
                <div className="text-[11px] uppercase text-zinc-500">Stage</div>
                <div className="text-2xl font-black uppercase" style={{ fontFamily: headingFont }}>{state.stage}</div>
                <div className="text-sm text-zinc-400 mt-2">Forecast homes {formatPeople(quoteHouseholds)}</div>
                <div className="text-sm text-zinc-400">Weekly burn {formatCompact(burn)}</div>
                <div className="text-sm text-zinc-400">Cloud racks {state.cloud.reduce((sum, row) => sum + row.racks, 0)}</div>
            </div>
        </div>
    );
};

const AudienceDesk: React.FC<{ player: Player }> = ({ player }) => {
    const state = player.ownPlatform!;
    const countries = MARKET_COUNTRIES.filter(row => state.selectedCountryIds.includes(row.id));
    return (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div className="grid sm:grid-cols-2 gap-3">
                <Metric label="Subscribers" value={formatPeople(state.subscribers)} />
                <Metric label="Piracy" value={`${Math.round(state.piracyShare * 100)}%`} />
                <Metric label="Customer pressure" value={`${Math.round(state.customerPressure)}`} />
                <Metric label="Weeks on air" value={String(state.weeksLive)} />
                {countries.map(country => (
                    <div key={country.id} className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                        <div className="font-bold">{country.flag} {country.name}</div>
                        <div className="text-xs text-zinc-400">{formatPeople(country.audienceM * 1_000_000)} possible · {country.languages.map(language => language.name).join(', ')}</div>
                    </div>
                ))}
                {countries.length === 0 && <p className="text-sm text-zinc-500">No day-one market yet.</p>}
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                <div className="text-[11px] uppercase text-zinc-500">This week</div>
                <p className="text-sm text-zinc-300 mt-2">{state.pulse.headline}</p>
                <div className="text-xs text-zinc-500 mt-3">Owned services</div>
                {(state.ownedStreamers || []).length === 0 && <p className="text-sm text-zinc-500">You have not bought another platform.</p>}
                {(state.ownedStreamers || []).map(row => (
                    <div key={row.id} className="mt-2 text-sm">{row.name} · {row.householdsM.toFixed(1)}M homes · {formatCompact(row.pricePaid)}</div>
                ))}
            </div>
        </div>
    );
};

const FinanceDesk: React.FC<{ player: Player; onApply: (result: { player: Player; error?: string }) => void; valuation: number }> = ({ player, onApply, valuation }) => {
    const state = player.ownPlatform!;
    const books = state.books;
    const titles = titleRows(player);
    const lanes = revenueSplit(player);
    const last = books?.history[books.history.length - 1];
    const profit = (state.lastWeeklyRevenue || 0) - (state.lastWeeklyBurn || 0);
    const founder = Math.max(0, 1 - (books?.equitySoldPct || 0) - (state.ipo?.stage === 'LISTED' ? (1 - (state.ipo?.founderKeepPct || 0.75)) : 0));
    return (
        <div className="space-y-4" data-screen="studio-finance">
            <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#ff4d4d]">Studio finance</div>
                <h3 className="text-3xl lg:text-5xl font-black uppercase leading-none" style={{ fontFamily: headingFont }}>The company, in dollars</h3>
                <p className="text-sm text-zinc-400 mt-2 max-w-2xl">Cash still lives in the treasury. This desk tracks profit, burn, debt, titles, markets, and who owns the company. Build slowly with your own capital, draw a bank facility, or sell a stake.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Metric label="Treasury" value={formatCompact(player.money)} />
                <Metric label="Last receipts" value={formatCompact(state.lastWeeklyRevenue)} />
                <Metric label="Burn" value={formatCompact(state.lastWeeklyBurn)} />
                <Metric label="Profit" value={formatCompact(profit)} />
                <Metric label="Debt" value={formatCompact(books?.debt || 0)} />
                <Metric label="Debt pressure" value={books && books.debt > 0 ? `${Math.round((books.facilityRate || 0.09) * 100)}% / year` : 'None'} />
                <Metric label="Valuation" value={formatCompact(valuation)} />
                <Metric label="Outside owners" value={`${Math.round((books?.equitySoldPct || 0) * 100)}%`} />
            </div>
            <div className="grid lg:grid-cols-3 gap-3">
                <Choice title="Own capital" body="No new money. Commissioning spends the treasury you already have." action="Build from the treasury" onClick={() => onApply(chooseFunding(player, 'OWN'))} />
                <Choice title="Bank facility" body={books?.debt ? `${formatCompact(books.debt)} is still outstanding. A payment leaves every week.` : `Draw ${formatCompact(FACILITY_USD)}. Interest and a paydown leave every week until the balance is gone.`} action={books?.debt ? 'Facility is open' : 'Draw the facility'} onClick={() => onApply(chooseFunding(player, 'BANK'))} />
                <Choice title="Private equity" body={books?.equitySoldPct ? `${books.pePartner} already owns ${Math.round(books.equitySoldPct * 100)}%.` : `${PE_NAME} buys ${Math.round(PE_STAKE * 100)}% at a discount to the ${formatCompact(valuation)} valuation and takes that share of weekly profit.`} action={books?.equitySoldPct ? 'Stake already sold' : 'Sell the stake'} onClick={() => onApply(chooseFunding(player, 'EQUITY'))} />
            </div>
            <div className="grid lg:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                    <div className="text-[11px] uppercase text-zinc-500">Title performance</div>
                    {titles.length === 0 && <p className="text-sm text-zinc-500 mt-2">No title has earned a week yet.</p>}
                    {titles.map(row => (
                        <div key={row.title} className="flex justify-between gap-3 text-sm mt-2">
                            <span>{row.title} <span className="text-zinc-500">{row.source}</span></span>
                            <span>{formatCompact(row.weekly)}</span>
                        </div>
                    ))}
                </div>
                <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                    <div className="text-[11px] uppercase text-zinc-500">Revenue sources</div>
                    {lanes.length === 0 && <p className="text-sm text-zinc-500 mt-2">Receipts start when the service is live.</p>}
                    {lanes.map(row => (
                        <div key={row.lane} className="flex justify-between text-sm mt-2"><span>{row.lane}</span><span>{formatCompact(row.amount)}</span></div>
                    ))}
                    <div className="text-[11px] uppercase text-zinc-500 mt-4">Ownership</div>
                    <div className="text-sm mt-1">You {Math.round(founder * 100)}% · {books?.pePartner || 'Partners'} {Math.round((books?.equitySoldPct || 0) * 100)}% {state.ipo?.stage === 'LISTED' ? `· public float on ${state.ipo.ticker}` : ''}</div>
                    {last && <div className="text-xs text-zinc-500 mt-2">Last closed week profit {formatCompact(last.profit)}</div>}
                </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                <div className="text-[11px] uppercase text-zinc-500">Transactions</div>
                {(books?.lines || []).length === 0 && <p className="text-sm text-zinc-500 mt-2">No company transactions yet.</p>}
                <div className="divide-y divide-white/5">
                    {(books?.lines || []).slice(0, 8).map(line => (
                        <div key={line.id} className="flex justify-between gap-3 py-2 text-sm">
                            <span>W{line.week} · {line.label}</span>
                            <span className={line.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatCompact(line.amount)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AcquireDesk: React.FC<{ player: Player; onApply: (result: { player: Player; error?: string }) => void }> = ({ player, onApply }) => {
    const deals = listPlatformDeals(player);
    return (
        <div className="space-y-3">
            <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#ff4d4d]">Buy another service</div>
                <h3 className="text-3xl font-black uppercase" style={{ fontFamily: headingFont }}>Purchase a streaming platform</h3>
                <p className="text-sm text-zinc-400 mt-1 max-w-2xl">The same cheque you would write from Stocks. Shares you already hold cheapen a listed buyer. Regional and emerging rivals can be bought outright. Global desks are not for sale.</p>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {deals.map(deal => {
                    const short = player.money < deal.price;
                    return (
                        <div key={deal.id} className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
                            <div className="font-bold text-lg">{deal.name}</div>
                            <div className="text-xs text-zinc-500">{deal.householdsM.toFixed(1)}M homes · {deal.note}</div>
                            <div className="text-2xl font-black mt-2">{formatCompact(deal.price)}</div>
                            <button disabled={short} onClick={() => onApply(purchasePlatform(player, deal.id))} className="mt-3 w-full py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider disabled:opacity-40">
                                {short ? 'Short of cash' : 'Purchase'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Choice: React.FC<{ title: string; body: string; action: string; onClick: () => void }> = ({ title, body, action, onClick }) => (
    <button onClick={onClick} className="text-left rounded-3xl border border-white/10 bg-[#12151c] p-4 hover:border-[#ff3b30]">
        <div className="font-black uppercase" style={{ fontFamily: headingFont }}>{title}</div>
        <p className="text-sm text-zinc-400 mt-2">{body}</p>
        <div className="text-[11px] uppercase tracking-wider text-[#ff8a80] mt-3">{action}</div>
    </button>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="rounded-3xl border border-white/10 bg-[#12151c] p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
        <div className="text-xl font-black">{value}</div>
    </div>
);
