import React, { useMemo, useState } from 'react';
import { INITIAL_PLAYER, Player, ProjectDetails } from '../../types';
import { createBusiness } from '../../services/businessLogic';
import { createOwnPlatform } from '../../services/ownPlatform/migrate';
import { MarketingDesk } from './MarketingDesk';
import { Operations } from '../ownPlatform/Operations';
import { ProductionHouseGame } from '../lifestyle/business/ProductionHouseGame';

const details = {
    title: 'Glass Hotel',
    type: 'MOVIE',
    description: 'A hotel that keeps the guests.',
    studioId: 'house-preview',
    subtype: 'STANDALONE',
    genre: 'DRAMA',
    budgetTier: 'MID',
    estimatedBudget: 18_000_000,
    visibleHype: 'MID',
    hiddenStats: {
        scriptQuality: 72,
        directorQuality: 70,
        castingStrength: 76,
        distributionPower: 55,
        rawHype: 48,
        qualityScore: 71,
        prestigeBonus: 2,
    },
    directorName: 'Idris Cole',
    visibleDirectorTier: 'AUTEUR',
    visibleScriptBuzz: 'Warm',
    visibleCastStrength: 'Strong',
    castList: [
        { id: 'c1', name: 'June Pell', role: 'Lead', isPlayer: false, image: '', type: 'ACTOR', salary: 900_000, status: 'CONFIRMED' },
        { id: 'c2', name: 'Mateo Ruiz', role: 'Support', isPlayer: false, image: '', type: 'ACTOR', salary: 400_000, status: 'CONFIRMED' },
    ],
    releaseDate: 22,
} as ProjectDetails;

export const buildPreviewPlayer = (): Player => {
    const player = JSON.parse(JSON.stringify(INITIAL_PLAYER)) as Player;
    player.name = 'Asha Venn';
    player.age = 28;
    player.currentWeek = 14;
    player.money = 250_000;
    const house = createBusiness('Northglass', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'STANDARD', pricing: 'MARKET', marketing: 'MEDIUM' }, 'NG', player.currentWeek);
    house.id = 'house-preview';
    house.name = 'Northglass';
    house.balance = 8_000_000;
    if (house.studioState) house.studioState.productionFund = 4_000_000;
    player.businesses = [house];
    player.ownPlatform = createOwnPlatform(player);
    player.ownPlatform.stage = 'LIVE';
    player.ownPlatform.introSeen = true;
    player.ownPlatform.name = 'Lumen Desk';
    if (player.ownPlatform.books) player.ownPlatform.books.cash = 12_000_000;
    player.ownPlatform.catalogue = [
        { id: 'cat-low', source: 'OWNED', title: 'Low Tide Club', genre: 'Comedy', language: 'English', cost: 1_000_000 },
    ];
    player.commitments = [{
        id: 'glass-hotel',
        name: 'Glass Hotel',
        type: 'ACTING_GIG',
        energyCost: 0,
        income: 0,
        payoutType: 'LUMPSUM',
        projectPhase: 'POST_PRODUCTION',
        promotionalBuzz: 6,
        projectDetails: details,
    }];
    return player;
};

export const MarketingPreview: React.FC<{ mode: string }> = ({ mode }) => {
    const [player, setPlayer] = useState<Player>(() => buildPreviewPlayer());
    const house = player.businesses.find(business => business.type === 'PRODUCTION_HOUSE');
    const empire = player.ownPlatform;
    const desk = useMemo(() => mode, [mode]);

    if (desk === 'house' && house) {
        return <ProductionHouseGame player={player} businessId={house.id} onBack={() => undefined} onUpdatePlayer={setPlayer} />;
    }
    if (desk === 'empire' && empire) {
        return (
            <div style={{ minHeight: '100vh', background: '#0c0b10', color: 'white' }}>
                <Operations player={player} onPlayer={setPlayer} />
            </div>
        );
    }
    if (!house || !empire) return null;
    const empireMode = desk.startsWith('empire-');
    const ownerKind = empireMode ? 'EMPIRE' : 'HOUSE';
    const action = desk.includes('stage') ? 'premiere' : desk.includes('tour') ? 'city_tour' : desk.includes('frame') || desk.includes('reel') ? 'reels' : 'billboard';
    const tab = desk.includes('wire') ? 'wire' : desk.includes('frame') ? 'frame' : desk.includes('cal') ? 'calendar' : 'build';
    return (
        <MarketingDesk
            player={player}
            ownerKind={ownerKind}
            ownerId={ownerKind === 'EMPIRE' ? 'empire' : house.id}
            ownerName={ownerKind === 'EMPIRE' ? empire.name : house.name}
            cash={ownerKind === 'EMPIRE' ? (empire.books?.cash || 0) : house.balance}
            initialTitleId={ownerKind === 'EMPIRE' ? 'cat-low' : 'glass-hotel'}
            initialActionId={action}
            initialTab={tab}
            onPlayer={setPlayer}
            onBack={() => undefined}
        />
    );
};
