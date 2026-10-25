import React from 'react';
import { OwnPlatformState } from '../../types';
import { LaunchQuote, formatCompact, formatPeople } from '../../services/ownPlatform/logic';

const BOLT = (fill: string, size = 24) => (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill={fill} /></svg>
);

interface Props {
    state: OwnPlatformState;
    locked: boolean;
    quote: LaunchQuote;
    onName: (name: string) => void;
}

export const NameIt: React.FC<Props> = ({ state, locked, quote, onName }) => {
    const name = state.name || '';
    const shown = (name.trim() || 'EMPIRE').toUpperCase();
    return (
        <div className="grid g-side">
            <div className="stack">
                <div className="card sel" style={{ padding: '22px 24px' }}>
                    <label className="flab" htmlFor="empire-name">Service name · what the world will type</label>
                    <div className="between">
                        <input
                            id="empire-name"
                            className="name-hero"
                            value={name}
                            disabled={locked}
                            maxLength={32}
                            onChange={event => onName(event.target.value.slice(0, 32))}
                            aria-label="Service name"
                        />
                        <div className="mono small">{name.length} / 32</div>
                    </div>
                    <div className="small" style={{ marginTop: 8 }}>Short names survive on a billboard. You get the “+” free.</div>
                </div>
                <div className="lab">Platform identity · live preview</div>
                <div className="grid ident-grid" style={{ gridTemplateColumns: '1.25fr .6fr .8fr', gap: 12 }}>
                    <div className="card" style={{ background: 'var(--indigo)', border: 0, display: 'flex', alignItems: 'center', gap: 14, minHeight: 130 }}>
                        <div>{BOLT('#05060A', 46)}</div>
                        <div>
                            <div style={{ fontFamily: 'var(--h)', fontWeight: 900, fontSize: 58, color: '#05060A', lineHeight: 0.85 }}>{shown.endsWith('+') ? shown : `${shown}+`}</div>
                            <div className="mono" style={{ fontSize: 9, letterSpacing: '0.3em', color: '#05060Acc', marginTop: 6 }}>ORIGINALS · FILMS · SERIES</div>
                        </div>
                    </div>
                    <div className="card" style={{ display: 'grid', placeItems: 'center', background: '#15172A' }}>
                        <div style={{ position: 'relative', width: 74, height: 74, borderRadius: 20, background: 'linear-gradient(160deg,#6A58FF,#2A1C9E)', display: 'grid', placeItems: 'center', boxShadow: '0 10px 30px #4F3BFF66' }}>
                            {BOLT('#fff', 34)}
                            <span style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'var(--bad)', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center' }}>3</span>
                        </div>
                        <div className="tiny" style={{ marginTop: 8 }}>App icon</div>
                    </div>
                    <div className="card" style={{ background: 'linear-gradient(160deg,#2A1C9E,#120C44)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                        {BOLT('#8B7BFF', 90)}
                    </div>
                    <div className="card" style={{ gridColumn: 'span 2', background: '#101227', padding: 12 }}>
                        <div className="row" style={{ gap: 5, marginBottom: 8 }}>
                            <i style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5F57' }} />
                            <i style={{ width: 9, height: 9, borderRadius: '50%', background: '#FEBC2E' }} />
                            <i style={{ width: 9, height: 9, borderRadius: '50%', background: '#28C840' }} />
                            <div className="row" style={{ marginLeft: 10, background: '#1C1F38', borderRadius: '8px 8px 0 0', padding: '6px 12px', fontSize: 12, gap: 8 }}>
                                <span style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--indigo)', display: 'grid', placeItems: 'center' }}>{BOLT('#fff', 10)}</span>
                                Watch — {shown} <span className="tiny">×</span>
                            </div>
                        </div>
                        <div style={{ background: '#05060A', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--m)', fontSize: 12, color: 'var(--mute)' }}>https://watch.{shown.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'empireplus'}.tv/</div>
                    </div>
                    <div className="card" style={{ gridRow: 'span 2', background: 'radial-gradient(80% 60% at 50% 60%,#4F3BFF55,#0A0B14)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <div className="tiny">Lock screen</div>
                        <div style={{ fontFamily: 'var(--h)', fontWeight: 800, fontSize: 48 }}>17:44</div>
                        <div style={{ width: '100%', background: '#ffffff14', borderRadius: 14, padding: 10, display: 'flex', gap: 8, alignItems: 'center', fontSize: 11 }}>
                            <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--indigo)', display: 'grid', placeItems: 'center', flex: 'none' }}>{BOLT('#fff', 14)}</span>
                            <span><b>{shown}</b><br /><span style={{ color: 'var(--mute)' }}>Dead Signal is live. Episode 1 now.</span></span>
                        </div>
                    </div>
                    <div className="card" style={{ gridColumn: 'span 2', background: 'linear-gradient(90deg,#05060A,#1A1260)', padding: '14px 16px' }}>
                        <div className="between">
                            <div style={{ fontFamily: 'var(--h)', fontWeight: 900, fontSize: 22 }}>DEAD SIGNAL</div>
                            {BOLT('#8B7BFF', 16)}
                        </div>
                        <div className="bar" style={{ marginTop: 22 }}><i style={{ width: '38%' }} /></div>
                        <div className="mono tiny" style={{ marginTop: 6 }}>▶ 12:44 / 47:22</div>
                    </div>
                </div>
                <div className="row" style={{ gap: 18 }}>
                    <span className="row small"><i className="swatch" style={{ background: '#4F3BFF' }} />#4F3BFF</span>
                    <span className="row small"><i className="swatch" style={{ background: '#1A1260' }} />#1A1260</span>
                    <span className="row small"><i className="swatch" style={{ background: '#8B7BFF' }} />#8B7BFF</span>
                </div>
            </div>
            <aside className="pv stack hideM">
                <div className="lab">Live preview</div>
                <div className="bb">
                    <span className="tag">Billboard · Times Sq.</span>
                    {BOLT('#fff', 40)}
                    {shown.endsWith('+') ? shown : `${shown}+`}
                    <small>Originals · Films · Series</small>
                </div>
                <div className="card bill">
                    <div className="lab">Launch bill · nothing paid yet</div>
                    <div className="tot" style={{ marginTop: 8 }}>{formatCompact(quote.dueNow)}</div>
                    <div className="tiny" style={{ marginBottom: 6 }}>due at commission</div>
                    <div className="line"><span>Weekly burn</span><span>{formatCompact(quote.weeklyBurn)}</span></div>
                    <div className="line"><span>Forecast homes</span><span style={{ color: 'var(--go)' }}>{formatPeople(quote.households)}</span></div>
                    <div className="line" style={{ border: 0 }}><span>Piracy</span><span>{Math.round(quote.piracyShare * 100)}% of viewing</span></div>
                </div>
                <div className="card flat">
                    <div className="lab" style={{ color: 'var(--volt)' }}>This step</div>
                    <p className="p" style={{ marginTop: 6 }}>Nothing is paid on this step. The name updates every preview as you type and carries into Ident.</p>
                </div>
            </aside>
        </div>
    );
};
