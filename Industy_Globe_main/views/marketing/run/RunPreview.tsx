import React, { useState } from 'react';
import type { Player } from '../../../types';
import { getAbsoluteWeek } from '../../../services/legacyLogic';
import { createOwnPlatform } from '../../../services/ownPlatform/migrate';
import { CAMPAIGN_CITIES } from '../../../services/marketing/launchCatalog';
import { sceneFor } from '../../../services/marketing/sceneRegistry';
import { CampaignGrid } from './CampaignGrid';
import { LiveScene } from './LiveScene';
import { SceneGallery } from './SceneGallery';
import { OpeningNight } from '../../ownPlatform/opening/OpeningNight';
import { brandFrom } from '../../../services/ownPlatform/brand';

export type RunPreviewScreen =
    | 'run-grid' | 'run-scenes' | 'run-burj' | 'run-board' | 'run-drone' | 'run-fest'
    | 'run-stunt' | 'run-reveal' | 'run-airport' | 'run-mall' | 'run-city'
    | 'opening-ready' | 'opening-control' | 'opening-go';

const LIVE: Record<string, { formatId: string; cityId: string }> = {
    'run-burj': { formatId: 'landmark_light', cityId: 'dxb' },
    'run-board': { formatId: 'billboards', cityId: 'nyc' },
    'run-drone': { formatId: 'drone', cityId: 'par' },
    'run-fest': { formatId: 'fan_fest', cityId: 'bom' },
    'run-stunt': { formatId: 'stunt', cityId: 'mad' },
    'run-reveal': { formatId: 'building_reveal', cityId: 'prg' },
    'run-airport': { formatId: 'airport_screens', cityId: 'bom' },
    'run-mall': { formatId: 'mall_screens', cityId: 'dxb' },
    'run-city': { formatId: 'city_screens', cityId: 'ber' },
};

const fixture = (): Player => {
    const shell = { id: 'preview-player', name: 'Ava Stone', age: 28, currentWeek: 14, money: 2_000_000, logs: [] } as Player;
    const platform = createOwnPlatform(shell);
    platform.name = 'Northglass';
    platform.colorChosen = true;
    platform.introSeen = true;
    platform.stage = 'LIVE';
    platform.commissioned = true;
    platform.weeksLive = 0;
    platform.brand = { markId: 'play', typefaceId: 'condensed', lockupId: 'beside', colorId: 'indigo', frameId: 'circle' };
    platform.books = { ...platform.books!, cash: 80_000_000 };
    platform.subscribers = 120_000;
    platform.selectedCountryIds = ['IN', 'US', 'AE', 'FR', 'ES', 'DE'];
    platform.applications = platform.selectedCountryIds.map(countryId => ({
        countryId, status: 'APPROVED' as const, weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: true,
    }));
    platform.catalogue = [
        { id: 'shadow', source: 'OWNED', title: 'SHADOW', genre: 'Thriller', language: 'English', cost: 0 },
        { id: 'low', source: 'OWNED', title: 'Low Tide', genre: 'Drama', language: 'English', cost: 0 },
    ];
    platform.sites = [
        { cityId: 'bom', scout: 1, workhorse: 2, titan: 0 },
        { cityId: 'dxb', scout: 0, workhorse: 2, titan: 1 },
        { cityId: 'nyc', scout: 1, workhorse: 1, titan: 1 },
        { cityId: 'par', scout: 0, workhorse: 2, titan: 0 },
        { cityId: 'mad', scout: 1, workhorse: 1, titan: 0 },
        { cityId: 'ber', scout: 1, workhorse: 1, titan: 0 },
    ];
    platform.regions = [
        { regionId: 'ASIA', scout: 2, workhorse: 4, titan: 1 },
        { regionId: 'EUROPE', scout: 2, workhorse: 4, titan: 0 },
        { regionId: 'NORTH_AMERICA', scout: 1, workhorse: 2, titan: 1 },
    ];
    const now = getAbsoluteWeek(28, 14);
    const cities = ['bom', ...CAMPAIGN_CITIES.map(city => city.id).filter(id => id !== 'bom')];
    return {
        ...shell,
        ownPlatform: platform,
        marketing: {
            version: 1,
            campaigns: [],
            posts: [],
            exposure: [],
            records: [],
            launch: {
                version: 1,
                what: 'TITLE',
                titleId: 'shadow',
                titleName: 'SHADOW',
                cityIds: cities,
                channelIds: ['airport_screens', 'mall_screens', 'city_screens', 'stunt', 'fan_fest', 'drone', 'building_reveal', 'landmark_light', 'billboards'],
                channelCities: {
                    airport_screens: cities,
                    mall_screens: ['dxb'],
                    city_screens: ['ber'],
                    stunt: ['mad'],
                    fan_fest: ['bom'],
                    drone: ['par'],
                    building_reveal: ['prg'],
                    landmark_light: ['dxb'],
                    billboards: ['nyc'],
                },
                creativeId: 'night',
                trailerId: 'open',
                tagline: 'The night the city presses play.',
                weeks: 12,
                weeklyBudget: 4_200_000,
                openingCost: 6_400_000,
                totalCost: 56_800_000,
                reach: 12_000_000,
                buzz: 64,
                subscribers: 180_000,
                demand: 0.04,
                demandUntil: now + 11,
                cities: [],
                campaignIds: [],
                bookedAbsolute: now,
                held: false,
                extensions: 0,
            },
        },
    };
};

export const RunPreview: React.FC<{ screen: RunPreviewScreen; beat?: number }> = ({ screen, beat = 2 }) => {
    const [player, setPlayer] = useState(fixture);
    const brand = brandFrom(player.ownPlatform?.brand);
    if (screen === 'run-scenes') return <SceneGallery brand={brand} service="SHADOW" />;
    if (screen.startsWith('opening-')) {
        const phase = screen === 'opening-control' ? 'control' : screen === 'opening-go' ? 'go' : 'ready';
        return <OpeningNight player={player} onPlayer={setPlayer} onClose={() => undefined} initialPhase={phase} initialBeat={beat} hold />;
    }
    const live = LIVE[screen];
    if (live) {
        const scene = sceneFor(live.formatId, live.cityId);
        if (!scene) return null;
        return <LiveScene scene={scene} title="SHADOW" logo="S" brand={brand} onClose={() => undefined} />;
    }
    return <CampaignGrid player={player} ownerKind="EMPIRE" ownerId="empire" titleId="shadow" onPlayer={setPlayer} onClose={() => undefined} />;
};
