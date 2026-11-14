import React from 'react';
import { Player } from '../../../types';
import { OfferBoard } from './OfferBoard';

interface Props {
    player: Player;
    onPlayer: (next: Player) => void;
    onStudio?: () => void;
    onOpenTech: (rungId: string) => void;
    editing?: boolean;
    lead?: 'deals' | 'plans';
}

export const OfferTab: React.FC<Props> = ({ player, onPlayer, onStudio, onOpenTech, editing, lead }) => {
    const state = player.ownPlatform!;
    const live = state.stage === 'LIVE';
    return (
        <div data-testid="offer-tab" className="plat-body" style={{ marginTop: 0 }}>
            <OfferBoard
                player={player}
                mode="live"
                frozen={!live}
                editing={editing}
                lead={lead}
                onCommit={next => onPlayer({ ...player, ownPlatform: next })}
                onStudio={onStudio}
                onOpenTech={onOpenTech}
            />
        </div>
    );
};
