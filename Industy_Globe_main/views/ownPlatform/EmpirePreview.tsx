import React, { useEffect, useState } from 'react';
import { ClosedRightsDeal, Player } from '../../types';
import { createOwnPlatform } from '../../services/ownPlatform/migrate';
import { brandAccent, brandFrom, brandVolt } from '../../services/ownPlatform/brand';
import { candidateSlate, hireExecutive } from '../../services/ownPlatform/executives';
import { BrandColorStep } from './BrandColorStep';
import { BoardTable } from './BoardTable';
import { OwnershipBoard } from './OwnershipBoard';
import { IncorporationCertificate } from './IncorporationCertificate';
import { BrandStudio } from './BrandStudio';
import { Paperwork } from './Paperwork';
import { HireFlow } from './HireFlow';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import './fonts';
import './empire.css';

export type PreviewScreen = 'colour' | 'team' | 'hire' | 'ownership' | 'papers' | 'certificate' | 'locked' | 'dossier' | 'contract' | 'renew' | 'stake';

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
    platform.brandLocked = screen === 'locked';
    platform.commissioned = screen === 'locked';
    if (screen === 'locked') platform.stage = 'LIVE';
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
    if (screen === 'renew' || (screen !== 'colour' && screen !== 'hire' && screen !== 'dossier' && screen !== 'contract' && screen !== 'stake')) {
        const cfo = candidateSlate(player).find(row => row.role === 'CFO');
        if (cfo) {
            const hired = hireExecutive(player, cfo.id);
            if (!hired.error) player = hired.player;
        }
    }
    if (screen === 'renew' && player.ownPlatform?.boardTeam?.executives[0]) {
        const exec = player.ownPlatform.boardTeam.executives[0];
        exec.endsAbsolute = getAbsoluteWeek(player.age, player.currentWeek) + 4;
        exec.stakePct = 0.02;
        const books = player.ownPlatform.books;
        if (books) {
            books.shareholders = [...(books.shareholders || []), {
                id: `exec-stake-${exec.id}`,
                buyerId: exec.id,
                name: exec.name,
                kind: 'BUSINESS',
                pct: 0.02,
                paid: 0,
                week: player.currentWeek,
                year: player.age,
                conditions: [],
            }];
        }
    }
    return player;
};

/** Local screens for the colour step, the table, and the ownership board. */
export const EmpirePreview: React.FC<{ screen: PreviewScreen }> = ({ screen }) => {
    const [player, setPlayer] = useState(() => fixture(screen));
    useEffect(() => {
        const report = () => {
            const extra = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            document.documentElement.setAttribute('data-h-scroll', String(extra));
        };
        report();
        window.addEventListener('resize', report);
        return () => window.removeEventListener('resize', report);
    }, [screen]);
    const state = player.ownPlatform!;
    const accent = brandAccent(state.brand);
    return (
        <div
            className={`empire${new URLSearchParams(window.location.search).get('settled') === '1' ? ' settled' : ''}`}
            data-screen={`preview-${screen}`}
            style={{ minHeight: '100vh', ['--indigo' as string]: accent, ['--volt' as string]: brandVolt(accent), ['--brand' as string]: accent }}
        >
            <div style={{ padding: screen === 'colour' ? 20 : 16, maxWidth: 1440, margin: '0 auto', width: '100%', minWidth: 0 }}>
                {screen === 'colour' && (
                    <BrandColorStep
                        name={state.name}
                        brand={brandFrom(state.brand)}
                        stepLabel="Step 1 of 8"
                        onColor={colorId => setPlayer({ ...player, ownPlatform: { ...state, brand: brandFrom({ ...state.brand, colorId }) } })}
                        onMark={markId => setPlayer({ ...player, ownPlatform: { ...state, brand: brandFrom({ ...state.brand, markId }) } })}
                        onFrame={frameId => setPlayer({ ...player, ownPlatform: { ...state, brand: brandFrom({ ...state.brand, frameId }) } })}
                        onTypeface={typefaceId => setPlayer({ ...player, ownPlatform: { ...state, brand: brandFrom({ ...state.brand, typefaceId }) } })}
                        onContinue={() => setPlayer({ ...player, ownPlatform: { ...state, colorChosen: true } })}
                    />
                )}
                {screen === 'team' && <BoardTable player={player} onPlayer={setPlayer} />}
                {screen === 'hire' && <BoardTable player={player} onPlayer={setPlayer} initialHire />}
                {screen === 'dossier' && <HireFlow player={player} onPlayer={setPlayer} pane="dossier" />}
                {screen === 'contract' && <HireFlow player={player} onPlayer={setPlayer} pane="contract" />}
                {screen === 'renew' && <HireFlow player={player} onPlayer={setPlayer} pane="renew" />}
                {screen === 'stake' && <HireFlow player={player} onPlayer={setPlayer} pane="stake" />}
                {screen === 'ownership' && <OwnershipBoard player={player} />}
                {screen === 'papers' && <Paperwork player={player} />}
                {screen === 'locked' && <BrandStudio player={player} onPlayer={setPlayer} onClose={() => undefined} />}
                {screen === 'certificate' && (
                    <IncorporationCertificate
                        company={state.name}
                        founder={player.name}
                        brand={state.brand}
                        week={player.currentWeek}
                        year={player.age}
                    />
                )}
            </div>
        </div>
    );
};
