import {
    AdIntervalMin,
    LaunchRegionId,
    MembershipTier,
    OwnPlatformState,
    PlatformBilling,
    PlatformDeskState,
    PlatformSiteRole,
    PlatformTimelineEvent,
    Player,
    PricingPlan,
} from '../../types';
import { LAUNCH_REGIONS, SERVER_CLASSES, ServerClass, hashString } from './catalog';
import { withLane } from './commercial';
import { addCompanyCash, readCompanyCash } from './companyCash';
import { addRack, cityBill, effectiveSites, rackCount, roomFits, sitesSteady, sitesWeekly } from './infrastructure';
import { regionsFromSites } from './logic';
import { SERVER_CITIES, ServerCity, citiesInRegion, cityById } from './serverCities';

export type SliderKind = 'picture' | 'hdr' | 'colour' | 'sound' | 'codec' | 'scale' | 'playback' | 'devices' | 'drm' | 'ai' | 'family' | 'ads';

export interface RungDef {
    id: string;
    name: string;
    needs: string[];
    needsLabel: string;
    once: number;
    weekly: number;
    debt: number;
    /** Negative means less bandwidth per viewer. */
    load: number;
    demand: number;
    /** Negative means fewer people leave. */
    churn: number;
    ads?: number;
    sparkle?: boolean;
    /** Sits in the "also" list under the ladder. */
    side?: boolean;
    /** Weeks in the lab after the treasury cheque. 0 lands tonight. */
    labWeeks?: number;
    blurb: string;
}

export interface TrackDef {
    id: string;
    section: 'PICTURE & SOUND' | 'STREAMING' | 'VIEWERS & MONEY';
    label: string;
    accent: string;
    glow: string;
    subtitle: string;
    slider: SliderKind;
    /** Tile name before the first rung is owned. */
    emptyName: string;
    rungs: RungDef[];
}

const rung = (row: RungDef): RungDef => row;

export const TECH_TRACKS: TrackDef[] = [
    {
        id: 'picture', section: 'PICTURE & SOUND', label: 'Picture', accent: '#8B7BFF', glow: '#8B7BFF55',
        subtitle: 'PICTURE · A SHARPER FRAME ON EVERY SCREEN', slider: 'picture', emptyName: '480p',
        rungs: [
            rung({ id: 'p480', name: '480p', needs: [], needsLabel: '', once: 0, weekly: 0, debt: 0, load: 0, demand: 0, churn: 0, blurb: 'The picture the service opens with.' }),
            rung({ id: 'p720', name: '720p', needs: ['p480'], needsLabel: 'Needs 480p first.', once: 0, weekly: 0, debt: 0, load: 0, demand: 0, churn: 0, blurb: 'A clean HD-ready frame. Already on the slate.' }),
            rung({ id: 'p1080', name: '1080p', needs: ['p720'], needsLabel: 'Needs 720p first.', once: 6_000_000, weekly: 50_000, debt: 2, load: 0.04, demand: 0.03, churn: -0.004, blurb: 'Full HD. The rung most households notice.' }),
            rung({ id: 'p4k', name: '4K', needs: ['p1080'], needsLabel: 'Needs 1080p first.', once: 12_000_000, weekly: 90_000, debt: 4, load: 0.08, demand: 0.04, churn: -0.005, labWeeks: 4, blurb: 'Four times the frame. Premium plans can promise it.' }),
            rung({ id: 'p8k', name: '8K', needs: ['p4k'], needsLabel: 'Needs 4K first.', once: 22_000_000, weekly: 140_000, debt: 6, load: 0.12, demand: 0.03, churn: -0.003, labWeeks: 6, blurb: 'A showcase rung. Bandwidth feels it.' }),
            rung({ id: 'p12k', name: '12K', needs: ['p8k'], needsLabel: 'Needs 8K first.', once: 36_000_000, weekly: 200_000, debt: 8, load: 0.16, demand: 0.02, churn: -0.002, labWeeks: 8, blurb: 'Past the living room. A few screens can hold it.' }),
            rung({ id: 'p16k', name: '16K', needs: ['p12k'], needsLabel: 'Needs 12K first.', once: 52_000_000, weekly: 280_000, debt: 10, load: 0.2, demand: 0.02, churn: -0.002, labWeeks: 8, blurb: 'Reference picture. The bill is the point.' }),
            rung({ id: 'p24k', name: '24K', needs: ['p16k'], needsLabel: 'Needs 16K first.', once: 80_000_000, weekly: 400_000, debt: 12, load: 0.26, demand: 0.02, churn: -0.002, sparkle: true, labWeeks: 10, blurb: 'The top of the ladder. Almost nobody else is here.' }),
        ],
    },
    {
        id: 'hdr', section: 'PICTURE & SOUND', label: 'HDR', accent: '#3DFFA0', glow: '#3DFFA055',
        subtitle: 'HDR · THE SAME SUNSET, WITH THE LIGHTS ON', slider: 'hdr', emptyName: 'Off',
        rungs: [
            rung({ id: 'hdr', name: 'HDR', needs: ['p1080'], needsLabel: 'Needs 1080p first.', once: 4_000_000, weekly: 30_000, debt: 2, load: 0.03, demand: 0.03, churn: -0.004, blurb: 'Highlights stop clipping. Night scenes keep their shape.' }),
            rung({ id: 'hdr-pro', name: 'HDR Pro', needs: ['hdr', 'p4k'], needsLabel: 'Needs HDR and 4K first.', once: 9_000_000, weekly: 60_000, debt: 3, load: 0.04, demand: 0.03, churn: -0.004, labWeeks: 4, blurb: 'A Dolby Vision style grade. Deeper black, hotter neon.' }),
            rung({ id: 'hdr-ultra', name: 'HDR Ultra', needs: ['hdr-pro', 'p8k'], needsLabel: 'Needs HDR Pro and 8K first.', once: 18_000_000, weekly: 110_000, debt: 5, load: 0.05, demand: 0.02, churn: -0.003, sparkle: true, labWeeks: 6, blurb: 'The reference grade. Masters have to be finished for it.' }),
        ],
    },
    {
        id: 'colour', section: 'PICTURE & SOUND', label: 'Colour', accent: '#FF9A3C', glow: '#FF9A3C55',
        subtitle: 'COLOUR · MORE STEPS BETWEEN BLACK AND WHITE', slider: 'colour', emptyName: '8-bit',
        rungs: [
            rung({ id: 'c8', name: '8-bit', needs: [], needsLabel: '', once: 0, weekly: 0, debt: 0, load: 0, demand: 0, churn: 0, blurb: 'The colour the catalogue already uses.' }),
            rung({ id: 'c10', name: '10-bit', needs: ['c8'], needsLabel: 'Needs 8-bit first.', once: 3_000_000, weekly: 20_000, debt: 1, load: 0.02, demand: 0.02, churn: -0.003, blurb: 'Bands in the sky go away. Standard can advertise it.' }),
            rung({ id: 'c12', name: '12-bit', needs: ['c10'], needsLabel: 'Needs 10-bit first.', once: 8_000_000, weekly: 45_000, debt: 3, load: 0.03, demand: 0.02, churn: -0.002, sparkle: true, blurb: 'A finishing-room gradient. Premium keeps it.' }),
        ],
    },
    {
        id: 'sound', section: 'PICTURE & SOUND', label: 'Sound', accent: '#3DDCFF', glow: '#3DDCFF55',
        subtitle: 'SOUND · THE ROOM GETS BIGGER THAN THE SCREEN', slider: 'sound', emptyName: 'Stereo',
        rungs: [
            rung({ id: 'stereo', name: 'Stereo', needs: [], needsLabel: '', once: 0, weekly: 0, debt: 0, load: 0, demand: 0, churn: 0, blurb: 'Left and right. Every plan can ship this.' }),
            rung({ id: 's51', name: '5.1 Surround', needs: ['stereo'], needsLabel: 'Needs Stereo first.', once: 2_500_000, weekly: 20_000, debt: 1, load: 0.02, demand: 0.02, churn: -0.003, blurb: 'A centre channel and a sub. Dialogue sits in the middle.' }),
            rung({ id: 's71', name: '7.1 Surround', needs: ['s51'], needsLabel: 'Needs 5.1 Surround first.', once: 6_000_000, weekly: 40_000, debt: 2, load: 0.03, demand: 0.02, churn: -0.002, blurb: 'Side channels. Action plays wider than the couch.' }),
            rung({ id: 'atmos', name: 'Atmos', needs: ['s71'], needsLabel: 'Needs 7.1 Surround first.', once: 14_000_000, weekly: 80_000, debt: 4, load: 0.04, demand: 0.03, churn: -0.004, sparkle: true, blurb: 'Object audio. Rain happens above the viewer.' }),
            rung({ id: 'dialogue', name: 'Clear dialogue', needs: ['s51'], needsLabel: 'Needs 5.1 Surround first.', once: 1_800_000, weekly: 12_000, debt: 1, load: 0, demand: 0.02, churn: -0.006, side: true, blurb: 'Voices stay in front of the score. Fewer people rewind.' }),
        ],
    },
    {
        id: 'codec', section: 'STREAMING', label: 'Optimisation', accent: '#C6F54A', glow: '#C6F54A44',
        subtitle: 'OPTIMISATION · LESS LOAD AND COST FOR EVERY VIEWER', slider: 'codec', emptyName: 'H.264',
        rungs: [
            rung({ id: 'h264', name: 'H.264', needs: [], needsLabel: '', once: 0, weekly: 0, debt: 0, load: 0, demand: 0, churn: 0, blurb: 'The codec every old television still opens.' }),
            rung({ id: 'hevc', name: 'HEVC', needs: ['h264'], needsLabel: 'Needs H.264 first.', once: 15_000_000, weekly: 75_000, debt: 3, load: -0.15, demand: 0.01, churn: -0.002, blurb: 'The same picture with about a fifth less data.' }),
            rung({ id: 'av1', name: 'AV1', needs: ['hevc'], needsLabel: 'Needs HEVC first.', once: 28_000_000, weekly: 110_000, debt: 4, load: -0.22, demand: 0.01, churn: -0.002, labWeeks: 5, blurb: 'An open codec. Phones from the last few years can take it.' }),
            rung({ id: 'nextgen', name: 'Next-gen codec', needs: ['av1'], needsLabel: 'Needs AV1 first.', once: 45_000_000, weekly: 160_000, debt: 5, load: -0.28, demand: 0.01, churn: -0.001, labWeeks: 6, blurb: 'Another cut in the bitrate. Encoding farms grow.' }),
            rung({ id: 'neural', name: 'Neural codec', needs: ['nextgen'], needsLabel: 'Needs Next-gen codec first.', once: 70_000_000, weekly: 240_000, debt: 8, load: -0.34, demand: 0.02, churn: -0.002, sparkle: true, labWeeks: 8, blurb: 'A model finishes the frame. Debt climbs with it.' }),
            rung({ id: 'smart-enc', name: 'Smart encoding', needs: ['hevc'], needsLabel: 'Needs HEVC first.', once: 8_000_000, weekly: 40_000, debt: 2, load: -0.06, demand: 0, churn: 0, side: true, blurb: 'Quiet scenes spend fewer bits. Action keeps them.' }),
            rung({ id: 'edge-cache', name: 'Edge cache', needs: ['hevc'], needsLabel: 'Needs HEVC first.', once: 40_000_000, weekly: 200_000, debt: 3, load: -0.1, demand: 0.02, churn: -0.003, side: true, labWeeks: 6, blurb: 'Popular titles sit in the city, not across an ocean.' }),
            rung({ id: 'app-opt', name: 'App optimisation', needs: ['phone-web'], needsLabel: 'Needs Phone and web apps first.', once: 25_000_000, weekly: 125_000, debt: 2, load: -0.05, demand: 0.02, churn: -0.002, side: true, blurb: 'The apps ask for the rung the screen can actually show.' }),
        ],
    },
    {
        id: 'stabilize', section: 'STREAMING', label: 'Stabilization', accent: '#B7BECE', glow: '#B7BECE44',
        subtitle: 'STABILIZATION · THE PICTURE HOLDS WHEN THE NIGHT SURGES', slider: 'scale', emptyName: 'Off',
        rungs: [
            rung({ id: 'autoscale', name: 'Auto-scaling', needs: [], needsLabel: '', once: 5_000_000, weekly: 35_000, debt: 1, load: -0.08, demand: 0.02, churn: -0.004, blurb: 'Rungs drop a step before the spinner appears.' }),
            rung({ id: 'predict', name: 'Predictive', needs: ['autoscale'], needsLabel: 'Needs Auto-scaling first.', once: 9_000_000, weekly: 55_000, debt: 2, load: -0.06, demand: 0.01, churn: -0.003, blurb: 'The busy hour is booked before it arrives.' }),
            rung({ id: 'balance', name: 'Global balance', needs: ['predict'], needsLabel: 'Needs Predictive first.', once: 16_000_000, weekly: 90_000, debt: 3, load: -0.07, demand: 0.02, churn: -0.003, sparkle: true, blurb: 'A city that is full hands the stream to the next one.' }),
            rung({ id: 'low-latency', name: 'Low-latency', needs: ['autoscale'], needsLabel: 'Needs Auto-scaling first.', once: 11_000_000, weekly: 70_000, debt: 2, load: 0.02, demand: 0.02, churn: -0.002, side: true, blurb: 'Live pictures arrive closer to now. Sports feel fairer.' }),
        ],
    },
    {
        id: 'playback', section: 'STREAMING', label: 'Playback', accent: '#7AA2FF', glow: '#7AA2FF55',
        subtitle: 'PLAYBACK · WHAT THE PLAYER DOES WITHOUT BEING ASKED', slider: 'playback', emptyName: 'Off',
        rungs: [
            rung({ id: 'smooth', name: 'Smooth playback', needs: [], needsLabel: '', once: 2_000_000, weekly: 15_000, debt: 1, load: 0, demand: 0.02, churn: -0.005, blurb: 'A longer buffer. Fewer frozen frames.' }),
            rung({ id: 'instant', name: 'Instant start', needs: ['smooth'], needsLabel: 'Needs Smooth playback first.', once: 4_500_000, weekly: 25_000, debt: 1, load: 0.01, demand: 0.02, churn: -0.003, blurb: 'Play begins before the title card finishes.' }),
            rung({ id: 'lossless-start', name: 'Lossless start', needs: ['instant'], needsLabel: 'Needs Instant start first.', once: 9_000_000, weekly: 40_000, debt: 2, load: 0.02, demand: 0.01, churn: -0.002, sparkle: true, blurb: 'The first frame is the master, not a preview.' }),
            rung({ id: 'autoplay', name: 'Autoplay', needs: ['smooth'], needsLabel: 'Needs Smooth playback first.', once: 1_500_000, weekly: 8_000, debt: 1, load: 0.01, demand: 0.03, churn: 0.002, side: true, blurb: 'The next episode starts. Some people love that. Some cancel.' }),
            rung({ id: 'skip-intro', name: 'Skip intro', needs: ['smooth'], needsLabel: 'Needs Smooth playback first.', once: 1_200_000, weekly: 6_000, debt: 0, load: 0, demand: 0.01, churn: -0.003, side: true, blurb: 'A button on the titles. Binge nights get shorter and stickier.' }),
            rung({ id: 'live', name: 'Live events', needs: ['low-latency'], needsLabel: 'Needs Low-latency first.', once: 12_000_000, weekly: 80_000, debt: 3, load: 0.06, demand: 0.04, churn: -0.002, side: true, blurb: 'Premieres and matches, as they happen.' }),
        ],
    },
    {
        id: 'apps', section: 'STREAMING', label: 'Apps and devices', accent: '#2EE6C7', glow: '#2EE6C755',
        subtitle: 'APPS · A DOOR FOR EVERY SCREEN IN THE HOUSE', slider: 'devices', emptyName: 'Off',
        rungs: [
            rung({ id: 'phone-web', name: 'Phone and web apps', needs: [], needsLabel: '', once: 3_000_000, weekly: 20_000, debt: 1, load: 0, demand: 0.04, churn: -0.003, blurb: 'A phone in the pocket and a browser on the desk.' }),
            rung({ id: 'living', name: 'Living room apps', needs: ['phone-web'], needsLabel: 'Needs Phone and web apps first.', once: 6_000_000, weekly: 35_000, debt: 1, load: 0.01, demand: 0.03, churn: -0.003, blurb: 'Smart TVs and the stick under the television.' }),
            rung({ id: 'console', name: 'Console app', needs: ['phone-web'], needsLabel: 'Needs Phone and web apps first.', once: 5_000_000, weekly: 28_000, debt: 1, load: 0.01, demand: 0.02, churn: -0.002, blurb: 'The game console becomes a television at night.' }),
            rung({ id: 'car', name: 'Car app', needs: ['living'], needsLabel: 'Needs Living room apps first.', once: 8_000_000, weekly: 40_000, debt: 2, load: 0.02, demand: 0.02, churn: -0.001, sparkle: true, blurb: 'Passengers watch. The driver does not.' }),
            rung({ id: 'downloads', name: 'Offline downloads', needs: ['phone-web'], needsLabel: 'Needs Phone and web apps first.', once: 4_000_000, weekly: 25_000, debt: 1, load: -0.02, demand: 0.03, churn: -0.004, side: true, blurb: 'A title rides the subway with no signal.' }),
            rung({ id: 'watch-party', name: 'Watch party', needs: ['phone-web'], needsLabel: 'Needs Phone and web apps first.', once: 3_500_000, weekly: 18_000, debt: 1, load: 0.02, demand: 0.02, churn: -0.003, side: true, blurb: 'Friends in different cities share one pause button.' }),
        ],
    },
    {
        id: 'drm', section: 'VIEWERS & MONEY', label: 'Trust and safety', accent: '#E4B15A', glow: '#E4B15A55',
        subtitle: 'TRUST · THE FILE STAYS ON YOUR SERVICE', slider: 'drm', emptyName: 'Off',
        rungs: [
            rung({ id: 'drm-basic', name: 'DRM', needs: [], needsLabel: '', once: 4_000_000, weekly: 30_000, debt: 1, load: 0, demand: -0.01, churn: 0.001, blurb: 'A lock on the stream. Piracy gives up a little ground.' }),
            rung({ id: 'drm-studio', name: 'Studio DRM', needs: ['drm-basic'], needsLabel: 'Needs DRM first.', once: 9_000_000, weekly: 50_000, debt: 2, load: 0, demand: 0.01, churn: 0, blurb: 'Studios will licence the films they were holding back.' }),
            rung({ id: 'drm-forensic', name: 'Forensic watermark', needs: ['drm-studio'], needsLabel: 'Needs Studio DRM first.', once: 14_000_000, weekly: 70_000, debt: 2, load: 0.01, demand: 0.01, churn: 0, blurb: 'A leak can be traced to the account that took it.' }),
            rung({ id: 'drm-mark', name: 'Reference seal', needs: ['drm-forensic'], needsLabel: 'Needs Forensic watermark first.', once: 22_000_000, weekly: 90_000, debt: 3, load: 0.01, demand: 0.02, churn: -0.002, sparkle: true, blurb: 'The full catalogue can be promised without an open door.' }),
        ],
    },
    {
        id: 'ai', section: 'VIEWERS & MONEY', label: 'Smart AI', accent: '#FF7AD9', glow: '#FF7AD955',
        subtitle: 'SMART AI · THE NEXT POSTER IS THE ONE THEY WANTED', slider: 'ai', emptyName: 'Off',
        rungs: [
            rung({ id: 'trending', name: 'Trending rows', needs: [], needsLabel: '', once: 2_000_000, weekly: 15_000, debt: 1, load: 0, demand: 0.03, churn: 0.001, blurb: 'The front row is whatever the country is watching.' }),
            rung({ id: 'recs', name: 'Recommendations', needs: ['trending'], needsLabel: 'Needs Trending rows first.', once: 6_000_000, weekly: 35_000, debt: 2, load: 0, demand: 0.04, churn: -0.004, blurb: 'A row that belongs to one household, not the whole country.' }),
            rung({ id: 'channels', name: 'AI channels', needs: ['recs'], needsLabel: 'Needs Recommendations first.', once: 11_000_000, weekly: 60_000, debt: 4, load: 0.01, demand: 0.04, churn: -0.003, sparkle: true, blurb: 'A channel that never ends, cut from the catalogue by a model.' }),
        ],
    },
    {
        id: 'family', section: 'VIEWERS & MONEY', label: 'Profiles and family', accent: '#F0A6FF', glow: '#F0A6FF44',
        subtitle: 'FAMILY · A DOOR FOR THE KIDS AND A SEAT FOR ONE MORE', slider: 'family', emptyName: 'Off',
        rungs: [
            rung({ id: 'kids', name: 'Kids profiles', needs: [], needsLabel: '', once: 2_200_000, weekly: 12_000, debt: 1, load: 0, demand: 0.03, churn: -0.005, blurb: 'A profile that cannot wander into the other shelf.' }),
            rung({ id: 'parents', name: 'Parental controls', needs: ['kids'], needsLabel: 'Needs Kids profiles first.', once: 1_600_000, weekly: 8_000, debt: 0, load: 0, demand: 0.02, churn: -0.004, blurb: 'A pin, a bedtime, and a cap on what autoplay may start.' }),
            rung({ id: 'household', name: 'Extra member', needs: ['kids'], needsLabel: 'Needs Kids profiles first.', once: 1_400_000, weekly: 10_000, debt: 1, load: 0.01, demand: 0.03, churn: -0.003, sparkle: true, blurb: 'One more person on the plan who does not live in the house.' }),
        ],
    },
    {
        id: 'ads', section: 'VIEWERS & MONEY', label: 'Ads tech', accent: '#FFB020', glow: '#FFB02055',
        subtitle: 'ADS · THE BREAK EARNS MORE WITHOUT EMPTYING THE ROOM', slider: 'ads', emptyName: 'Off',
        rungs: [
            rung({ id: 'ad-basic', name: 'Basic ad server', needs: [], needsLabel: '', once: 3_000_000, weekly: 25_000, debt: 1, load: 0, demand: 0, churn: 0, ads: 0.08, blurb: 'Breaks that actually sell. The cheap plans start to pay.' }),
            rung({ id: 'ad-smart', name: 'Smarter breaks', needs: ['ad-basic'], needsLabel: 'Needs Basic ad server first.', once: 7_000_000, weekly: 40_000, debt: 2, load: 0, demand: 0.01, churn: -0.002, ads: 0.14, blurb: 'The break fits the scene instead of cutting the sentence.' }),
            rung({ id: 'ad-live', name: 'Interactive ads', needs: ['ad-smart'], needsLabel: 'Needs Smarter breaks first.', once: 12_000_000, weekly: 55_000, debt: 3, load: 0.01, demand: 0.01, churn: 0.001, ads: 0.2, blurb: 'A viewer can skip early. The ones who stay pay more.' }),
            rung({ id: 'ad-ref', name: 'Reference ads', needs: ['ad-live'], needsLabel: 'Needs Interactive ads first.', once: 18_000_000, weekly: 80_000, debt: 3, load: 0.01, demand: 0.01, churn: -0.001, ads: 0.26, sparkle: true, blurb: 'The house voice sells the break. Brands pay for the seal.' }),
        ],
    },
];

const RUNG_INDEX = new Map<string, { track: TrackDef; rung: RungDef }>();
TECH_TRACKS.forEach(track => track.rungs.forEach(row => RUNG_INDEX.set(row.id, { track, rung: row })));

export const trackById = (id: string): TrackDef | undefined => TECH_TRACKS.find(row => row.id === id);
export const rungById = (id: string): RungDef | undefined => RUNG_INDEX.get(id)?.rung;
export const trackOfRung = (id: string): TrackDef | undefined => RUNG_INDEX.get(id)?.track;

const FREE_OWNED: Record<string, number> = { p480: 1, p720: 1, c8: 1, stereo: 1, h264: 1 };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const moneyShort = (amount: number): string => {
    if (!Number.isFinite(amount)) return '$0';
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) {
        const millions = abs / 1_000_000;
        const text = millions >= 10 || Math.abs(millions - Math.round(millions)) < 0.05
            ? String(Math.round(millions))
            : millions.toFixed(1);
        return `${sign}$${text}M`;
    }
    if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
    return `${sign}$${Math.round(abs)}`;
};

export const versionCost = (row: RungDef, version: number): { once: number; weekly: number } => {
    const step = version <= 1 ? 1 : version === 2 ? 0.55 : 0.35;
    const weekStep = version <= 1 ? 1 : version === 2 ? 0.6 : 0.45;
    const once = row.once <= 0 && version > 1
        ? (version === 2 ? 400_000 : 900_000)
        : Math.round(row.once * step / 10_000) * 10_000;
    const weekly = row.weekly <= 0 && version > 1
        ? (version === 2 ? 10_000 : 25_000)
        : Math.round(row.weekly * weekStep / 1_000) * 1_000;
    return { once, weekly };
};

export const versionEffect = (row: RungDef, version: number) => {
    const scale = version <= 1 ? 1 : version === 2 ? 1.35 : 1.7;
    return {
        debt: Math.round(row.debt * (version <= 1 ? 1 : version === 2 ? 0.6 : 0.4)),
        load: row.load * scale,
        demand: row.demand * scale,
        churn: row.churn * scale,
        ads: (row.ads || 0) * scale,
    };
};

export const tierWord = (version: number, top: boolean): string => {
    if (version <= 0) return 'not yet';
    if (version === 1) return 'Basic';
    if (version === 2) return 'Studio';
    return top ? 'Reference' : 'Flagship';
};

export interface DeskNote {
    msg: string;
    type: 'positive' | 'negative' | 'neutral';
}

export const emptyDesk = (): PlatformDeskState => ({
    owned: { ...FREE_OWNED },
    research: [],
    freshUnlocks: [],
    techDebt: 0,
    researchPoints: undefined,
    products: [{ id: 'web', released: true, stars: 3, featurePct: 40 }],
    playbackPct: undefined,
    revision: 1,
    autoBuild: true,
});

const KNOWN_RUNGS = new Set(RUNG_INDEX.keys());
const PRODUCT_IDS = new Set(['tv', 'phone', 'web', 'console', 'smart-tv', 'car']);

export const sanitizePlatformDesk = (raw: PlatformDeskState | undefined): PlatformDeskState => {
    const base = emptyDesk();
    if (!raw || typeof raw !== 'object') return base;
    const owned: Record<string, number> = { ...FREE_OWNED };
    if (raw.owned && typeof raw.owned === 'object') {
        Object.entries(raw.owned).forEach(([id, version]) => {
            if (!KNOWN_RUNGS.has(id)) return;
            const next = Math.round(Number(version));
            if (next >= 1 && next <= 3) owned[id] = next;
        });
    }
    const research = (raw.research || []).flatMap(job => {
        if (!job || !KNOWN_RUNGS.has(job.rungId)) return [];
        const version = Math.round(Number(job.version));
        const weeksTotal = Math.max(1, Math.min(16, Math.round(Number(job.weeksTotal) || 1)));
        const weeksLeft = Math.max(1, Math.min(weeksTotal, Math.round(Number(job.weeksLeft) || 1)));
        if (version < 1 || version > 3) return [];
        if ((owned[job.rungId] || 0) >= version) return [];
        return [{ rungId: job.rungId, version, weeksLeft, weeksTotal }];
    }).slice(0, 8);
    const billing = sanitizeBilling(raw.billing);
    const products = (raw.products || []).flatMap(row => {
        if (!row || !PRODUCT_IDS.has(row.id)) return [];
        return [{
            id: row.id,
            released: row.released === true ? true : undefined,
            stars: clamp(Math.round(Number(row.stars) || 0), 0, 5) || undefined,
            featurePct: clamp(Math.round(Number(row.featurePct) || 0), 0, 100) || undefined,
        }];
    });
    if (!products.some(row => row.id === 'web')) products.unshift({ id: 'web', released: true, stars: 3, featurePct: 40 });
    const pulses = (raw.pulses || []).flatMap(row => {
        if (!row || !LAUNCH_REGIONS.some(region => region.id === row.regionId)) return [];
        const weeks = (row.weeks || []).map(value => clamp(Math.round(Number(value) || 0), 0, 100)).slice(-8);
        return weeks.length ? [{ regionId: row.regionId, weeks }] : [];
    });
    const feed = (raw.feed || []).filter(row => row && row.text).slice(0, 16).map(row => ({
        id: String(row.id || `feed-${row.week}`),
        week: Math.round(Number(row.week) || 0),
        year: Math.round(Number(row.year) || 0),
        text: String(row.text).slice(0, 180),
        tone: row.tone === 'ok' || row.tone === 'bad' ? row.tone : 'warn' as const,
    }));
    const timeline = (raw.timeline || []).filter(row => row && row.text).slice(0, 16).map(row => ({
        id: String(row.id),
        week: Math.round(Number(row.week) || 0),
        year: Math.round(Number(row.year) || 0),
        cityId: cityById(row.cityId) ? row.cityId : undefined,
        text: String(row.text).slice(0, 160),
    }));
    const siteRoles: Record<string, PlatformSiteRole> = {};
    if (raw.siteRoles && typeof raw.siteRoles === 'object') {
        Object.entries(raw.siteRoles).forEach(([id, role]) => {
            if (!cityById(id)) return;
            if (role === 'EDGE' || role === 'HUB' || role === 'CORE') siteRoles[id] = role;
        });
    }
    return {
        owned,
        research,
        freshUnlocks: (raw.freshUnlocks || []).filter(id => KNOWN_RUNGS.has(id)).slice(-8),
        techDebt: clamp(Math.round(Number(raw.techDebt) || 0), 0, 100),
        researchPoints: Number.isFinite(Number(raw.researchPoints)) ? Math.max(0, Math.round(Number(raw.researchPoints))) : undefined,
        billing,
        products,
        playbackPct: Number.isFinite(Number(raw.playbackPct)) ? clamp(Math.round(Number(raw.playbackPct)), 0, 100) : undefined,
        pulses: pulses.length ? pulses : undefined,
        feed: feed.length ? feed : undefined,
        lastChurn: Math.max(0, Math.round(Number(raw.lastChurn) || 0)) || undefined,
        lastAdRevenue: Math.max(0, Math.round(Number(raw.lastAdRevenue) || 0)) || undefined,
        lastSubRevenue: Math.max(0, Math.round(Number(raw.lastSubRevenue) || 0)) || undefined,
        siteRoles: Object.keys(siteRoles).length ? siteRoles : undefined,
        timeline: timeline.length ? timeline : undefined,
        freshSites: (raw.freshSites || []).filter(id => cityById(id)).slice(-6),
        revision: Math.max(1, Math.round(Number(raw.revision) || 1)),
        autoBuild: raw.autoBuild === false ? false : true,
    };
};

const sanitizeBilling = (raw: PlatformBilling | undefined): PlatformBilling | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const pct = (value: unknown, max: number) => clamp(Math.round(Number(value) || 0), 0, max);
    const ad = raw.adBreakMin;
    const next: PlatformBilling = {
        quarterPct: pct(raw.quarterPct, 40) || undefined,
        halfPct: pct(raw.halfPct, 40) || undefined,
        yearPct: pct(raw.yearPct, 50) || undefined,
        promoMonths: clamp(Math.round(Number(raw.promoMonths) || 0), 0, 3) || undefined,
        promoPct: pct(raw.promoPct, 90) || undefined,
        yearlyShare: Number.isFinite(Number(raw.yearlyShare)) ? clamp(Math.round(Number(raw.yearlyShare)), 0, 80) : undefined,
        adBreakMin: ad === 5 || ad === 10 || ad === 15 || ad === 20 ? ad : undefined,
        tuned: raw.tuned === true ? true : undefined,
    };
    const empty = !next.quarterPct && !next.halfPct && !next.yearPct && !next.promoMonths && !next.promoPct && !next.adBreakMin && !next.tuned;
    return empty ? undefined : next;
};

export const readDesk = (state: OwnPlatformState): PlatformDeskState => sanitizePlatformDesk(state.platformDesk);

export const pointPool = (state: OwnPlatformState, desk: PlatformDeskState): number => {
    if (Number.isFinite(desk.researchPoints)) return desk.researchPoints as number;
    return 1200 + state.weeksLive * 40 + Math.round(state.subscribers / 8000);
};

export const pointsToSpend = (once: number): number => Math.max(40, Math.round(once / 20_000) || 40);

export interface PlatformFactors {
    demand: number;
    retention: number;
    bandwidth: number;
    quality: number;
    adBoost: number;
}

export const platformFactors = (state: OwnPlatformState): PlatformFactors => {
    const desk = state.platformDesk ? sanitizePlatformDesk(state.platformDesk) : undefined;
    if (!desk) return { demand: 1, retention: 1, bandwidth: 1, quality: 1, adBoost: 1 };
    let demand = 0;
    let churn = 0;
    let load = 0;
    let ads = 0;
    Object.entries(desk.owned || {}).forEach(([id, version]) => {
        const row = rungById(id);
        if (!row || version < 1) return;
        const effect = versionEffect(row, version);
        demand += effect.demand;
        churn += effect.churn;
        load += effect.load;
        ads += effect.ads;
    });
    const debt = (desk.techDebt || 0) / 100;
    return {
        demand: clamp(1 + demand - debt * 0.08, 0.75, 1.5),
        retention: clamp(1 - churn - debt * 0.12, 0.7, 1.3),
        bandwidth: clamp(1 + load, 0.5, 1.45),
        quality: clamp(1 + demand * 0.25, 0.9, 1.25),
        adBoost: clamp(1 + ads, 1, 1.4),
    };
};

export const factorsAreIdentity = (factors: PlatformFactors): boolean =>
    factors.demand === 1 && factors.retention === 1 && factors.bandwidth === 1 && factors.quality === 1 && factors.adBoost === 1;

export const techWeeklyBill = (state: OwnPlatformState): number => {
    const desk = state.platformDesk;
    if (!desk?.owned) return 0;
    return Object.entries(desk.owned).reduce((sum, [id, version]) => {
        const row = rungById(id);
        if (!row) return sum;
        return sum + versionCost(row, version).weekly;
    }, 0);
};

const missingNeeds = (desk: PlatformDeskState, row: RungDef): string[] =>
    row.needs.filter(id => (desk.owned?.[id] || 0) < 1);

export const nextVersion = (desk: PlatformDeskState, row: RungDef): number => Math.min(3, (desk.owned?.[row.id] || 0) + 1);

const clonePlayer = (player: Player, state: OwnPlatformState): Player => {
    const books = state.books
        ? { ...state.books, lines: [...(state.books.lines || [])], history: [...(state.books.history || [])] }
        : state.books;
    return { ...player, ownPlatform: { ...state, books } };
};

export const unlockRung = (player: Player, rungId: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'No company on the books.' };
    const found = RUNG_INDEX.get(rungId);
    if (!found) return { player, error: 'That rung is not on the ladder.' };
    const desk = readDesk(state);
    const owned = desk.owned?.[rungId] || 0;
    if (owned >= 3) return { player, error: 'That rung is already at Reference.' };
    const version = owned + 1;
    const missing = missingNeeds(desk, found.rung);
    if (missing.length) {
        const name = rungById(missing[0])?.name || 'the rung below';
        return { player, error: `Needs ${name} first.` };
    }
    if ((desk.research || []).some(job => job.rungId === rungId)) return { player, error: 'That rung is already in the lab.' };
    const price = versionCost(found.rung, version);
    const points = pointsToSpend(price.once);
    if (pointPool(state, desk) < points) return { player, error: 'The lab is short on research points. Personal cash cannot buy them.' };
    if (price.once > 0 && readCompanyCash(player) < price.once) {
        return { player, error: `Company cash is short ${moneyShort(price.once - readCompanyCash(player))}. Personal cash is not used.` };
    }
    const research = [...(desk.research || [])];
    const ownedNext = { ...(desk.owned || {}) };
    const fresh = [...(desk.freshUnlocks || [])];
    let debt = desk.techDebt || 0;
    const weeks = version === 1 ? (found.rung.labWeeks || 0) : Math.max(0, Math.round((found.rung.labWeeks || 0) / 2));
    if (weeks > 0) {
        research.push({ rungId, version, weeksLeft: weeks, weeksTotal: weeks });
    } else {
        ownedNext[rungId] = version;
        fresh.push(rungId);
        debt = clamp(debt + versionEffect(found.rung, version).debt, 0, 100);
    }
    const nextDesk: PlatformDeskState = {
        ...desk,
        owned: ownedNext,
        research,
        freshUnlocks: fresh.slice(-8),
        techDebt: debt,
        researchPoints: pointPool(state, desk) - points,
    };
    const nextState: OwnPlatformState = { ...state, platformDesk: nextDesk };
    const copy = clonePlayer(player, nextState);
    if (price.once > 0) addCompanyCash(copy, -price.once, `${found.rung.name} version ${version}`, 'BURN');
    return { player: copy };
};

export const clearFresh = (state: OwnPlatformState): OwnPlatformState => {
    const desk = readDesk(state);
    if (!desk.freshUnlocks?.length && !desk.freshSites?.length) return state;
    return { ...state, platformDesk: { ...desk, freshUnlocks: [], freshSites: [] } };
};

export interface LadderRow {
    rung: RungDef;
    version: number;
    state: 'done' | 'next' | 'research' | 'locked';
    weeksLeft?: number;
    weeksTotal?: number;
    price: { once: number; weekly: number };
    top: boolean;
}

export const ladderFor = (track: TrackDef, desk: PlatformDeskState, side = false): LadderRow[] => {
    const rows = track.rungs.filter(row => Boolean(row.side) === side);
    const topId = rows.filter(row => !row.side).slice(-1)[0]?.id || rows.slice(-1)[0]?.id;
    return rows.map(row => {
        const version = desk.owned?.[row.id] || 0;
        const job = (desk.research || []).find(item => item.rungId === row.id);
        const missing = missingNeeds(desk, row);
        const mode: LadderRow['state'] = job ? 'research' : version > 0 && version >= 3 ? 'done' : version > 0 ? 'done' : missing.length ? 'locked' : 'next';
        const next = Math.min(3, version + 1);
        return {
            rung: row,
            version,
            state: version >= 3 && !job ? 'done' : mode,
            weeksLeft: job?.weeksLeft,
            weeksTotal: job?.weeksTotal,
            price: versionCost(row, version >= 3 ? 3 : next),
            top: row.id === topId || Boolean(row.sparkle),
        };
    });
};

export const currentRung = (track: TrackDef, desk: PlatformDeskState): RungDef | undefined => {
    const main = track.rungs.filter(row => !row.side && (desk.owned?.[row.id] || 0) > 0);
    return main[main.length - 1];
};

export const tileLevel = (track: TrackDef, desk: PlatformDeskState): { name: string; tier: string; dots: number; top: boolean } => {
    const row = currentRung(track, desk);
    if (!row) return { name: track.emptyName, tier: 'not yet', dots: 0, top: false };
    const version = desk.owned?.[row.id] || 0;
    const mains = track.rungs.filter(item => !item.side);
    const top = row.id === mains[mains.length - 1]?.id && version >= 3;
    return { name: row.name, tier: tierWord(version, top), dots: version, top };
};

export const inferTier = (plan: PricingPlan): MembershipTier => {
    if (plan.tier) return plan.tier;
    if (plan.freeWithAds || plan.monthlyUsd <= 0) return 'FREE_ADS';
    if (plan.ads && plan.monthlyUsd < 9) return 'BASIC_ADS';
    if (plan.benefits?.includes('PREMIUM') || plan.quality === '4K' || plan.monthlyUsd >= 16) return 'PREMIUM';
    return 'STANDARD';
};

const TIER_RANK: Record<MembershipTier, number> = {
    FREE_ADS: 0, BASIC_ADS: 1, STANDARD: 2, PREMIUM: 3, RENT_BUY: 3, CUSTOM: 2,
};

const owned = (desk: PlatformDeskState, id: string) => (desk.owned?.[id] || 0) >= 1;

const bestPicture = (desk: PlatformDeskState): string => {
    const order = ['p24k', 'p16k', 'p12k', 'p8k', 'p4k', 'p1080', 'p720', 'p480'];
    return rungById(order.find(id => owned(desk, id)) || 'p480')?.name || '480p';
};

export interface CompareCell {
    text: string;
    locked: boolean;
    rungId?: string;
}

const lock = (rungId: string): CompareCell => ({ text: 'Locked', locked: true, rungId });
const open = (text: string): CompareCell => ({ text, locked: false });

export const COMPARE_ROWS: { id: string; label: string; cell: (plan: PricingPlan, desk: PlatformDeskState) => CompareCell }[] = [
    { id: 'ads', label: 'Ads', cell: plan => open(plan.ads || plan.freeWithAds ? 'Yes' : 'None') },
    { id: 'picture', label: 'Picture', cell: (plan, desk) => {
        const tier = inferTier(plan);
        const want = tier === 'FREE_ADS' ? 'p480' : tier === 'BASIC_ADS' ? 'p720' : tier === 'STANDARD' || tier === 'CUSTOM' ? 'p1080' : 'p4k';
        if (!owned(desk, want)) return lock(want);
        return open(bestPicture(desk));
    } },
    { id: 'hdr', label: 'HDR', cell: (plan, desk) => {
        const tier = inferTier(plan);
        if (TIER_RANK[tier] < 3 && tier !== 'RENT_BUY') return open('No');
        if (!owned(desk, 'hdr')) return lock('hdr');
        if (owned(desk, 'hdr-ultra')) return open('HDR Ultra');
        if (owned(desk, 'hdr-pro')) return open('HDR Pro');
        return open('HDR');
    } },
    { id: 'colour', label: 'Colour', cell: (plan, desk) => {
        const tier = inferTier(plan);
        if (TIER_RANK[tier] >= 3 && !owned(desk, 'c12')) return owned(desk, 'c10') ? open('10-bit') : lock('c10');
        if (TIER_RANK[tier] >= 2 && !owned(desk, 'c10')) return lock('c10');
        if (owned(desk, 'c12') && TIER_RANK[tier] >= 3) return open('12-bit');
        if (owned(desk, 'c10') && TIER_RANK[tier] >= 2) return open('10-bit');
        return open('8-bit');
    } },
    { id: 'sound', label: 'Sound', cell: (plan, desk) => {
        const tier = inferTier(plan);
        if (TIER_RANK[tier] >= 3) {
            if (owned(desk, 'atmos')) return open('Atmos');
            if (!owned(desk, 's51')) return lock('s51');
            return open(owned(desk, 's71') ? '7.1' : '5.1');
        }
        if (TIER_RANK[tier] >= 2) return owned(desk, 's51') ? open('5.1') : lock('s51');
        return open('Stereo');
    } },
    { id: 'dialogue', label: 'Clear dialogue', cell: (plan, desk) => {
        if (TIER_RANK[inferTier(plan)] < 2) return open('No');
        return owned(desk, 'dialogue') ? open('On') : lock('dialogue');
    } },
    { id: 'devices', label: 'Devices', cell: (_plan, desk) => {
        const count = ['phone-web', 'living', 'console', 'car'].filter(id => owned(desk, id)).length;
        if (!count) return lock('phone-web');
        return open(String(count));
    } },
    { id: 'screens', label: 'Screens', cell: plan => open(String(plan.screens)) },
    { id: 'downloads', label: 'Downloads', cell: (plan, desk) => {
        if (!plan.downloads && inferTier(plan) !== 'PREMIUM' && inferTier(plan) !== 'RENT_BUY') return open('No');
        return owned(desk, 'downloads') ? open('Yes') : lock('downloads');
    } },
    { id: 'kids', label: 'Kids profiles', cell: (plan, desk) => {
        if (TIER_RANK[inferTier(plan)] < 2) return open('No');
        return owned(desk, 'kids') ? open('Yes') : lock('kids');
    } },
    { id: 'ai', label: 'AI channels', cell: (plan, desk) => {
        if (TIER_RANK[inferTier(plan)] < 3) return open('No');
        return owned(desk, 'channels') ? open('Yes') : lock('channels');
    } },
    { id: 'autoplay', label: 'Autoplay', cell: (plan, desk) => {
        if (TIER_RANK[inferTier(plan)] < 2) return open('No');
        return owned(desk, 'autoplay') ? open('On') : lock('autoplay');
    } },
    { id: 'premieres', label: 'Early premieres', cell: (plan, desk) => {
        if (TIER_RANK[inferTier(plan)] < 3) return open('No');
        return owned(desk, 'live') ? open('Yes') : lock('live');
    } },
    { id: 'live', label: 'Live events', cell: (plan, desk) => {
        if (TIER_RANK[inferTier(plan)] < 3) return open('No');
        return owned(desk, 'live') ? open('Yes') : lock('live');
    } },
    { id: 'extra', label: 'Extra member', cell: (plan, desk) => {
        if (TIER_RANK[inferTier(plan)] < 3) return open('No');
        return owned(desk, 'household') ? open('Yes') : lock('household');
    } },
    { id: 'catalogue', label: 'Full catalogue', cell: (plan, desk) => {
        if (inferTier(plan) === 'FREE_ADS') return open('Limited');
        return owned(desk, 'drm-mark') || owned(desk, 'drm-studio') ? open('All titles') : lock('drm-studio');
    } },
];

export const PLAN_TEMPLATES: { tier: MembershipTier; name: string; monthlyUsd: number; ads: boolean; freeWithAds?: boolean; downloads: boolean; quality: PricingPlan['quality']; screens: number; benefits?: PricingPlan['benefits'] }[] = [
    { tier: 'FREE_ADS', name: 'Free with ads', monthlyUsd: 0, ads: true, freeWithAds: true, downloads: false, quality: 'SD', screens: 1 },
    { tier: 'BASIC_ADS', name: 'Basic with ads', monthlyUsd: 6.99, ads: true, downloads: false, quality: 'HD', screens: 1 },
    { tier: 'STANDARD', name: 'Standard', monthlyUsd: 11, ads: false, downloads: true, quality: 'HD', screens: 2 },
    { tier: 'PREMIUM', name: 'Premium', monthlyUsd: 17.99, ads: false, downloads: true, quality: '4K', screens: 4, benefits: ['PREMIUM', 'EARLY_ACCESS'] },
];

export const planSubscribers = (state: OwnPlatformState): Record<string, number> => {
    const active = state.plans.filter(plan => plan.enabled !== false);
    const stored = active.reduce((sum, plan) => sum + (Number.isFinite(plan.subscribers) ? (plan.subscribers as number) : 0), 0);
    const close = state.subscribers > 0 && Math.abs(stored - state.subscribers) <= Math.max(5, state.subscribers * 0.02);
    if (close && active.every(plan => Number.isFinite(plan.subscribers))) {
        return Object.fromEntries(state.plans.map(plan => [plan.id, plan.enabled === false ? 0 : (plan.subscribers || 0)]));
    }
    const weights = active.map(plan => plan.freeWithAds ? 1.4 : Math.max(0.2, 1.3 - (plan.monthlyUsd || 0) / 28));
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const out: Record<string, number> = {};
    let left = state.subscribers;
    active.forEach((plan, index) => {
        const count = index === active.length - 1 ? left : Math.round(state.subscribers * weights[index] / total);
        out[plan.id] = Math.max(0, count);
        left -= out[plan.id];
    });
    state.plans.forEach(plan => { if (!(plan.id in out)) out[plan.id] = 0; });
    return out;
};

const stampPlans = (state: OwnPlatformState) => {
    const split = planSubscribers({ ...state, plans: state.plans.map(plan => ({ ...plan, subscribers: undefined })) });
    state.plans.forEach(plan => { plan.subscribers = split[plan.id] || 0; });
};

export const setAdBreak = (state: OwnPlatformState, minutes: 5 | 10 | 15 | 20): OwnPlatformState => {
    const desk = readDesk(state);
    const plans = state.plans.map(plan => (plan.ads || plan.freeWithAds) ? { ...plan, ads: true, adIntervalMin: minutes as AdIntervalMin } : plan);
    const lanes = plans.some(plan => plan.ads) ? withLane(state.revenueLanes, 'ADVERTISING', true) : state.revenueLanes;
    return {
        ...state,
        plans,
        revenueLanes: lanes,
        platformDesk: { ...desk, billing: { ...(desk.billing || {}), adBreakMin: minutes, tuned: true } },
    };
};

export const setBillingField = (state: OwnPlatformState, patch: Partial<PlatformBilling>): OwnPlatformState => {
    const desk = readDesk(state);
    const billing: PlatformBilling = { ...(desk.billing || {}), ...patch, tuned: true };
    let plans = state.plans.map(plan => ({ ...plan }));
    if (patch.yearPct != null) {
        const year = clamp(Math.round(patch.yearPct), 0, 50);
        billing.yearPct = year || undefined;
        plans = plans.map(plan => plan.freeWithAds ? plan : { ...plan, annualDiscountPct: year || undefined });
    }
    if (patch.promoPct != null || patch.promoMonths != null) {
        const promo = clamp(Math.round(billing.promoPct || 0), 0, 90);
        const months = clamp(Math.round(billing.promoMonths || 0), 0, 3);
        billing.promoPct = promo || undefined;
        billing.promoMonths = months || undefined;
        const weeks = Math.min(13, months * 4);
        plans = plans.map(plan => plan.freeWithAds ? plan : {
            ...plan,
            introDiscountPct: promo && months ? promo : undefined,
            introWeeks: promo && months ? Math.max(1, weeks) : undefined,
        });
    }
    if (patch.quarterPct != null) billing.quarterPct = clamp(Math.round(patch.quarterPct), 0, 40) || undefined;
    if (patch.halfPct != null) billing.halfPct = clamp(Math.round(patch.halfPct), 0, 40) || undefined;
    return { ...state, plans, platformDesk: { ...desk, billing } };
};

export const togglePlan = (state: OwnPlatformState, id: string, on: boolean): { state: OwnPlatformState; error?: string } => {
    if (state.stage !== 'LIVE') return { state, error: 'Plans set at launch stay locked until launch.' };
    const enabled = state.plans.filter(plan => plan.enabled !== false && plan.id !== id);
    if (!on && enabled.length === 0) return { state, error: 'Keep at least one plan on.' };
    return { state: { ...state, plans: state.plans.map(plan => plan.id === id ? { ...plan, enabled: on ? undefined : false } : plan) } };
};

export const setPlanPrice = (state: OwnPlatformState, id: string, monthlyUsd: number): { state: OwnPlatformState; error?: string } => {
    if (state.stage !== 'LIVE') return { state, error: 'Plans set at launch stay locked until launch.' };
    const plan = state.plans.find(row => row.id === id);
    if (!plan) return { state, error: 'That plan is gone.' };
    if (plan.freeWithAds) return { state, error: 'Free with ads stays at $0.' };
    if (!Number.isFinite(monthlyUsd) || monthlyUsd < 0.99 || monthlyUsd > 100) return { state, error: 'Paid plans stay between $0.99 and $100.' };
    const price = Math.round(monthlyUsd * 100) / 100;
    return { state: { ...state, plans: state.plans.map(row => row.id === id ? { ...row, monthlyUsd: price } : row) } };
};

export const removePlan = (state: OwnPlatformState, id: string, moveTo: string | 'cancel'): { state: OwnPlatformState; error?: string } => {
    if (state.stage !== 'LIVE') return { state, error: 'Plans set at launch stay locked until launch.' };
    if (state.plans.length < 2) return { state, error: 'Keep at least one plan.' };
    const split = planSubscribers(state);
    const moving = split[id] || 0;
    const rest = state.plans.filter(plan => plan.id !== id);
    if (moveTo !== 'cancel' && !rest.some(plan => plan.id === moveTo)) return { state, error: 'Pick a plan to catch them.' };
    const subscribers = moveTo === 'cancel' ? Math.max(0, state.subscribers - moving) : state.subscribers;
    const plans = rest.map(plan => plan.id === moveTo ? { ...plan, subscribers: (split[plan.id] || 0) + moving } : { ...plan, subscribers: split[plan.id] || 0 });
    return { state: { ...state, subscribers, plans } };
};

export const addPlan = (state: OwnPlatformState, tier: MembershipTier, custom?: { name: string; monthlyUsd: number }): { state: OwnPlatformState; error?: string } => {
    if (state.stage !== 'LIVE') return { state, error: 'Add a plan after launch. The slate is locked until then.' };
    if (tier === 'RENT_BUY') {
        const titleStore = state.titleStore?.rentUsd || state.titleStore?.buyUsd
            ? state.titleStore
            : { rentUsd: 3.99, buyUsd: 14.99 };
        return {
            state: {
                ...state,
                titleStore,
                revenueLanes: withLane(withLane(state.revenueLanes, 'RENTAL', true), 'PURCHASE', true),
            },
        };
    }
    if (tier !== 'CUSTOM' && state.plans.some(plan => inferTier(plan) === tier)) return { state, error: 'That tier is already on the slate.' };
    const template = PLAN_TEMPLATES.find(row => row.tier === tier);
    const name = (custom?.name || template?.name || 'Custom').trim().slice(0, 32);
    if (!name) return { state, error: 'Name the plan.' };
    const monthlyUsd = tier === 'CUSTOM' ? Math.round((custom?.monthlyUsd || 9.99) * 100) / 100 : (template?.monthlyUsd || 9.99);
    if (tier === 'CUSTOM' && (monthlyUsd < 0.99 || monthlyUsd > 100)) return { state, error: 'Paid plans stay between $0.99 and $100.' };
    const plan: PricingPlan = {
        id: `plan-${tier.toLowerCase()}-${state.plans.length + 1}`,
        name,
        monthlyUsd: template?.freeWithAds ? 0 : monthlyUsd,
        ads: template?.ads || false,
        freeWithAds: template?.freeWithAds,
        downloads: template?.downloads || false,
        quality: template?.quality || 'HD',
        screens: template?.screens || 1,
        benefits: template?.benefits,
        tier,
        adIntervalMin: template?.ads ? (state.platformDesk?.billing?.adBreakMin || 15) : undefined,
    };
    const lanes = plan.ads ? withLane(state.revenueLanes, 'ADVERTISING', true) : state.revenueLanes;
    return { state: { ...state, plans: [...state.plans, plan], revenueLanes: lanes } };
};

export const reachKm = (city: ServerCity, scout: number, workhorse: number, titan: number): number => {
    const best = titan > 0 ? 1040 : workhorse > 0 ? 520 : 296;
    const racks = scout + workhorse + titan;
    return Math.round(best * (0.86 + city.costIndex * 0.12) + Math.max(0, racks - 1) * 70);
};

export interface SiteRow {
    city: ServerCity;
    scout: number;
    workhorse: number;
    titan: number;
    racks: number;
    role: PlatformSiteRole;
    reach: number;
    health: number;
    peak: number;
}

const roleOf = (desk: PlatformDeskState, cityId: string, derived: PlatformSiteRole): PlatformSiteRole =>
    desk.siteRoles?.[cityId] || derived;

export const siteRows = (state: OwnPlatformState): SiteRow[] => {
    const desk = readDesk(state);
    const sites = effectiveSites(state);
    const byRegion = new Map<LaunchRegionId, { id: string; racks: number }[]>();
    sites.forEach(row => {
        const city = cityById(row.cityId);
        if (!city) return;
        const list = byRegion.get(city.regionId) || [];
        list.push({ id: row.cityId, racks: rackCount(row) });
        byRegion.set(city.regionId, list);
    });
    const derived = new Map<string, PlatformSiteRole>();
    let corePicked = false;
    byRegion.forEach(list => {
        list.sort((a, b) => b.racks - a.racks);
        list.forEach((row, index) => {
            if (!corePicked && index === 0) {
                derived.set(row.id, 'CORE');
                corePicked = true;
            } else if (index === 0) derived.set(row.id, 'HUB');
            else derived.set(row.id, 'EDGE');
        });
    });
    const subs = Math.max(0, state.subscribers);
    return sites.flatMap(row => {
        const city = cityById(row.cityId);
        if (!city) return [];
        const bill = cityBill(row, true);
        const share = Math.max(0.08, 1 / Math.max(1, sites.length));
        const peak = bill.steady > 0 ? clamp(subs * share / bill.steady, 0, 1.4) : 0;
        const health = bill.limiting === 'NONE' ? clamp(96 - peak * 20, 70, 99) : clamp(78 - peak * 25, 40, 80);
        return [{
            city,
            scout: row.scout,
            workhorse: row.workhorse,
            titan: row.titan,
            racks: rackCount(row),
            role: roleOf(desk, row.cityId, derived.get(row.cityId) || 'EDGE'),
            reach: reachKm(city, row.scout, row.workhorse, row.titan),
            health,
            peak,
        }];
    }).sort((a, b) => roleRank(a.role) - roleRank(b.role) || b.racks - a.racks || a.city.name.localeCompare(b.city.name));
};

const roleRank = (role: PlatformSiteRole) => role === 'CORE' ? 0 : role === 'HUB' ? 1 : 2;

export const roleLabel = (role: PlatformSiteRole): string =>
    role === 'CORE' ? 'Core origin' : role === 'HUB' ? 'Regional hub' : 'Edge';

export const networkStats = (state: OwnPlatformState) => {
    const rows = siteRows(state);
    const sites = effectiveSites(state);
    const steady = sitesSteady(sites);
    const weekly = sitesWeekly(sites) + techWeeklyBill(state);
    const load = steady > 0 ? clamp(state.subscribers / steady, 0, 1.5) : 0;
    const regionsLive = new Set(rows.map(row => row.city.regionId));
    return { rows, steady, weekly, load, cities: rows.length, regionsLive: regionsLive.size, revision: readDesk(state).revision || 1 };
};

export const suggestCities = (state: OwnPlatformState): ServerCity[] => {
    const taken = new Set(effectiveSites(state).map(row => row.cityId));
    const wanted = new Set(state.selectedCountryIds);
    const pool = SERVER_CITIES.filter(city => !taken.has(city.id));
    const ranked = pool.sort((a, b) => {
        const aHit = wanted.has(a.countryId) ? 1 : 0;
        const bHit = wanted.has(b.countryId) ? 1 : 0;
        return bHit - aHit || b.roomRacks - a.roomRacks || a.costIndex - b.costIndex;
    });
    return ranked.slice(0, 6);
};

const serverBy = (id: ServerClass['id']): ServerClass => SERVER_CLASSES.find(row => row.id === id) || SERVER_CLASSES[0];

export const buyServer = (player: Player, cityId: string, box: 'scout' | 'workhorse' | 'titan'): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'No company on the books.' };
    const city = cityById(cityId);
    if (!city) return { player, error: 'That city is not on the map.' };
    const sites = effectiveSites(state).map(row => ({ ...row }));
    const existing = sites.find(row => row.cityId === cityId);
    if (!roomFits(existing, city, box)) return { player, error: `${city.name} is out of power, cooling, or fibre for another rack.` };
    const spec = serverBy(box === 'scout' ? 'SCOUT' : box === 'workhorse' ? 'WORKHORSE' : 'TITAN');
    const once = Math.round(spec.onceUsd * city.costIndex);
    if (readCompanyCash(player) < once) return { player, error: `Company cash is short ${moneyShort(once - readCompanyCash(player))}. Personal cash is not used.` };
    const nextSites = addRack(sites, cityId, box);
    const desk = readDesk(state);
    const fresh = existing ? desk.freshSites || [] : [...(desk.freshSites || []), cityId];
    const timeline = pushTimeline(player, desk, `${existing ? 'Another rack' : 'New site online'} in ${city.name}.`, cityId);
    const next: OwnPlatformState = {
        ...state,
        sites: nextSites,
        regions: state.regions.length ? regionsFromSites(state, nextSites) : state.regions,
        platformDesk: { ...desk, freshSites: fresh.slice(-6), timeline, revision: (desk.revision || 1) + 1 },
    };
    const copy = clonePlayer(player, next);
    addCompanyCash(copy, -once, `${city.name} ${spec.name} rack`, 'BURN');
    return { player: copy };
};

const PROMOTE: Record<PlatformSiteRole, { next: PlatformSiteRole; cost: number; box: 'workhorse' | 'titan' } | null> = {
    EDGE: { next: 'HUB', cost: 2_500_000, box: 'workhorse' },
    HUB: { next: 'CORE', cost: 8_000_000, box: 'titan' },
    CORE: null,
};

export const promoteSite = (player: Player, cityId: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'No company on the books.' };
    const row = siteRows(state).find(site => site.city.id === cityId);
    if (!row) return { player, error: 'Build the site before you promote it.' };
    const step = PROMOTE[row.role];
    if (!step) return { player, error: `${row.city.name} is already a core origin.` };
    const spec = serverBy(step.box === 'workhorse' ? 'WORKHORSE' : 'TITAN');
    const rackOnce = Math.round(spec.onceUsd * row.city.costIndex);
    const total = step.cost + rackOnce;
    if (readCompanyCash(player) < total) return { player, error: `Company cash is short ${moneyShort(total - readCompanyCash(player))}. Personal cash is not used.` };
    const desk = readDesk(state);
    const roles = { ...(desk.siteRoles || {}) };
    siteRows(state).forEach(site => { roles[site.city.id] = site.role; });
    if (step.next === 'CORE') {
        Object.keys(roles).forEach(id => { if (roles[id] === 'CORE') roles[id] = 'HUB'; });
    }
    roles[cityId] = step.next;
    const staged = { ...player, ownPlatform: { ...state, platformDesk: { ...desk, siteRoles: roles } } };
    const copy = clonePlayer(staged, staged.ownPlatform!);
    addCompanyCash(copy, -step.cost, `${row.city.name} promoted to ${roleLabel(step.next)}`, 'BURN');
    return buyServer(copy, cityId, step.box);
};

const pushTimeline = (player: Player, desk: PlatformDeskState, text: string, cityId?: string): PlatformTimelineEvent[] => ([
    { id: `grow-${player.currentWeek}-${desk.timeline?.length || 0}-${cityId || 'net'}`, week: player.currentWeek, year: player.age, cityId, text },
    ...(desk.timeline || []),
]).slice(0, 12);

export const PRODUCT_DEFS: { id: string; name: string; line: string; cost: number; featureCost: number }[] = [
    { id: 'tv', name: 'TV app', line: 'The ten-foot picture. The remote is the whole interface.', cost: 4_000_000, featureCost: 600_000 },
    { id: 'phone', name: 'Phone app', line: 'Downloads, portraits, and a commute.', cost: 3_000_000, featureCost: 450_000 },
    { id: 'web', name: 'Web', line: 'A browser is enough to press play.', cost: 1_500_000, featureCost: 300_000 },
    { id: 'console', name: 'Console', line: 'The game box becomes the television.', cost: 3_500_000, featureCost: 500_000 },
    { id: 'smart-tv', name: 'Smart TV', line: 'The set turns on and the service is already there.', cost: 5_000_000, featureCost: 700_000 },
    { id: 'car', name: 'Car', line: 'The back seat, not the driver.', cost: 4_500_000, featureCost: 650_000 },
];

export const shipProduct = (player: Player, id: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'No company on the books.' };
    const spec = PRODUCT_DEFS.find(row => row.id === id);
    if (!spec) return { player, error: 'Unknown app.' };
    const desk = readDesk(state);
    const products = desk.products || [];
    const current = products.find(row => row.id === id);
    if (current?.released) return { player, error: `${spec.name} is already on devices.` };
    if (readCompanyCash(player) < spec.cost) return { player, error: `Company cash is short ${moneyShort(spec.cost - readCompanyCash(player))}. Personal cash is not used.` };
    const nextProducts = products.some(row => row.id === id)
        ? products.map(row => row.id === id ? { ...row, released: true, stars: row.stars || 3, featurePct: row.featurePct || 30 } : row)
        : [...products, { id, released: true, stars: 3, featurePct: 30 }];
    const copy = clonePlayer(player, { ...state, platformDesk: { ...desk, products: nextProducts } });
    addCompanyCash(copy, -spec.cost, `${spec.name} ships`, 'BURN');
    return { player: copy };
};

export const fundFeature = (player: Player, id: string): { player: Player; error?: string } => {
    const state = player.ownPlatform;
    if (!state) return { player, error: 'No company on the books.' };
    const spec = PRODUCT_DEFS.find(row => row.id === id);
    if (!spec) return { player, error: 'Unknown app.' };
    const desk = readDesk(state);
    const current = (desk.products || []).find(row => row.id === id);
    if (!current?.released) return { player, error: 'Ship the app before you add features.' };
    if ((current.featurePct || 0) >= 100 && (current.stars || 0) >= 5) return { player, error: 'That app is finished.' };
    if (readCompanyCash(player) < spec.featureCost) return { player, error: `Company cash is short ${moneyShort(spec.featureCost - readCompanyCash(player))}. Personal cash is not used.` };
    const featurePct = Math.min(100, (current.featurePct || 0) + 20);
    const stars = Math.min(5, Math.max(current.stars || 1, 1 + Math.round(featurePct / 25)));
    const products = (desk.products || []).map(row => row.id === id ? { ...row, featurePct, stars } : row);
    const copy = clonePlayer(player, { ...state, platformDesk: { ...desk, products } });
    addCompanyCash(copy, -spec.featureCost, `${spec.name} feature release`, 'BURN');
    return { player: copy };
};

export const tickPlatformDesk = (player: Player, absoluteWeek: number): DeskNote[] => {
    const state = player.ownPlatform;
    if (!state?.platformDesk && !state) return [];
    if (!state) return [];
    const desk = readDesk(state);
    const notes: DeskNote[] = [];
    const ownedNext = { ...(desk.owned || {}) };
    const fresh = [...(desk.freshUnlocks || [])];
    let debt = desk.techDebt || 0;
    const research = (desk.research || []).flatMap(job => {
        const left = job.weeksLeft - 1;
        if (left <= 0) {
            ownedNext[job.rungId] = Math.max(ownedNext[job.rungId] || 0, job.version);
            fresh.push(job.rungId);
            const row = rungById(job.rungId);
            if (row) debt = clamp(debt + versionEffect(row, job.version).debt, 0, 100);
            notes.push({ msg: `${row?.name || 'A rung'} landed on ${state.name}.`, type: 'positive' });
            return [];
        }
        return [{ ...job, weeksLeft: left }];
    });
    let points = pointPool(state, desk);
    if (state.stage === 'LIVE' || state.stage === 'CONSTRUCTING') points += 40 + Math.round(state.subscribers / 20_000);
    const billing = desk.billing?.tuned ? { ...desk.billing } : desk.billing;
    if (billing?.tuned) {
        const aim = clamp(Math.round((billing.yearPct || 0) * 1.5), 0, 70);
        const share = billing.yearlyShare || 0;
        billing.yearlyShare = share + Math.sign(aim - share) * Math.min(2, Math.abs(aim - share));
    }
    const openIncidents = (state.incidents || []).filter(row => row.open).length;
    const playback = clamp(Math.round(99 - debt * 0.2 - openIncidents * 4 - (state.uptime != null ? (100 - state.uptime) * 0.15 : 0)), 80, 100);
    const pulses = LAUNCH_REGIONS.map(region => {
        const prev = (desk.pulses || []).find(row => row.regionId === region.id)?.weeks || [];
        const jitter = (hashString(`${absoluteWeek}:${region.id}`) % 5) - 2;
        const sample = clamp(playback + jitter - (region.id === 'AFRICA' ? 2 : 0), 70, 100);
        return { regionId: region.id, weeks: [...prev, sample].slice(-8) };
    });
    const feed = [...(desk.feed || [])];
    if (hashString(`${absoluteWeek}:feed`) % 4 === 0) {
        feed.unshift({
            id: `status-${absoluteWeek}`,
            week: player.currentWeek,
            year: player.age,
            tone: playback > 97 ? 'ok' : playback > 90 ? 'warn' : 'bad',
            text: playback > 97
                ? `${state.name} played ${playback}% of starts.`
                : `Playback slipped to ${playback}%. Tech debt is ${debt}.`,
        });
    }
    let freshSites = [...(desk.freshSites || [])];
    let timeline = desk.timeline || [];
    let revision = desk.revision || 1;
    let sites = Array.isArray(state.sites) ? state.sites.map(row => ({ ...row })) : undefined;
    if (state.stage === 'LIVE' && desk.autoBuild !== false) {
        const steady = sitesSteady(effectiveSites({ ...state, sites: sites || state.sites }));
        const tight = steady > 0 && state.subscribers > steady * 0.82;
        const idea = suggestCities(state)[0];
        if (tight && idea) {
            const once = Math.round(serverBy('SCOUT').onceUsd * idea.costIndex);
            if (readCompanyCash(player) >= once) {
                const base = (sites || effectiveSites(state)).map(row => ({ ...row }));
                sites = addRack(base, idea.id, 'scout');
                freshSites = [...freshSites, idea.id].slice(-6);
                timeline = [{ id: `auto-${absoluteWeek}`, week: player.currentWeek, year: player.age, cityId: idea.id, text: `New site online in ${idea.name}. The busy hour asked for it.` }, ...timeline].slice(0, 12);
                revision += 1;
                addCompanyCash(player, -once, `${idea.name} edge site`, 'BURN');
                notes.push({ msg: `${state.name} opened an edge site in ${idea.name}. Company cash paid for it.`, type: 'neutral' });
            } else {
                notes.push({ msg: `${idea.name} is ready for a site, and company cash is short.`, type: 'neutral' });
            }
        }
    }
    state.platformDesk = {
        ...desk,
        owned: ownedNext,
        research,
        freshUnlocks: fresh.slice(-8),
        techDebt: debt,
        researchPoints: points,
        billing,
        playbackPct: playback,
        pulses,
        feed: feed.slice(0, 12),
        freshSites,
        timeline,
        revision,
    };
    if (sites) {
        state.sites = sites;
        if (state.regions.length) state.regions = regionsFromSites(state, sites);
    }
    if (state.stage === 'LIVE') stampPlans(state);
    return notes;
};

export const stampPlatformRevenue = (state: OwnPlatformState, subscribers: number, households: number, ads: number, subscriptions: number, churned: number) => {
    const desk = state.platformDesk;
    if (!desk) return;
    const scale = households > 0 ? subscribers / households : 0;
    desk.lastAdRevenue = Math.max(0, Math.round(ads * scale));
    desk.lastSubRevenue = Math.max(0, Math.round(subscriptions * scale));
    desk.lastChurn = Math.max(0, Math.round(churned));
};

export const effectiveMonthly = (price: number, billing: PlatformBilling | undefined): { month: number; quarter: number; half: number; year: number; blend: number } => {
    const quarterOff = (billing?.quarterPct || 0) / 100;
    const halfOff = (billing?.halfPct || 0) / 100;
    const yearOff = (billing?.yearPct || 0) / 100;
    const month = price;
    const quarter = price * (1 - quarterOff);
    const half = price * (1 - halfOff);
    const year = price * (1 - yearOff);
    const yearlyShare = (billing?.yearlyShare || 0) / 100;
    const quarterShare = quarterOff > 0 ? 0.12 : 0;
    const halfShare = halfOff > 0 ? 0.08 : 0;
    const monthShare = Math.max(0, 1 - yearlyShare - quarterShare - halfShare);
    const blend = month * monthShare + quarter * quarterShare + half * halfShare + year * yearlyShare;
    return { month, quarter, half, year, blend };
};

export const peakLoadLabel = (load: number, steady: number): string => {
    const busy = Math.round(steady);
    const using = Math.round(steady * Math.min(load, 1.5));
    if (busy <= 0) return 'No racks are carrying a stream yet.';
    return `${formatLoad(using)} load of ${formatLoad(busy)} at the busiest hour`;
};

const formatLoad = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(value);
};

export const marketsServed = (state: OwnPlatformState): { served: number; total: number } => {
    const rows = siteRows(state);
    const regions = new Set(rows.map(row => row.city.regionId));
    const selected = state.selectedCountryIds;
    if (!selected.length) return { served: regions.size, total: Math.max(regions.size, 1) };
    const served = selected.filter(id => {
        const city = SERVER_CITIES.find(row => row.countryId === id);
        return city ? regions.has(city.regionId) : false;
    }).length;
    return { served, total: selected.length };
};
