import React, { useState } from 'react';
import { Player } from '../../../types';
import { createOwnPlatform } from '../../../services/ownPlatform/migrate';
import { syncRegions } from '../../../services/ownPlatform/logic';
import { energyGrant } from '../../../services/ownPlatform/languageDesk';
import { absoluteWeek } from '../../../services/boxOfficeSim';
import { ContentFrame, ContentTab } from './ContentFrame';
import { LocalizationDesk } from './LocalizationDesk';
import '../fonts';

export type LocPreviewScreen = 'loc-grid' | 'loc-detail' | 'loc-levels' | 'loc-complete';

const title = (id: string, language: string, offset?: number) => ({
    id,
    source: 'LICENCE' as const,
    title: id,
    genre: 'Drama',
    language,
    cost: 0,
    releaseWeekOffset: offset,
});

const cleared = (countryId: string) => ({
    countryId,
    status: 'APPROVED' as const,
    weeksLeft: 0,
    filedWeekAbsolute: 1,
    note: 'Cleared.',
    acceptedConditions: true,
});

const fixture = (screen: LocPreviewScreen): Player => {
    const shell = { id: 'preview-player', name: 'Ava Stone', age: 28, currentWeek: 14, money: 4_000_000, logs: [] } as Player;
    let platform = createOwnPlatform(shell);
    platform.name = 'Empire+';
    platform.introSeen = true;
    platform.colorChosen = true;
    platform.stage = 'LIVE';
    platform.commissioned = true;
    platform.weeksLive = 14;
    platform.subscribers = 2_400_000;
    platform.catalogue = [
        title('Northline', 'English'),
        title('Harbour Light', 'English'),
        title('Paper Crown', 'English'),
        title('Night Market', 'Hindi'),
        title('Monsoon Office', 'Tamil'),
        title('Second Bell', 'Telugu'),
        title('Glass River', 'Spanish'),
        title('Winter Platform', 'French'),
        title('Red Kilometre', 'Arabic'),
        title('Open Window', 'English', 3),
        title('First Snow', 'Hindi', 6),
        title('Late Train', 'Spanish', 1),
        title('City of Nine', 'English', 8),
    ];
    const levels = screen === 'loc-levels' || screen === 'loc-complete';
    platform.selectedCountryIds = levels ? ['IN', 'BD', 'PK', 'LK'] : ['US', 'GB'];
    platform.applications = platform.selectedCountryIds.map(cleared);
    platform.sites = [
        { cityId: 'bom', scout: 2, workhorse: 8, titan: 4 },
        { cityId: 'del', scout: 1, workhorse: 6, titan: 3 },
        { cityId: 'nyc', scout: 2, workhorse: 4, titan: 2 },
        { cityId: 'lon', scout: 1, workhorse: 3, titan: 1 },
    ];
    platform.books = { ...platform.books!, cash: 120_000_000 };
    platform = syncRegions(platform);
    const grant = energyGrant(platform);
    const week = absoluteWeek(shell.age, shell.currentWeek);
    if (screen === 'loc-levels') {
        platform.languageDesk = {
            energy: grant * 6,
            earnedThisWeek: grant,
            banked: grant * 5,
            earnedWeek: week,
            regions: [{
                id: 'south-asia',
                setup: true,
                subtitles: { level: 1, sub: 1, energy: 4 },
                dubbing: { level: 0, sub: 3, energy: 0 },
            }],
        };
    } else if (screen === 'loc-complete') {
        platform.languageDesk = {
            energy: grant * 4,
            earnedThisWeek: grant,
            banked: grant * 3,
            earnedWeek: week,
            regions: [{
                id: 'south-asia',
                setup: true,
                subtitles: { level: 3, sub: 0, energy: 0 },
                dubbing: { level: 3, sub: 0, energy: 0 },
            }],
        };
    } else {
        platform.languageDesk = {
            energy: grant * 2,
            earnedThisWeek: grant,
            banked: grant,
            earnedWeek: week,
            regions: [],
        };
    }
    return { ...shell, ownPlatform: platform };
};

export const LocalizationPreview: React.FC<{ screen: LocPreviewScreen }> = ({ screen }) => {
    const [player, setPlayer] = useState(() => fixture(screen));
    const [tab, setTab] = useState<ContentTab>('localization');
    const region = screen === 'loc-levels' || screen === 'loc-complete' ? 'south-asia' : 'southeast-asia';
    const focus = screen === 'loc-grid' ? 'grid' : 'detail';
    return (
        <div style={{ minHeight: '100vh', background: '#07080e', overflowX: 'clip' }} data-screen={screen}>
            <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '16px 12px 40px' }}>
                <ContentFrame player={player} tab={tab} onTab={setTab}>
                    {tab === 'localization' ? (
                        <LocalizationDesk player={player} onPlayer={setPlayer} initialId={region} focus={focus} />
                    ) : (
                        <p style={{ color: '#8b93ab' }}>This preview stays on Localization. The other desks are in Operations.</p>
                    )}
                </ContentFrame>
            </div>
        </div>
    );
};
