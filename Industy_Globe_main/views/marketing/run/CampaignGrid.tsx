import React, { useState } from 'react';
import type { PlatformBrand, Player } from '../../../types';
import { brandAccent, brandFrom } from '../../../services/ownPlatform/brand';
import { extendRun, formatRunMoney, readRunBoard, stopRun } from '../../../services/marketing/campaignRun';
import type { RunCard } from '../../../services/marketing/campaignRun';
import { BrandMark } from '../../ownPlatform/BrandMark';
import { tap } from '../../../components/motion';
import { SceneStage } from './SceneStage';
import { LiveScene } from './LiveScene';
import './run.css';

interface Props {
    player: Player;
    ownerKind: 'EMPIRE' | 'HOUSE';
    ownerId: string;
    titleId?: string;
    poster?: string;
    onPlayer: (player: Player) => void;
    onClose: () => void;
    onBook?: () => void;
}

export const CampaignGrid: React.FC<Props> = ({ player, ownerKind, ownerId, titleId, poster, onPlayer, onClose, onBook }) => {
    const board = readRunBoard(player, ownerKind, ownerId, titleId);
    const brand: PlatformBrand | undefined = ownerKind === 'EMPIRE' ? brandFrom(player.ownPlatform?.brand) : undefined;
    const accent = brandAccent(brand);
    const letter = (board.titleName || 'S').slice(0, 1);
    const markId = brand?.markId;
    const lockupId = brand?.lockupId;
    const [live, setLive] = useState<RunCard | null>(null);
    const [error, setError] = useState('');
    const act = (run: () => { player: Player; error?: string }) => {
        const result = run();
        if (result.error) {
            setError(result.error);
            return;
        }
        setError('');
        onPlayer(result.player);
    };
    return (
        <div className="run" data-screen="campaign-run" data-status={board.status}>
            <header className="run-top">
                <div>
                    <button type="button" className="live-x" aria-label="Close" onClick={onClose}>×</button>
                    {onBook && <button type="button" className="run-book" onClick={onBook}>Book</button>}
                    <h1>{board.titleName || 'CAMPAIGN'}</h1>
                    <p className="run-status">{board.statusLine}</p>
                </div>
                <div className="run-logo" aria-hidden="true">
                    {markId ? <BrandMark id={markId} color={accent} size={28} letter={letter} /> : <b>{board.logo || 'H'}</b>}
                </div>
            </header>
            <div className="run-scroll">
                {board.cards.length === 0 && <p className="run-note">No formats are on the street yet. Book a flight, then the boards fill in.</p>}
                <div className="run-grid">
                    {board.cards.map(card => (
                        <button key={card.formatId} type="button" className="run-card" onClick={() => { tap('LIGHT'); setLive(card); }}>
                            <div className="run-thumb"><SceneStage scene={card.scene} title={board.titleName} poster={poster} accent={accent} markId={markId} letter={letter} lockupId={lockupId} /></div>
                            <div>
                                <b>{card.title}</b>
                                <small>{card.subtitle}</small>
                                <em>{card.place}</em>
                            </div>
                            <span className="play-btn" aria-hidden="true">▶</span>
                        </button>
                    ))}
                </div>
            </div>
            {error && <p className="run-error">{error}</p>}
            <div className="run-bar">
                <button type="button" disabled={board.status !== 'RUNNING' && board.status !== 'HELD'} onClick={() => act(() => extendRun(player, ownerKind, ownerId, 1, board.titleId))}>
                    <b>+1 WEEK</b>
                    <small>{formatRunMoney(board.extend1)}</small>
                </button>
                <button type="button" disabled={board.status !== 'RUNNING' && board.status !== 'HELD'} onClick={() => act(() => extendRun(player, ownerKind, ownerId, 4, board.titleId))}>
                    <b>+4 WEEKS</b>
                    <small>{formatRunMoney(board.extend4)}</small>
                </button>
                <button type="button" className="run-stop" disabled={board.refund <= 0 && board.status !== 'RUNNING' && board.status !== 'HELD'} onClick={() => { tap('HEAVY'); act(() => stopRun(player, ownerKind, ownerId, board.titleId)); }}>
                    <b>STOP</b>
                    <small>{board.refund > 0 ? formatRunMoney(board.refund) : 'No weeks left'}</small>
                </button>
            </div>
            {live && (
                <LiveScene
                    scene={live.scene}
                    title={board.titleName}
                    logo={board.logo || 'E'}
                    brand={brand}
                    poster={poster}
                    cities={live.cities}
                    accent={accent}
                    markId={markId}
                    letter={letter}
                    lockupId={lockupId}
                    onClose={() => setLive(null)}
                />
            )}
        </div>
    );
};
