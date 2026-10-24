import React from 'react';
import { createPortal } from 'react-dom';
import { CommissionBrief, Player } from '../../../types';
import { deskOf } from '../../../services/commissions/logic';
import { formatCompact } from '../../../services/ownPlatform/logic';
import '../../ownPlatform/fonts';
import '../../ownPlatform/empire.css';

const MARK: Record<string, string> = {
    netflix: 'nfx',
    prime: 'w-prime',
    disney: 'w-disney',
    max: 'w-max',
    hulu: 'w-hulu',
    apple: 'w-apple',
    paramount: 'w-paramount',
    peacock: 'w-peacock',
    hotstar: 'w-hotstar',
};

export const initials = (name: string) => name.split(/\s+/).map(part => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'EX';

export const PlatformWord: React.FC<{ id: string; name: string; size?: number }> = ({ id, name, size = 34 }) => (
    <div className={MARK[id] || 'h3'} style={{ fontSize: size, color: MARK[id] ? undefined : 'var(--text)' }}>{name}</div>
);

export const ChanceGauge: React.FC<{ chance: number; was?: number }> = ({ chance, was }) => {
    const color = chance > 70 ? 'var(--go)' : chance > 40 ? 'var(--warn)' : 'var(--bad)';
    return (
        <div data-testid="win-chance" style={{ textAlign: 'center' }}>
            <div className="lab">Win chance</div>
            <div style={{ position: 'relative', marginTop: 6 }}>
                <svg viewBox="0 0 200 120" width="100%">
                    <path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke="#ffffff14" strokeWidth="16" strokeLinecap="round" />
                    <path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - Math.max(0, Math.min(100, chance))} />
                </svg>
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6 }}>
                    <div style={{ fontFamily: 'var(--h)', fontWeight: 900, fontSize: 64, lineHeight: 1, color }}>{chance}%</div>
                    {was != null && <div className="tiny">was {was}% if you accept the offer</div>}
                </div>
            </div>
        </div>
    );
};

const PHASES = ['Offer', 'Decide', 'Contract', 'Signed', 'Slate'];

export const StudioFrame: React.FC<{
    player: Player;
    testId: string;
    kicker: string;
    title: string;
    phase: number;
    showPhases?: boolean;
    onClose: () => void;
    footer?: React.ReactNode;
    children: React.ReactNode;
}> = ({ player, testId, kicker, title, phase, showPhases = true, onClose, footer, children }) => {
    const house = player.businesses?.find(row => row.type === 'PRODUCTION_HOUSE');
    const desk = deskOf(player);
    const openCount = desk.briefs.filter(row => row.direction === 'IN' && (row.status === 'OPEN' || row.status === 'REPLIED' || row.status === 'CONTRACT')).length;
    return createPortal(
        <div className="empire fixed inset-0 z-[220]" data-testid={testId} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="app">
                <aside className="rail">
                    <div className="brand">
                        <div className="bolt" style={{ background: '#E8B04A', boxShadow: '0 0 24px #E8B04A55' }}>
                            <span style={{ fontFamily: 'var(--h)', fontWeight: 900, color: '#1a1300', fontSize: 18 }}>{(house?.name || 'E').slice(0, 1)}</span>
                        </div>
                        <div>
                            <div className="nm" style={{ fontSize: 20 }}>{(house?.name || 'Empire Pictures').toUpperCase()}</div>
                            <div className="st" style={{ color: 'var(--mute)' }}>Prod. house · rep {desk.reputation}</div>
                        </div>
                    </div>
                    <div className="phase">Studio</div>
                    <ul className="nav">
                        {['Slate', 'Commissions', 'Development Lab', 'Rights Library', 'Ledger', 'Empire+'].map((label, index) => (
                            <li key={label} className={index === 1 ? 'cur' : ''}>
                                <i />
                                {label}
                                {index === 1 && openCount > 0 ? <span className="badge">{openCount}</span> : null}
                            </li>
                        ))}
                    </ul>
                    <div className="treas">
                        <div className="l">Treasury</div>
                        <div className="v">{formatCompact(player.money)}</div>
                        <div className="s">Career money · USD books</div>
                    </div>
                </aside>
                <div className="main">
                    <header className="top">
                        <div>
                            <div className="kick">{kicker}</div>
                            <h1>{title}</h1>
                            {showPhases && (
                                <div className="row" style={{ gap: 6, marginTop: 14 }}>
                                    {PHASES.map((label, index) => (
                                        <span key={label} className={`chip ${index === phase ? 'on' : index < phase ? 'wht' : ''}`} style={{ padding: '5px 12px', fontSize: 11 }}>
                                            {index < phase ? '✓ ' : ''}{label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="topR">
                            <div className="tabs">
                                <span>Week {player.currentWeek}</span>
                                <span className="on">Commissions</span>
                            </div>
                        </div>
                    </header>
                    <div className="mtop">
                        <div className="bar1">
                            <button type="button" className="back" onClick={onClose} aria-label="Back">←</button>
                            <div className="mid">
                                <div className="kick">{kicker}</div>
                                <div className="t">{title}</div>
                            </div>
                            <div className="no" style={{ fontSize: 14, color: 'var(--mute)' }}>{phase + 1}/5</div>
                        </div>
                        {showPhases && (
                            <div className="mrail">
                                {PHASES.map((label, index) => <i key={label} className={index < phase ? 'done' : index === phase ? 'cur' : ''} />)}
                            </div>
                        )}
                    </div>
                    <div className="scroll">
                        <div className="body">{children}</div>
                        {footer}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

export const RivalBanner: React.FC<{ brief: CommissionBrief; weeks: number }> = ({ brief, weeks }) => {
    const rivals = brief.seats.filter(seat => seat.id !== 'PLAYER');
    return (
        <div>
            <div className="between" style={{ padding: '10px 12px', borderRadius: 12, background: '#FFC44D12', border: '1px solid #FFC44D44', flexWrap: 'wrap', gap: 6 }}>
                <b className="mono" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'var(--warn)' }}>Competing studios: {rivals.length}</b>
                <span className="mono tiny" style={{ color: 'var(--warn)' }}>Closes in <span className="timer">{weeks}w · week {brief.closesWeek}</span></span>
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
                {rivals.map(seat => <span key={seat.id} className="chip" style={{ fontSize: 11, padding: '4px 10px' }}>{seat.name}</span>)}
            </div>
        </div>
    );
};
