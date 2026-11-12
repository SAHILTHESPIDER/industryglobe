import React, { useMemo, useState } from 'react';
import { Player } from '../../../types';
import { formatCompact } from '../../../services/ownPlatform/logic';
import { WORLD_MAP_HEIGHT, WORLD_MAP_WIDTH, projectMarket } from '../../../services/ownPlatform/worldPaths';
import { paintedWorldPaths } from '../../../services/ownPlatform/worldMapPaint';
import {
    buyServer,
    marketsServed,
    moneyShort,
    networkStats,
    peakLoadLabel,
    promoteSite,
    readDesk,
    roleLabel,
    siteRows,
    suggestCities,
} from '../../../services/ownPlatform/platformDesk';

const PATHS = paintedWorldPaths();

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
}

export const NetworkTab: React.FC<Props> = ({ player, onPlayer }) => {
    const state = player.ownPlatform!;
    const stats = networkStats(state);
    const desk = readDesk(state);
    const served = marketsServed(state);
    const servedWell = stats.load <= 0.85 ? 100 : Math.max(40, Math.round((1 - (stats.load - 0.85)) * 100));
    const [picked, setPicked] = useState(stats.rows[0]?.city.id || '');
    const [all, setAll] = useState(false);
    const [error, setError] = useState('');
    const [box, setBox] = useState<'scout' | 'workhorse' | 'titan'>('scout');
    const visible = all ? stats.rows : stats.rows.slice(0, 8);
    const ideas = suggestCities(state);
    const fresh = new Set(desk.freshSites || []);
    const core = stats.rows.find(row => row.role === 'CORE');

    const apply = (result: { player: Player; error?: string }) => {
        setError(result.error || '');
        if (!result.error) onPlayer(result.player);
    };

    const lines = useMemo(() => {
        if (!core) return [];
        const from = projectMarket(core.city.lat, core.city.lon);
        return stats.rows.filter(row => row.role === 'HUB').map(row => {
            const to = projectMarket(row.city.lat, row.city.lon);
            return { id: row.city.id, d: `M${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 18} ${to.x} ${to.y}` };
        });
    }, [core, stats.rows]);

    return (
        <div data-testid="network-tab">
            <div className="net-layout">
                <div>
                    <div className="map-card" data-testid="network-map">
                        <svg viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`} role="img" aria-label="Glowing world map of server sites">
                            <defs>
                                <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#4c96d6" />
                                    <stop offset="100%" stopColor="#1c5ea8" />
                                </linearGradient>
                                <filter id="haloBlur"><feGaussianBlur stdDeviation="2.4" /></filter>
                            </defs>
                            <rect width={WORLD_MAP_WIDTH} height={WORLD_MAP_HEIGHT} fill="url(#sea)" />
                            {PATHS.map(path => (
                                <path key={path.id} d={path.d} fill="#e7eef6" stroke="#c5d2e2" strokeWidth="0.6" fillRule={path.holed ? 'evenodd' : 'nonzero'} />
                            ))}
                            {lines.map(line => (
                                <path key={line.id} d={line.d} className="traffic" fill="none" stroke="#f4f8ff" strokeWidth="1.2" opacity="0.8" />
                            ))}
                            {stats.rows.map(row => {
                                const point = projectMarket(row.city.lat, row.city.lon);
                                const on = picked === row.city.id;
                                return (
                                    <g key={row.city.id} onClick={() => setPicked(row.city.id)} style={{ cursor: 'pointer' }}>
                                        <circle className={fresh.has(row.city.id) ? 'ping' : 'halo'} cx={point.x} cy={point.y} r={on ? 16 : 11} fill="#d6e9ff" opacity="0.45" filter="url(#haloBlur)" />
                                        <circle cx={point.x} cy={point.y} r={on ? 4.2 : 2.8} fill="#ffffff" stroke="#2f5bff" strokeWidth={on ? 1.4 : 0.6} />
                                        <title>{row.city.name}</title>
                                    </g>
                                );
                            })}
                        </svg>
                        <div className="served">Served {served.served}</div>
                        <div className="map-float">
                            <div><b>{servedWell}%</b><span>of your audience served well</span></div>
                            <div><b>{stats.cities}</b><span>sites</span></div>
                        </div>
                    </div>
                    <div className="trio" style={{ marginTop: 10 }}>
                        <article className="plat-panel">
                            <div className="plat-kicker">Peak load</div>
                            <div className="plat-price">{Math.round(stats.load * 100)}%</div>
                            <div className="bar"><i style={{ ['--w' as string]: `${Math.min(100, stats.load * 100)}%`, width: `${Math.min(100, stats.load * 100)}%` }} /></div>
                            <p className="plat-kicker" style={{ marginTop: 8 }}>{peakLoadLabel(stats.load, stats.steady)}</p>
                        </article>
                        <article className="plat-panel">
                            <div className="plat-kicker">Markets served</div>
                            <div className="plat-price">{served.served}/{served.total}</div>
                            <div className="bar good"><i style={{ width: `${served.total ? (served.served / served.total) * 100 : 0}%` }} /></div>
                            <p className="plat-kicker" style={{ marginTop: 8 }}>{servedWell >= 80 ? '80% of their people reached or more' : 'Peak is ahead of the rooms'}</p>
                        </article>
                        <article className="plat-panel">
                            <div className="plat-kicker">Running cost</div>
                            <div className="plat-price">{formatCompact(stats.weekly)}</div>
                            <p className="plat-kicker" style={{ marginTop: 8 }}>a week · revision {stats.revision}</p>
                        </article>
                    </div>
                    <article className="plat-panel" style={{ marginTop: 10 }}>
                        <div className="plat-kicker">Grow the network</div>
                        <p style={{ margin: '6px 0 8px', color: '#c5cbe0' }}>New rooms are suggested as the audience grows. The cheque comes from company cash, not your pocket.</p>
                        <div className="plat-actions">
                            {(['scout', 'workhorse', 'titan'] as const).map(id => (
                                <button key={id} type="button" className={`plat-btn${box === id ? ' pri' : ''}`} onClick={() => setBox(id)}>{id}</button>
                            ))}
                        </div>
                        <div className="plat-actions">
                            {(ideas.length ? ideas : []).slice(0, 3).map(city => (
                                <button key={city.id} type="button" className="plat-btn gold" onClick={() => { setPicked(city.id); apply(buyServer(player, city.id, box)); }}>
                                    Build {city.name}
                                </button>
                            ))}
                            {picked && (
                                <button type="button" className="plat-btn" onClick={() => apply(promoteSite(player, picked))}>
                                    Promote {siteRows(state).find(row => row.city.id === picked)?.city.name || 'site'}
                                </button>
                            )}
                        </div>
                        {error && <p className="err">{error}</p>}
                    </article>
                </div>
                <div className="net-side">
                    <div className="between" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div className="plat-section" style={{ margin: 0 }}>Sites</div>
                        <span className="plat-kicker">tap a site on the map to find it</span>
                    </div>
                    <div className="sites" data-testid="network-sites">
                        {visible.map(row => (
                            <button key={row.city.id} type="button" className={`site${picked === row.city.id ? ' on' : ''}`} onClick={() => setPicked(row.city.id)}>
                                <i className="radio" />
                                <span>
                                    <b>{row.city.name}</b>
                                    <small>{row.city.countryId} · {row.racks} rack{row.racks === 1 ? '' : 's'}</small>
                                </span>
                                <span className="role">{roleLabel(row.role)}<span>{row.reach >= 1000 ? `${(row.reach / 1000).toFixed(1)}K km reach` : `${row.reach} km reach`}</span></span>
                            </button>
                        ))}
                        {stats.rows.length > 8 && (
                            <button type="button" className="show-all" onClick={() => setAll(open => !open)}>
                                {all ? 'Show the first sites' : `Show all ${stats.rows.length} sites`}
                            </button>
                        )}
                    </div>
                    {(desk.timeline || []).length > 0 && (
                        <div className="timeline" data-testid="growth-timeline">
                            <div className="plat-section">Growth</div>
                            {desk.timeline!.map(event => (
                                <div key={event.id} className="time"><i /><span>{event.text}</span></div>
                            ))}
                        </div>
                    )}
                    {picked && (
                        <p className="plat-kicker">Selected site health {Math.round(stats.rows.find(row => row.city.id === picked)?.health || 0)}% · peak {Math.round((stats.rows.find(row => row.city.id === picked)?.peak || 0) * 100)}%</p>
                    )}
                    <p className="plat-kicker">Company cash {moneyShort(state.books?.cash || 0)} · personal cash stays put</p>
                </div>
            </div>
        </div>
    );
};
