import React, { useEffect, useState } from 'react';
import type { Player } from '../../../types';
import { createOwnPlatform } from '../../../services/ownPlatform/migrate';
import type { LaunchAnim } from '../../../services/marketing/launchCatalog';
import { LaunchCampaign } from './LaunchCampaign';
import { Surface } from './Surfaces';

export type LaunchPreviewScreen = 'launch-where' | 'launch-how' | 'launch-creative' | 'launch-budget' | 'launch-review' | 'launch-drone' | 'launch-reveal' | 'launch-eiffel' | 'launch-light' | 'launch-fest' | 'launch-stunt' | 'launch-results' | 'launch-metro' | 'launch-bus' | 'launch-board' | 'launch-feed' | 'launch-cinema' | 'launch-live' | 'launch-stadium' | 'launch-airport';

const fixture = (): Player => {
    const shell = { id: 'preview-player', name: 'Ava Stone', age: 28, currentWeek: 14, money: 2_000_000, logs: [] } as Player;
    const platform = createOwnPlatform(shell);
    platform.name = 'Sahil';
    platform.colorChosen = true;
    platform.introSeen = true;
    platform.stage = 'BUILD';
    platform.brand = { markId: 'play', typefaceId: 'condensed', lockupId: 'beside', colorId: 'indigo', frameId: 'circle' };
    platform.books = { ...platform.books!, cash: 80_000_000 };
    platform.subscribers = 0;
    platform.selectedCountryIds = ['IN', 'US', 'AE', 'GB'];
    platform.applications = [
        { countryId: 'IN', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: true },
        { countryId: 'US', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: true },
    ];
    return { ...shell, ownPlatform: platform };
};

const setup: Record<LaunchPreviewScreen, { step: number; cities: string[]; channels: string[]; scene?: 'drone' | 'reveal' | 'light' | 'fest' | 'stunt' | 'results'; focus?: LaunchAnim }> = {
    'launch-where': { step: 1, cities: ['bom', 'del', 'blr', 'maa', 'ccu', 'hyd', 'dxb', 'lon', 'nyc', 'lax', 'tyo', 'sel', 'sin', 'jkt', 'sao', 'mex', 'par', 'ber', 'los', 'syd'], channels: [] },
    'launch-how': { step: 2, cities: ['bom'], channels: ['social_feed', 'short_video', 'search_ads', 'creators_live'] },
    'launch-creative': { step: 3, cities: ['bom', 'nyc'], channels: ['social_feed', 'drone'] },
    'launch-budget': { step: 4, cities: ['bom', 'del'], channels: ['social_feed', 'short_video', 'billboards', 'drone'] },
    'launch-review': { step: 5, cities: ['bom', 'dxb', 'nyc'], channels: ['social_feed', 'city_screens', 'drone', 'building_reveal'] },
    'launch-drone': { step: 2, cities: ['bom', 'del', 'nyc', 'dxb'], channels: ['drone', 'building_reveal', 'social_feed'], scene: 'drone' },
    'launch-reveal': { step: 2, cities: ['bom', 'lon'], channels: ['building_reveal', 'drone'], scene: 'reveal' },
    'launch-eiffel': { step: 2, cities: ['par'], channels: ['building_reveal'], scene: 'reveal' },
    'launch-light': { step: 2, cities: ['dxb', 'nyc'], channels: ['landmark_light'], scene: 'light' },
    'launch-fest': { step: 2, cities: ['bom'], channels: ['fan_fest'], scene: 'fest' },
    'launch-stunt': { step: 2, cities: ['nyc'], channels: ['stunt'], scene: 'stunt' },
    'launch-results': { step: 2, cities: ['bom', 'del', 'blr', 'nyc'], channels: ['social_feed', 'short_video', 'search_ads', 'creators_live', 'drone', 'building_reveal'], scene: 'results' },
    'launch-metro': { step: 2, cities: ['del'], channels: ['metro_wrap'], focus: 'train' },
    'launch-bus': { step: 2, cities: ['bom'], channels: ['bus_wrap'], focus: 'bus' },
    'launch-board': { step: 2, cities: ['bom'], channels: ['billboards'], focus: 'board' },
    'launch-feed': { step: 2, cities: ['bom'], channels: ['social_feed'], focus: 'feed' },
    'launch-cinema': { step: 2, cities: ['bom'], channels: ['cinema'], focus: 'cinema' },
    'launch-live': { step: 2, cities: ['bom'], channels: ['creators_live'], focus: 'live' },
    'launch-stadium': { step: 2, cities: ['bom'], channels: ['stadium'], focus: 'stadium' },
    'launch-airport': { step: 2, cities: ['bom'], channels: ['airport_screens'], focus: 'airport' },
};

export const LaunchPreview: React.FC<{ screen: LaunchPreviewScreen }> = ({ screen }) => {
    const [player, setPlayer] = useState(fixture);
    const plan = setup[screen];
    useEffect(() => {
        const report = () => document.documentElement.setAttribute('data-h-scroll', String(document.documentElement.scrollWidth - document.documentElement.clientWidth));
        report();
        window.addEventListener('resize', report);
        return () => window.removeEventListener('resize', report);
    }, [screen]);
    if (plan.focus && player.ownPlatform) {
        return (
            <div className="launch" data-screen={`launch-${plan.focus}`}>
                <div className="surface-stage">
                    <Surface anim={plan.focus} brand={player.ownPlatform.brand} name={player.ownPlatform.name} title="Opening Night" />
                </div>
            </div>
        );
    }
    return (
        <LaunchCampaign
            player={player}
            onPlayer={setPlayer}
            onClose={() => undefined}
            initialStep={plan.step}
            initialCities={plan.cities}
            initialChannels={plan.channels}
            scene={plan.scene}
        />
    );
};
