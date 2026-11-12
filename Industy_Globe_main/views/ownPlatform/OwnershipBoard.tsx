import React from 'react';
import { Player } from '../../types';
import { formatCompact, quoteLaunch } from '../../services/ownPlatform/logic';
import { ownershipRows, maxSellPoints } from '../../services/ownPlatform/stakeSale';
import { quoteValuation } from '../../services/ownPlatform/studio';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import { colorById } from '../../services/ownPlatform/brand';

interface Props {
    player: Player;
}

const ROAD = [
    ['IDLE', 'Private'],
    ['RESOLUTION', 'Resolution'],
    ['PRICE', 'Price'],
    ['VOTE', 'Vote'],
    ['FILING', 'Filing'],
    ['BAND', 'Price band'],
    ['ANCHOR', 'Anchor'],
    ['BOOK', 'Book'],
    ['TRADING', 'Trading'],
    ['LISTED', 'The bell'],
] as const;

const money = (value: number) => formatCompact(Number.isFinite(value) ? value : 0);

/** Ownership, the road to listing, the tape, and the deal room. Numbers come from the save. */
export const OwnershipBoard: React.FC<Props> = ({ player }) => {
    const state = player.ownPlatform;
    if (!state) return null;
    const rows = ownershipRows(player);
    const total = rows.reduce((sum, row) => sum + row.points, 0);
    const ipo = state.ipo;
    const stage = ipo?.stage || 'IDLE';
    const index = Math.max(0, ROAD.findIndex(stop => stop[0] === stage));
    const progress = ROAD.length <= 1 ? 0 : index / (ROAD.length - 1);
    const listed = stage === 'LISTED' || stage === 'TRADING';
    const symbol = (ipo?.ticker || 'EMP').trim();
    const price = listed ? (ipo?.lastPrice || ipo?.openPrice || ipo?.price || 0) : quoteValuation(player);
    const move = ipo?.dayMove?.length ? ipo.dayMove[ipo.dayMove.length - 1] : 0;
    const moveLabel = listed && Number.isFinite(move) && move !== 0
        ? `${move > 0 ? '+' : ''}${(move * 100).toFixed(1)}%`
        : listed ? 'flat' : 'not listed';
    const cash = readCompanyCash(player);
    const valuation = quoteValuation(player);
    const sell = maxSellPoints(player);
    const quote = quoteLaunch(player);
    const pending = state.pendingDeal;
    const closed = (state.closedDeals || []).slice(0, 4);
    const owned = state.ownedStreamers || [];
    const tape = listed
        ? `${symbol}  $${price.toFixed(2)}  ${moveLabel}  company cash ${money(cash)}`
        : `${symbol}  private  indicated ${money(valuation)}  company cash ${money(cash)}  weekly burn ${money(quote.weeklyBurn)}`;

    return (
        <section className="own" data-screen="ownership">
            <div className="own-grid">
                <div className="tape-card card" data-testid="ticker-card">
                    <div className="lab">Ticker</div>
                    <div className="ticker-symbol" data-testid="ticker-symbol">{symbol}</div>
                    <p className="tape-copy" data-testid="ticker-line">{tape}</p>
                </div>
                <article className="card stakes">
                    <div className="between">
                        <div className="lab">Stake split</div>
                        <div className="total" data-testid="stake-total">{total}%</div>
                    </div>
                    <div className="split" aria-hidden="true">
                        {rows.map(row => (
                            <i key={row.id} style={{ width: `${row.points}%` }} title={`${row.label} ${row.points}%`} />
                        ))}
                    </div>
                    <ul className="stake-list">
                        {rows.map(row => (
                            <li key={row.id}>
                                <span className="who">{row.label}</span>
                                <span className="kind">{row.kind}</span>
                                <span className="pts">{row.points}%</span>
                                <span className="bar"><i style={{ width: `${row.points}%` }} /></span>
                            </li>
                        ))}
                    </ul>
                </article>
                <article className="card bell">
                    <div className="lab">Road to the bell</div>
                    <div className="h3" style={{ marginTop: 6 }}>{ROAD[index]?.[1] || 'Private'}</div>
                    <div className="bell-meter" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                        <i style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                    <ol className="bell-stops">
                        {ROAD.map((stop, stopIndex) => (
                            <li key={stop[0]} className={stopIndex < index ? 'done' : stopIndex === index ? 'cur' : ''}>{stop[1]}</li>
                        ))}
                    </ol>
                </article>
                <article className="card dealroom" data-screen="deal-room">
                    <div className="lab">Deal room</div>
                    <div className="h3" style={{ marginTop: 6 }}>What is actually on the table</div>
                    <div className="deal-stats">
                        <div><span>Company cash</span><b>{money(cash)}</b></div>
                        <div><span>Indicated value</span><b>{money(valuation)}</b></div>
                        <div><span>You can still sell</span><b>{sell} pts</b></div>
                    </div>
                    {pending && (
                        <div className="deal-line">
                            <div className="lab">Open</div>
                            <strong>{pending.title}</strong>
                            <p className="small">{pending.offer.bidderName} · guarantee {money(pending.offer.guarantee)} · worth {money(pending.offer.value)}</p>
                        </div>
                    )}
                    {closed.map(deal => (
                        <div key={deal.id} className="deal-line">
                            <div className="lab">Signed</div>
                            <strong>{deal.title}</strong>
                            <p className="small">{deal.bidderName} · to company cash {money(deal.netToTreasury)} · week {deal.week}</p>
                        </div>
                    ))}
                    {owned.map(row => (
                        <div key={row.id} className="deal-line">
                            <div className="lab">Owned service</div>
                            <strong>
                                <i className="dot" style={{ background: colorById(row.brandColorId).hex }} />
                                {row.name}
                            </strong>
                            <p className="small">{row.householdsM.toFixed(1)}M homes · paid {money(row.pricePaid)} from company cash</p>
                        </div>
                    ))}
                    {!pending && closed.length === 0 && owned.length === 0 && (
                        <p className="p" style={{ marginTop: 10 }}>The room is quiet. No film is in negotiation, nothing has been signed, and no other service is on the books.</p>
                    )}
                </article>
            </div>
        </section>
    );
};
