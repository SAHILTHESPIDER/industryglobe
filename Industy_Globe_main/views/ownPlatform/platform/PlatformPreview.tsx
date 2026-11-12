import React, { useEffect, useState } from 'react';
import { Player } from '../../../types';
import { createOwnPlatform } from '../../../services/ownPlatform/migrate';
import { SERVER_CITIES } from '../../../services/ownPlatform/serverCities';
import { PLAN_TEMPLATES, readDesk } from '../../../services/ownPlatform/platformDesk';
import { PlatformArea, PlatformTab } from './PlatformArea';
import '../fonts';

export type PlatformPreviewScreen = 'plat-tech' | 'plat-tech-detail' | 'plat-tech-ladder' | 'plat-network' | 'plat-offer-pre' | 'plat-offer-post' | 'plat-deals' | 'plat-product' | 'plat-status';

const fixture = (screen: PlatformPreviewScreen): Player => {
    const shell = { id: 'preview-player', name: 'Ava Stone', age: 28, currentWeek: 14, money: 2_000_000, logs: [] } as Player;
    const platform = createOwnPlatform(shell);
    platform.name = 'Northlight';
    platform.colorChosen = true;
    platform.brand = { ...platform.brand!, colorId: 'indigo' };
    platform.selectedCountryIds = ['IN', 'JP'];
    platform.applications = [
        { countryId: 'IN', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: true },
        { countryId: 'JP', status: 'APPROVED', weeksLeft: 0, filedWeekAbsolute: 1, note: 'Cleared.', acceptedConditions: true },
    ];
    platform.plans = PLAN_TEMPLATES.filter(row => row.tier !== 'RENT_BUY').map(row => ({
        id: `plan-${row.tier}`,
        name: row.name,
        monthlyUsd: row.monthlyUsd,
        ads: row.ads,
        freeWithAds: row.freeWithAds,
        downloads: row.downloads,
        quality: row.quality,
        screens: row.screens,
        benefits: row.benefits,
        tier: row.tier,
        sealedAtLaunch: true,
        adIntervalMin: row.ads ? 10 : undefined,
    }));
    platform.titleStore = { rentUsd: 3.99, buyUsd: 14.99 };
    platform.books = { ...platform.books!, cash: 86_000_000 };
    const live = screen !== 'plat-offer-pre';
    platform.stage = live ? 'LIVE' : 'BUILD';
    platform.commissioned = live;
    platform.weeksLive = live ? 18 : 0;
    platform.subscribers = live ? 140_000 : 0;
    platform.uptime = 98;
    const heldBack = new Set(['sin', 'jkt', 'mnl', 'akl']);
    platform.sites = SERVER_CITIES.filter(city => !heldBack.has(city.id)).map((city, index) => ({
        cityId: city.id,
        scout: index % 4 === 0 ? 2 : 1,
        workhorse: index % 3 === 0 ? 2 : index % 5 === 0 ? 0 : 1,
        titan: index % 11 === 0 ? 1 : 0,
    }));
    platform.incidents = screen === 'plat-status' ? [{
        id: 'inc-preview',
        week: 12,
        year: 28,
        cityId: 'bom',
        kind: 'POWER',
        note: 'Mumbai lost a feed for eleven minutes. Playback dipped, then the spare held.',
        open: true,
        uptime: 96,
    }] : [];
    const desk = readDesk(platform);
    desk.owned = {
        ...(desk.owned || {}),
        p1080: 1,
        s51: 1,
        autoscale: 1,
        'phone-web': 1,
        'drm-basic': 1,
        trending: 1,
        'ad-basic': 1,
    };
    desk.techDebt = 7;
    desk.researchPoints = 4632;
    desk.playbackPct = live ? 98 : undefined;
    desk.freshSites = ['blr'];
    desk.freshUnlocks = screen.startsWith('plat-tech') ? ['p1080'] : [];
    desk.revision = 6;
    desk.billing = {
        adBreakMin: 10,
        quarterPct: 10,
        halfPct: 15,
        yearPct: 20,
        promoMonths: 1,
        promoPct: 30,
        yearlyShare: 22,
        tuned: screen === 'plat-deals' || screen === 'plat-offer-post',
    };
    desk.timeline = [
        { id: 'g1', week: 14, year: 28, cityId: 'blr', text: 'New site online in Bengaluru. The busy hour asked for it.' },
        { id: 'g2', week: 11, year: 28, cityId: 'del', text: 'Delhi moved from edge to regional hub.' },
        { id: 'g3', week: 6, year: 28, cityId: 'nyc', text: 'New York opened as the core origin.' },
    ];
    desk.pulses = [
        { regionId: 'ASIA', weeks: [96, 97, 95, 98, 99, 97, 98, 98] },
        { regionId: 'EUROPE', weeks: [99, 98, 99, 97, 98, 99, 99, 98] },
        { regionId: 'NORTH_AMERICA', weeks: [94, 96, 97, 98, 98, 97, 99, 98] },
    ];
    desk.feed = [{ id: 'f1', week: 14, year: 28, tone: 'ok', text: 'Northlight played 98% of starts.' }];
    desk.products = [
        { id: 'web', released: true, stars: 4, featurePct: 80 },
        { id: 'phone', released: true, stars: 3, featurePct: 40 },
        { id: 'tv', released: true, stars: 3, featurePct: 20 },
        { id: 'smart-tv', released: false, stars: 0, featurePct: 0 },
    ];
    desk.lastAdRevenue = 420_000;
    desk.lastSubRevenue = 2_800_000;
    desk.lastChurn = 18000;
    platform.platformDesk = desk;
    if (screen === 'plat-offer-pre') {
        platform.sites = platform.sites.slice(0, 4);
        platform.subscribers = 0;
    }
    return { ...shell, ownPlatform: platform };
};

const tabFor = (screen: PlatformPreviewScreen): PlatformTab => {
    if (screen.startsWith('plat-tech')) return 'tech';
    if (screen === 'plat-network') return 'network';
    if (screen === 'plat-product') return 'product';
    if (screen === 'plat-status') return 'status';
    return 'offer';
};

export const PlatformPreview: React.FC<{ screen: PlatformPreviewScreen }> = ({ screen }) => {
    const [player, setPlayer] = useState(() => fixture(screen));
    const settled = new URLSearchParams(window.location.search).get('settled') === '1';
    useEffect(() => {
        const report = () => {
            document.documentElement.setAttribute('data-h-scroll', String(document.documentElement.scrollWidth - document.documentElement.clientWidth));
        };
        report();
        window.addEventListener('resize', report);
        return () => window.removeEventListener('resize', report);
    }, [screen]);
    return (
        <div className={settled ? 'settled' : ''} style={{ minHeight: '100vh', background: '#07080d' }} data-screen={screen}>
            <PlatformArea
                player={player}
                onPlayer={setPlayer}
                initialTab={tabFor(screen)}
                focusId={screen === 'plat-tech' ? '' : 'hevc'}
                shot={screen === 'plat-tech' ? 'grid' : screen === 'plat-tech-detail' ? 'detail' : screen === 'plat-tech-ladder' ? 'ladder' : undefined}
                editing={screen === 'plat-offer-post'}
                lead={screen === 'plat-deals' ? 'deals' : 'plans'}
            />
        </div>
    );
};
