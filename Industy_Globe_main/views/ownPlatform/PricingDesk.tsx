import React from 'react';
import { OwnPlatformState, Player } from '../../types';
import { OfferBoard } from './platform/OfferBoard';

interface Props {
    player: Player;
    state: OwnPlatformState;
    locked: boolean;
    onChange: (next: OwnPlatformState) => void;
}

/** Launch price step and the operations slate. Same offer desk as Platform, still editable while you are defining the launch. */
export const PricingDesk: React.FC<Props> = ({ player, state, locked, onChange }) => {
    const live = state.stage === 'LIVE';
    return (
        <OfferBoard
            player={{ ...player, ownPlatform: state }}
            mode={live ? 'live' : 'compose'}
            frozen={locked || (!live && state.stage !== 'DEFINE')}
            editing
            onCommit={onChange}
        />
    );
};
