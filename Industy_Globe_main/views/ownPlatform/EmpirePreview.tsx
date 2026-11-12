import React, { useState } from 'react';
import { ClosedRightsDeal, Player } from '../../types';
import { createOwnPlatform } from '../../services/ownPlatform/migrate';
import { brandAccent, brandFrom, brandVolt } from '../../services/ownPlatform/brand';
import { candidateSlate, hireExecutive } from '../../services/ownPlatform/executives';
import { BrandColorStep } from './BrandColorStep';
import { BoardTable } from './BoardTable';
import { OwnershipBoard } from './OwnershipBoard';
import './fonts';
import './empire.css';

export type PreviewScreen = 'colour' | 'team' | 'ownership';

const closed: ClosedRightsDeal = {
    id: 'preview-closed',
    title: 'Glass Harbor',
    bidderName: 'Northlight',
    guarantee: 2_400_000,
    backendPct: 0.1,
    value: 2_400_000,
    netToTreasury: 2_400_000,
    week: 11,
    year: 28,
};

const fixture = (screen: PreviewScreen): Player => {
    const shell = {
        id: 'preview-player',
        name: 'Alex Sterling',
        age: 28,
        currentWeek: 12,
        money: 2_000_000,
        logs: [],
    } as Player;
    const platform = createOwnPlatform(shell);
    platform.name = 'Northlight';
    platform.colorChosen = screen === 'colour' ? false : true;
    platform.brand = brandFrom({ ...platform.brand, colorId: screen === 'colour' ? 'indigo' : 'gold' });
    platform.ipo = {
        ...platform.ipo!,
        stage: 'FILING',
        ticker: 'NORTH',
        price: 14.5,
        lastPrice: 14.5,
        dayMove: [0.032],
    };
    platform.books = {
        ...platform.books!,
        cash: platform.books?.cash || 0,
        shareholders: [{
            id: 'sh-ada',
            buyerId: 'ada',
            name: 'Adaeze Okonkwo',
            kind: 'BUSINESS',
            pct: 0.15,
            paid: 4_200_000,
            week: 8,
            year: 28,
            conditions: [{ kind: 'BOARD_SEAT', label: 'A board seat', effect: 'Their name sits on the company board.' }],
        }],
    };
    if (screen === 'ownership') platform.closedDeals = [closed];
    let player: Player = { ...shell, ownPlatform: platform };
    if (screen !== 'colour') {
        const cfo = candidateSlate(player).find(row => row.role === 'CFO');
        if (cfo) {
            const hired = hireExecutive(player, cfo.id);
            if (!hired.error) player = hired.player;
        }
    }
    return player;
};

/** Local screens for the colour step, the table, and the ownership board. */
export const EmpirePreview: React.FC<{ screen: PreviewScreen }> = ({ screen }) => {
    const [player, setPlayer] = useState(() => fixture(screen));
    const state = player.ownPlatform!;
    const accent = brandAccent(state.brand);
    return (
        <div
            className="empire"
            data-screen={`preview-${screen}`}
            style={{ minHeight: '100vh', ['--indigo' as string]: accent, ['--volt' as string]: brandVolt(accent), ['--brand' as string]: accent }}
        >
            <div style={{ padding: screen === 'colour' ? 20 : 16, maxWidth: 1440, margin: '0 auto' }}>
                {screen === 'colour' && (
                    <BrandColorStep
                        name={state.name}
                        brand={brandFrom(state.brand)}
                        onColor={colorId => setPlayer({ ...player, ownPlatform: { ...state, brand: brandFrom({ ...state.brand, colorId }) } })}
                        onContinue={() => setPlayer({ ...player, ownPlatform: { ...state, colorChosen: true } })}
                    />
                )}
                {screen === 'team' && <BoardTable player={player} onPlayer={setPlayer} />}
                {screen === 'ownership' && <OwnershipBoard player={player} />}
            </div>
        </div>
    );
};
