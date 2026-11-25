import React, { useRef, useState } from 'react';
import { Player } from '../../types';
import { formatCompact } from '../../services/ownPlatform/logic';
import { FOUNDING_CAPITAL_USD } from '../../services/ownPlatform/studio';
import { foundEmpire, foundingShortfall } from '../../services/ownPlatform/migrate';
import './fonts';
import './empire.css';

interface Props {
    player: Player;
    onFound: (player: Player) => void;
}

const exact = (amount: number) => `$${Math.max(0, Math.floor(amount)).toLocaleString('en-US')}`;

/** The screen that takes the founding cheque, or explains why it cannot. */
export const FoundingGate: React.FC<Props> = ({ player, onFound }) => {
    const [error, setError] = useState('');
    const lock = useRef(false);
    const have = Math.max(0, Math.floor(Number(player.money) || 0));
    const short = foundingShortfall(player);
    const covered = short <= 0;
    const progress = Math.max(0, Math.min(1, have / FOUNDING_CAPITAL_USD));
    const costLabel = formatCompact(FOUNDING_CAPITAL_USD);

    const found = () => {
        if (lock.current || short > 0) return;
        lock.current = true;
        const result = foundEmpire(player);
        if (result.error || result.player === player) {
            lock.current = false;
            setError(result.error || 'The company is already open.');
            return;
        }
        onFound(result.player);
    };

    return (
        <div className="empire founding" data-testid="founding-gate" data-screen="founding-gate">
            <div className="found-wrap">
                <div className="found-brand">
                    <span className="bolt" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M13.5 1.5 3.5 14h7l-2 8.5L20.5 9.5h-7z" fill="#fff" /></svg>
                    </span>
                    <div>
                        <div className="kick">Empire+</div>
                        <div className="found-kicker-sub">Streaming company</div>
                    </div>
                </div>
                <h1>Found the company</h1>
                <p className="found-lead">
                    Opening Empire+ takes {exact(FOUNDING_CAPITAL_USD)} of your personal cash.
                    The whole cheque becomes the company treasury. You own the company.
                    Nothing moves until you confirm.
                </p>
                <div className="found-stats">
                    <article data-testid="founding-cost" data-amount={FOUNDING_CAPITAL_USD}>
                        <span>Required</span>
                        <strong>{costLabel}</strong>
                        <em>{exact(FOUNDING_CAPITAL_USD)}</em>
                    </article>
                    <article data-testid="founding-have" data-amount={have}>
                        <span>You have</span>
                        <strong>{formatCompact(have)}</strong>
                        <em>{exact(have)} personal cash</em>
                    </article>
                    <article
                        className={covered ? 'ready' : 'short'}
                        data-testid="founding-short"
                        data-amount={short}
                    >
                        <span>{covered ? 'Covered' : 'Still needed'}</span>
                        <strong>{covered ? '$0' : formatCompact(short)}</strong>
                        <em>{covered ? 'Your cash covers the cheque.' : `${exact(short)} still to raise`}</em>
                    </article>
                </div>
                <div className="found-bar" aria-hidden="true">
                    <i style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <p className="found-note" id="founding-note">
                    {covered
                        ? `Confirming moves ${exact(FOUNDING_CAPITAL_USD)} from your personal cash into the Empire+ treasury. Finance can move money either way after that.`
                        : `You are short ${exact(short)}. The button stays off until your personal cash covers the full ${costLabel}. Nothing is charged, and the company stays closed.`}
                </p>
                <div className="found-actions">
                    <button
                        type="button"
                        className={`btn full ${covered ? 'pri' : 'wait'}`}
                        data-testid="founding-submit"
                        disabled={!covered}
                        aria-describedby="founding-note"
                        onClick={found}
                    >
                        {covered ? `Found Empire+ · ${costLabel}` : `Need ${formatCompact(short)} more`}
                    </button>
                    {error && <p className="found-error" data-testid="founding-error">{error}</p>}
                </div>
            </div>
        </div>
    );
};
