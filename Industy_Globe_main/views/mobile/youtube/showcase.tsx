import React, { useState } from 'react';
import { Player, YoutubeVideo } from '../../../types';
import { YoutubeApp } from '../YoutubeApp';
import { YtScreen } from './state';

const abs = (week: number) => (28 - 1) * 52 + (week - 1);

const video = (partial: Partial<YoutubeVideo> & Pick<YoutubeVideo, 'id' | 'title' | 'type'>): YoutubeVideo => ({
    thumbnailColor: 'poster-hero',
    views: 1_200_000,
    likes: 80_000,
    earnings: 2400,
    weekUploaded: 22,
    yearUploaded: 28,
    isPlayer: true,
    authorName: 'Aarav Mehra',
    qualityScore: 78,
    weeklyHistory: [400000, 900000, 1400000, 1800000],
    comments: [],
    ctr: 0.082,
    likeRatio: 0.94,
    sentiment: [71, 18, 11],
    dubCount: 4,
    durationLabel: '2:14',
    ...partial,
});

export const showcasePlayer = (): Player => {
    const trailer = video({
        id: 'vid_sherdil_t2',
        title: 'SHERDIL · Trailer 2',
        type: 'TRAILER_2',
        thumbnailColor: 'poster-hero',
        views: 18_400_000,
        likes: 1_200_000,
        projectId: 'proj_sherdil',
        hype: 87,
        channelKind: 'studio',
        isPlayer: false,
        authorName: 'Empire Studios',
        durationLabel: '2:34',
        weekUploaded: 24,
        countryRanks: { IN: 1, AE: 2, BD: 3, UK: 7, US: 23 },
        ctr: 0.114,
        likeRatio: 0.962,
    });
    const teaser = video({
        id: 'vid_teaser',
        title: 'SHERDIL – Official Teaser | Aarav Mehra | In Cinemas W32',
        type: 'TEASER',
        views: 41_000_000,
        durationLabel: '1:04',
        weekUploaded: 18,
        projectId: 'proj_sherdil',
        channelKind: 'studio',
        isPlayer: false,
        authorName: 'Empire Studios',
    });
    const song = video({
        id: 'vid_song',
        title: 'Baarish Ka Sher – Title Track | SHERDIL | Premieres Friday',
        type: 'MUSIC_VIDEO',
        thumbnailColor: 'poster-song',
        views: 412_000,
        durationLabel: 'PREMIERE',
        weekUploaded: 26,
        projectId: 'proj_sherdil',
        channelKind: 'studio',
        isPlayer: false,
        authorName: 'Empire Studios',
    });
    const interview = video({
        id: 'vid_interview',
        title: 'Aarav & Kiara Sen on 200 days of monsoon shoot | SHERDIL Cast Interview',
        type: 'CAST_INTERVIEW',
        thumbnailColor: 'poster-interview',
        views: 2_600_000,
        durationLabel: '14:22',
        weekUploaded: 24,
        projectId: 'proj_sherdil',
        authorName: 'Aarav Mehra',
    });
    const bts = video({
        id: 'vid_bts',
        title: 'Making of the Rooftop Rain Fight – 40 nights, 3 cranes | SHERDIL BTS',
        type: 'BTS',
        thumbnailColor: 'poster-bts',
        views: 5_100_000,
        durationLabel: '9:41',
        weekUploaded: 23,
        projectId: 'proj_sherdil',
        channelKind: 'studio',
        isPlayer: false,
        authorName: 'Empire Studios',
        watchProgress: 34,
    });
    const diary = video({
        id: 'vid_diary',
        title: 'I lived as Veer for 200 days – my SHERDIL diary',
        type: 'VLOG',
        thumbnailColor: 'poster-short',
        views: 3_900_000,
        durationLabel: '18:05',
        weekUploaded: 20,
        projectId: 'proj_sherdil',
    });
    const premiere = video({
        id: 'vid_premiere',
        title: 'Teaser launch event LIVE from Mumbai',
        type: 'PREMIERE_LIVE',
        thumbnailColor: 'poster-live',
        views: 1_100_000,
        durationLabel: '1:48:10',
        weekUploaded: 18,
        projectId: 'proj_sherdil',
        channelKind: 'studio',
        isPlayer: false,
        authorName: 'Empire Studios',
    });
    const bombay = video({
        id: 'vid_bombay',
        title: 'Bombay Noir – Official Trailer | An Empire+ Original Series',
        type: 'TRAILER_1',
        thumbnailColor: 'poster-series',
        views: 7_300_000,
        durationLabel: '2:12',
        weekUploaded: 22,
        channelKind: 'empirePlus',
        isPlayer: false,
        authorName: 'Empire+',
    });
    const shorts = [
        ['vid_s1', 'Veer entry walk ft. title track', 'poster-short', 9_800_000],
        ['vid_s2', 'Hook step tutorial', 'poster-song', 4_100_000],
        ['vid_s3', 'Rain machine went crazy', 'poster-bts', 2_200_000],
        ['vid_s4', 'Fans react at teaser launch', 'poster-live', 1_700_000],
        ['vid_s5', 'Kiara can’t stop laughing', 'poster-interview', 1_200_000],
        ['vid_s6', 'ECLIPSE RING 60s cut', 'poster-scifi', 3_400_000],
    ].map(([id, title, tone, views], index) => video({
        id: String(id),
        title: String(title),
        type: 'SHORT',
        isShort: true,
        thumbnailColor: String(tone),
        views: Number(views),
        durationLabel: '0:18',
        weekUploaded: 24 - index,
        projectId: index === 5 ? undefined : 'proj_sherdil',
        isPlayer: index !== 5,
        authorName: index === 5 ? 'Aurora Pictures' : 'Aarav Mehra',
    }));
    const qa = video({
        id: 'vid_qa',
        title: 'Q&A Sunday: will Veer return?',
        type: 'Q_AND_A',
        thumbnailColor: 'poster-bts',
        views: 1_400_000,
        durationLabel: '22:10',
        weekUploaded: 23,
    });

    return {
        id: 'showcase',
        name: 'Aarav Mehra',
        age: 28,
        currentWeek: 24,
        money: 2_400_000,
        energy: { current: 72, max: 100 },
        stats: { fame: 64, reputation: 71, skills: { improvisation: 72, charisma: 76 } },
        settings: { language: 'en', aiContentEnabled: false },
        flags: { youtubeMilestonesUnlocked: ['subs_10000', 'subs_100000', 'views_1000000', 'subs_1000000'] },
        logs: [{ week: 24, year: 28, message: 'Trailer 2 is the clip of the week.', type: 'positive' }],
        commitments: [{
            id: 'proj_sherdil',
            name: 'SHERDIL',
            type: 'ACTING_GIG',
            energyCost: 10,
            income: 0,
            payoutType: 'LUMPSUM',
            projectPhase: 'POST_PRODUCTION',
            phaseWeeksLeft: 6,
            totalPhaseDuration: 10,
            projectDetails: {
                title: 'SHERDIL',
                type: 'FILM',
                description: 'One monsoon. One city. One man who refuses to drown.',
                genre: 'ACTION',
                estimatedBudget: 42_000_000,
                directorName: 'Rohan Varma',
                customPoster: { type: 'CONFIG', tagline: 'THE LAST MONSOON' },
                castList: [{ id: 'cast_aarav', name: 'Aarav Mehra', role: 'LEAD', roleName: 'Veer Rathore', isPlayer: true, image: '', type: 'ACTOR' }],
                hiddenStats: { releaseWeek: abs(32), rawHype: 70, ytCampaignHype: 78, scriptQuality: 80, directorQuality: 77, castingStrength: 74, distributionPower: 60, qualityScore: 79, prestigeBonus: 4 },
            },
        }],
        pastProjects: [],
        businesses: [],
        news: [],
        x: { handle: '@aarav', followers: 900000, posts: [], feed: [], lastPostWeek: 20 },
        inbox: [],
        youtube: {
            handle: '@aaravmehra',
            subscribers: 3_480_000,
            videos: [trailer, interview, diary, qa, ...shorts],
            lifetimeEarnings: 184_600,
            isMonetized: true,
            bannerColor: 'poster-hero',
            totalChannelViews: 48_200_000,
            activeCollabs: [],
            activeBrandDeals: [],
            audienceTrust: 74,
            fanMood: 81,
            controversy: 18,
            membershipsActive: true,
            members: 18_200,
            lastLivestreamWeek: 0,
            lastMerchDropWeek: 0,
            creatorIdentity: 'ACTOR_VLOGGER',
            lastIdentityChangeWeek: 0,
            schemaVersion: 2,
            superChatLifetime: 31400,
            peakLive: 48000,
            marketing: {
                proj_sherdil: {
                    campaignHype: 78,
                    lastDropWeekAbs: abs(24),
                    songStreams: 48_000_000,
                    songs: [
                        { id: 's1', title: 'Baarish Ka Sher', singer: 'House vocal', composer: 'R. Sen', plays: 48_000_000, duration: '3:42', status: 'CHART' },
                        { id: 's2', title: 'Night Ride', singer: 'House vocal', composer: 'R. Sen', plays: 12_000_000, duration: '3:11', status: 'LYRIC' },
                        { id: 's3', title: 'Monsoon BGM', singer: 'Instrumental', composer: 'R. Sen', plays: 4_000_000, duration: '2:56', status: 'LOCKED' },
                    ],
                    drops: [
                        { id: 'd_poster', type: 'MOTION_POSTER', scheduledWeekAbs: abs(14), status: 'RELEASED', title: 'Motion poster', views: 2_000_000, H: 40 },
                        { id: 'd_char', type: 'CHARACTER_POSTER', scheduledWeekAbs: abs(16), status: 'RELEASED', title: 'Character poster', views: 1_400_000, H: 44 },
                        { id: 'd_tease', type: 'TEASER', scheduledWeekAbs: abs(18), status: 'RELEASED', title: teaser.title, views: teaser.views, H: 64 },
                        { id: 'd_bts', type: 'BTS', scheduledWeekAbs: abs(23), status: 'RELEASED', title: bts.title, views: bts.views, H: 58 },
                        { id: 'd_t1', type: 'TRAILER_1', scheduledWeekAbs: abs(20), status: 'RELEASED', title: 'Trailer 1', views: 22_000_000, H: 72 },
                        { id: 'd_int', type: 'CAST_INTERVIEW', scheduledWeekAbs: abs(24), status: 'RELEASED', title: interview.title, views: interview.views, H: 60 },
                        { id: 'd_t2', type: 'TRAILER_2', scheduledWeekAbs: abs(24), status: 'RELEASED', title: trailer.title, views: trailer.views, H: 81 },
                        { id: 'd_song', type: 'MUSIC_VIDEO', scheduledWeekAbs: abs(26), status: 'SCHEDULED', title: song.title, views: song.views, H: 0 },
                    ],
                },
            },
            officialChannels: {
                studio: { handle: '@empirestudios', subscribers: 4_210_000, totalViews: 80_000_000, lifetimeEarnings: 0, videos: [teaser, song, bts, premiere] },
                empirePlus: { handle: '@empireplus', subscribers: 1_120_000, totalViews: 12_000_000, lifetimeEarnings: 0, videos: [bombay] },
            },
            leaks: [{ id: 'leak1', projectId: 'proj_sherdil', title: 'SHERDIL set footage leak', weekAbs: abs(22), spoilsFinal: false, views: 900000 }],
            strikes: [],
        },
    } as unknown as Player;
};

// Rival trailers are not on a player channel. Attach them by wrapping the player the app already reads.
const withRivals = (player: Player): Player => {
    const slate = (id: string, title: string, studioId: string, ahead: number, quality: number) => ({
        id, title, genre: 'ACTION' as const, studioId, budgetTier: 'HIGH' as const, quality, boxOffice: 0,
        year: player.age, weekReleased: player.currentWeek + ahead,
        leadActorId: id, leadActorName: 'Lead', directorName: 'Director', reviews: 'HIT',
    });
    const extras: YoutubeVideo[] = [
        video({
            id: 'rival_eclipse',
            title: 'ECLIPSE RING · Trailer',
            type: 'TRAILER_2',
            thumbnailColor: 'poster-scifi',
            views: 15_900_000,
            durationLabel: '2:41',
            isPlayer: false,
            authorName: 'Aurora Pictures',
            weekUploaded: 22,
            projectId: undefined,
        }),
        video({
            id: 'rival_kill',
            title: 'KILL CODE · Teaser',
            type: 'TEASER',
            thumbnailColor: 'poster-series',
            views: 9_200_000,
            durationLabel: '1:12',
            isPlayer: false,
            authorName: 'Warner Bros',
            weekUploaded: 23,
            projectId: undefined,
        }),
    ];
    return {
        ...player,
        world: {
            projects: [
                slate('rel-old', 'Already Out', 'WARNER_BROS', -1, 70),
            ],
            upcomingRivals: [
                slate('rel-marvel', 'Eclipse Run', 'MARVEL_STUDIOS', 4, 82),
                slate('rel-artisan', 'Quiet Room', 'ARTISAN_PICTURES', 9, 88),
                slate('rel-uni', 'Harbor Song', 'UNIVERSAL', 5, 74),
                slate('rel-netflix', 'Signal Lost', 'NETFLIX', 2, 71),
                slate('rel-hulu', 'Late Night Cut', 'HULU', 3, 44),
                slate('rel-hbo', 'The Long Table', 'HBO', 12, 90),
            ],
        } as Player['world'],
        youtube: {
            ...player.youtube,
            videos: [...player.youtube.videos, ...extras],
        },
    };
};

export const YoutubeShowcase: React.FC<{ initial?: string | null }> = ({ initial }) => {
    const [player, setPlayer] = useState<Player>(() => withRivals(showcasePlayer()));
    const screen = (['home', 'watch', 'hub', 'upload', 'studio', 'channel', 'trending', 'subs', 'rival', 'music', 'shorts', 'live', 'money'].includes(initial || '') ? initial : 'home') as YtScreen;
    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#08080b' }}>
            <YoutubeApp player={player} onBack={() => undefined} onUpdatePlayer={setPlayer} initialScreen={screen} />
        </div>
    );
};
