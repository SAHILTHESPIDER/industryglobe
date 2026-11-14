import React from 'react';
import { LaunchRegionId, Player } from '../../../types';
import { LAUNCH_REGIONS } from '../../../services/ownPlatform/catalog';
import { formatCompact } from '../../../services/ownPlatform/logic';
import { PRODUCT_DEFS, fundFeature, readDesk, shipProduct } from '../../../services/ownPlatform/platformDesk';
import { SOON_EARN, SOON_SHOWS, SoonArt } from './SoonArt';

const Art: React.FC<{ id: string }> = ({ id }) => (
    <svg viewBox="0 0 120 70" width="100%" height="70" aria-hidden="true">
        <rect width="120" height="70" rx="10" fill="#101628" />
        {id === 'tv' && <rect x="18" y="14" width="84" height="42" rx="4" fill="#2f5bff" />}
        {id === 'phone' && <rect x="48" y="8" width="24" height="52" rx="6" fill="#3DDCFF" />}
        {id === 'web' && <rect x="16" y="16" width="88" height="40" rx="4" fill="#8B7BFF" />}
        {id === 'console' && <path d="M20 40h80l-8 14H28z" fill="#E4B15A" />}
        {id === 'smart-tv' && <><rect x="22" y="12" width="76" height="40" rx="4" fill="#3DFFA0" /><rect x="54" y="54" width="12" height="8" fill="#9aa3bd" /></>}
        {id === 'car' && <path d="M18 40c8-16 76-16 84 0v10H18z" fill="#FF7AD9" />}
    </svg>
);

export const ProductTab: React.FC<{ player: Player; onPlayer: (next: Player) => void }> = ({ player, onPlayer }) => {
    const state = player.ownPlatform!;
    const desk = readDesk(state);
    const [error, setError] = React.useState('');
    const apply = (result: { player: Player; error?: string }) => {
        setError(result.error || '');
        if (!result.error) onPlayer(result.player);
    };
    return (
        <div data-testid="product-tab">
            {error && <p className="err">{error}</p>}
            <div className="soon-grid" data-testid="soon-shows">
                {SOON_SHOWS.map(card => (
                    <article key={card.id} className="soon-card" data-testid={`soon-${card.id}`}>
                        <div className="soon-art"><SoonArt id={card.id} /><span className="soon-pill">SOON</span></div>
                        <h3>{card.name}</h3>
                        <p>{card.line}</p>
                        <div className="when">Coming soon</div>
                    </article>
                ))}
            </div>
            <div className="soon-head"><h3>Earn more</h3><span>Fans, events and things to buy · {SOON_EARN.length}</span></div>
            <div className="soon-grid" data-testid="soon-earn">
                {SOON_EARN.map(card => (
                    <article key={card.id} className="soon-card">
                        <div className="soon-art"><SoonArt id={card.id} /><span className="soon-pill">SOON</span></div>
                        <h3>{card.name}</h3>
                        <p>{card.line}</p>
                        <div className="when">Coming soon</div>
                    </article>
                ))}
            </div>
            <div className="soon-head"><h3>On devices</h3><span>Apps you can ship</span></div>
            <div className="product-grid">
                {PRODUCT_DEFS.map(spec => {
                    const row = (desk.products || []).find(item => item.id === spec.id);
                    const stars = row?.stars || 0;
                    return (
                        <article key={spec.id} className="plat-panel">
                            <div className="illu"><Art id={spec.id} /></div>
                            <div className="plat-kicker" style={{ marginTop: 8 }}>{row?.released ? 'On devices' : 'In the shop'}</div>
                            <h3>{spec.name}</h3>
                            <p style={{ color: '#c5cbe0', minHeight: 40 }}>{spec.line}</p>
                            <div className="stars" aria-label={`${stars} stars`}>{Array.from({ length: 5 }, (_, index) => index < stars ? '★' : '☆').join('')}</div>
                            <div className="bar" style={{ marginTop: 8 }}><i style={{ width: `${row?.featurePct || 0}%` }} /></div>
                            <p className="plat-kicker">Feature release {row?.featurePct || 0}%</p>
                            <div className="plat-actions">
                                {!row?.released && <button type="button" className="plat-btn pri" onClick={() => apply(shipProduct(player, spec.id))}>Ship · {formatCompact(spec.cost)}</button>}
                                {row?.released && <button type="button" className="plat-btn gold" onClick={() => apply(fundFeature(player, spec.id))}>Release a feature</button>}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export const StatusTab: React.FC<{ player: Player }> = ({ player }) => {
    const state = player.ownPlatform!;
    const desk = readDesk(state);
    const playback = desk.playbackPct ?? state.uptime ?? (state.stage === 'LIVE' ? 99 : 0);
    const pulses = new Map((desk.pulses || []).map(row => [row.regionId, row.weeks]));
    const incidents = state.incidents || [];
    return (
        <div data-testid="status-tab" className="status-grid">
            <article className="plat-panel">
                <div className="plat-kicker">Playback success</div>
                <div className="plat-price" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className="ping" style={{ width: 14, height: 14, borderRadius: 99, background: '#3DFFA0', display: 'inline-block' }} />
                    {playback}%
                </div>
                <p className="plat-kicker">Tech debt {desk.techDebt || 0} · churn last week {(desk.lastChurn || 0).toLocaleString('en-US')}</p>
                <div className="plat-section">Uptime by region</div>
                {LAUNCH_REGIONS.map(region => {
                    const weeks = pulses.get(region.id as LaunchRegionId) || [playback];
                    return (
                        <div key={region.id} style={{ marginTop: 8 }}>
                            <div className="plat-kicker">{region.name}</div>
                            <div className="uptime">
                                {weeks.map((value, index) => <i key={index} style={{ height: `${Math.max(8, value / 2)}px`, animationDelay: `${index * 60}ms` }} />)}
                            </div>
                        </div>
                    );
                })}
            </article>
            <article className="plat-panel">
                <div className="plat-kicker">Incidents</div>
                <div className="feed">
                    {incidents.length === 0 && (desk.feed || []).length === 0 && <p>The night is quiet. No open incident.</p>}
                    {incidents.map(row => (
                        <article key={row.id} className={row.open ? 'bad' : 'warn'}>
                            <b>{row.kind}</b>
                            <div>{row.note}</div>
                        </article>
                    ))}
                    {(desk.feed || []).map(row => (
                        <article key={row.id} className={row.tone}>
                            <div>{row.text}</div>
                        </article>
                    ))}
                </div>
            </article>
        </div>
    );
};
