import React, { useEffect, useState } from 'react';
import { Player } from '../../types';
import { formatCompact, quoteLaunch } from '../../services/ownPlatform/logic';
import { ownershipRows, maxSellPoints } from '../../services/ownPlatform/stakeSale';
import { quoteValuation } from '../../services/ownPlatform/studio';
import { readCompanyCash } from '../../services/ownPlatform/companyCash';
import { colorById } from '../../services/ownPlatform/brand';
import { faceFor } from '../../services/ownPlatform/executives';
import { CartoonAvatar } from './CartoonFace';
import { Paperwork } from './Paperwork';

interface Props {
    player: Player;
}

const ROAD = [
    ['IDLE', 'Private'],
    ['RESOLUTION', 'Resolution'],
    ['PRICE', 'Price'],
    ['VOTE', 'Vote'],
    ['FILING', 'Filing'],
    ['BAND', 'Band'],
    ['ANCHOR', 'Anchor'],
    ['BOOK', 'Book'],
    ['TRADING', 'Trading'],
    ['LISTED', 'Bell'],
] as const;

const COLOURS = ['#4F3BFF', '#E4B15A', '#3DFFA0', '#38BDF8', '#FB7185', '#A78BFA', '#F59E0B'];

const useCount = (target: number) => {
    const [value, setValue] = useState(target);
    useEffect(() => {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            setValue(target);
            return;
        }
        const start = performance.now();
        let frame = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 800);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(target * eased);
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        setValue(0);
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target]);
    return value;
};

const Donut: React.FC<{ rows: { id: string; points: number }[] }> = ({ rows }) => {
    const radius = 42;
    const circ = 2 * Math.PI * radius;
    let cursor = 0;
    const key = rows.map(row => `${row.id}:${row.points}`).join('|');
    return (
        <svg key={key} className="donut" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} className="donut-track" />
            {rows.map((row, index) => {
                const len = (row.points / 100) * circ;
                const dash = `${len} ${circ - len}`;
                const node = (
                    <circle
                        key={row.id}
                        cx="60"
                        cy="60"
                        r={radius}
                        className="donut-seg"
                        stroke={COLOURS[index % COLOURS.length]}
                        strokeDasharray={dash}
                        strokeDashoffset={-cursor}
                    />
                );
                cursor += len;
                return node;
            })}
        </svg>
    );
};

/** Ownership, the road to listing, the tape, the papers, and the deal room. */
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
    const cashShown = useCount(cash);
    const valueShown = useCount(valuation);
    const tape = listed
        ? `${symbol}   $${price.toFixed(2)}   ${moveLabel}   company cash ${formatCompact(cash)}`
        : `${symbol}   private   indicated ${formatCompact(valuation)}   company cash ${formatCompact(cash)}   weekly burn ${formatCompact(quote.weeklyBurn)}`;

    return (
        <section className="own" data-screen="ownership">
            <div className="own-grid">
                <div className="tape-card card" data-testid="ticker-card">
                    <div className="between">
                        <div className="lab">Ticker</div>
                        <div className="lab">{moveLabel}</div>
                    </div>
                    <div className="ticker-symbol" data-testid="ticker-symbol">{symbol}</div>
                    <div className="tape" aria-hidden="true">
                        <div className="tape-track">
                            <span>{tape}</span>
                            <span>{tape}</span>
                        </div>
                    </div>
                    <p className="tape-copy" data-testid="ticker-line">{tape}</p>
                </div>
                <article className="card stakes">
                    <div className="between">
                        <div className="lab">Stake split</div>
                        <div className="total" data-testid="stake-total">{total}%</div>
                    </div>
                    <div className="donut-wrap">
                        <Donut rows={rows} />
                        <div className="donut-hole">{total}%</div>
                    </div>
                    <div className="holder-chips">
                        {rows.map(row => (
                            <div key={row.id} className="holder-chip">
                                <CartoonAvatar face={faceFor(`${row.id}:${row.label}`)} size={36} label={row.label} />
                                <span>{row.label}</span>
                                <b>{row.points}%</b>
                            </div>
                        ))}
                    </div>
                    <ul className="stake-ledger">
                        {rows.map((row, rowIndex) => (
                            <li key={row.id} style={{ ['--i' as string]: String(rowIndex) }}>
                                <span className="who">{row.label}</span>
                                <span className="kind">{row.kind}</span>
                                <span className="pts">{row.points}%</span>
                            </li>
                        ))}
                    </ul>
                </article>
                <article className="card bell">
                    <div className="lab">Road to the bell</div>
                    <div className="h3" style={{ marginTop: 6 }}>{ROAD[index]?.[1] || 'Private'}</div>
                    <div className="bell-track" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                        <i style={{ width: `${Math.round(progress * 100)}%` }} />
                        {ROAD.map((stop, stopIndex) => (
                            <span
                                key={stop[0]}
                                className={`bell-node${stopIndex < index ? ' done' : ''}${stopIndex === index ? ' cur' : ''}`}
                                style={{ left: `${(stopIndex / (ROAD.length - 1)) * 100}%` }}
                                title={stop[1]}
                            />
                        ))}
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
                        <div><span>Company cash</span><b>{formatCompact(cashShown)}</b></div>
                        <div><span>Indicated value</span><b>{formatCompact(valueShown)}</b></div>
                        <div><span>You can still sell</span><b>{sell} pts</b></div>
                    </div>
                    {pending && (
                        <article className="deal-card">
                            <div className="lab">Open</div>
                            <strong>{pending.title}</strong>
                            <p className="small">{pending.offer.bidderName} · guarantee {formatCompact(pending.offer.guarantee)} · worth {formatCompact(pending.offer.value)}</p>
                        </article>
                    )}
                    {closed.map(deal => (
                        <article key={deal.id} className="deal-card">
                            <div className="lab">Signed</div>
                            <strong>{deal.title}</strong>
                            <p className="small">{deal.bidderName} · to company cash {formatCompact(deal.netToTreasury)} · week {deal.week}</p>
                        </article>
                    ))}
                    {owned.map(row => (
                        <article key={row.id} className="deal-card">
                            <div className="lab">Owned service</div>
                            <strong>
                                <i className="dot" style={{ background: colorById(row.brandColorId).hex }} />
                                {row.name}
                            </strong>
                            <p className="small">{row.householdsM.toFixed(1)}M homes · paid {formatCompact(row.pricePaid)} from company cash</p>
                        </article>
                    ))}
                    {!pending && closed.length === 0 && owned.length === 0 && (
                        <p className="p" style={{ marginTop: 10 }}>The room is quiet. No film is in negotiation, nothing has been signed, and no other service is on the books.</p>
                    )}
                </article>
            </div>
            <Paperwork player={player} />
        </section>
    );
};
