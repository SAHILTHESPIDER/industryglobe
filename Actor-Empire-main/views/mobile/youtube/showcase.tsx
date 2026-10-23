import React, { useState } from 'react';
import { Player, YoutubeVideo } from '../../../types';
import { YoutubeApp } from '../YoutubeApp';
import { YtScreen } from './state';

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
    sentiment: [68, 22, 10],
    dubCount: 6,
    durationLabel: '2:14',
    ...partial,
});

export const showcasePlayer = (): Player => {
    const sherdil = video({
        id: 'vid_sherdil_t2',
        title: 'SHERDIL — Trailer 2',
        type: 'TRAILER_2',
        thumbnailColor: 'poster-hero',
        views: 18_400_000,
        likes: 1_200_000,
        projectId: 'proj_sherdil',
        hype: 81,
        channelKind: 'personal',
    });
    const short = video({
        id: 'vid_sherdil_short',
        title: 'The look he gives the camera',
        type: 'SHORT',
        isShort: true,
        thumbnailColor: 'poster-short',
        views: 4_200_000,
        durationLabel: '0:18',
        projectId: 'proj_sherdil',
    });
    const vlog = video({
        id: 'vid_vlog',
        title: 'Night shoot, no sleep',
        type: 'VLOG',
        thumbnailColor: 'poster-bts',
        views: 860_000,
        durationLabel: '14:02',
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
                estimatedBudget: 18_000_000,
                hiddenStats: { releaseWeek: (28 - 1) * 52 + (32 - 1), rawHype: 70, ytCampaignHype: 78, scriptQuality: 80, directorQuality: 77, castingStrength: 74, distributionPower: 60, qualityScore: 79, prestigeBonus: 4 },
            },
        }],
        pastProjects: [],
        businesses: [],
        news: [],
        x: { handle: '@aarav', followers: 900000, posts: [], feed: [], lastPostWeek: 20 },
        inbox: [],
        youtube: {
            handle: '@aaravmehra',
            subscribers: 1_250_000,
            videos: [sherdil, short, vlog],
            lifetimeEarnings: 186_000,
            isMonetized: true,
            bannerColor: 'poster-hero',
            totalChannelViews: 42_000_000,
            activeCollabs: [],
            activeBrandDeals: [],
            audienceTrust: 74,
            fanMood: 81,
            controversy: 18,
            membershipsActive: true,
            members: 6400,
            lastLivestreamWeek: 0,
            lastMerchDropWeek: 0,
            creatorIdentity: 'ACTOR_VLOGGER',
            lastIdentityChangeWeek: 0,
            schemaVersion: 2,
            superChatLifetime: 22000,
            peakLive: 48000,
            marketing: {
                proj_sherdil: {
                    campaignHype: 78,
                    lastDropWeekAbs: (28 - 1) * 52 + 21,
                    songStreams: 48_000_000,
                    songs: [
                        { id: 's1', title: 'Sherdil Title Track', singer: 'House vocal', composer: 'R. Sen', plays: 48_000_000, duration: '3:42', status: 'CHART' },
                        { id: 's2', title: 'Night Ride', singer: 'House vocal', composer: 'R. Sen', plays: 12_000_000, duration: '3:11', status: 'LYRIC' },
                    ],
                    drops: [
                        { id: 'd1', type: 'TRAILER_2', scheduledWeekAbs: (28 - 1) * 52 + 21, status: 'RELEASED', title: 'SHERDIL — Trailer 2', views: 18_400_000, H: 81, thumbnailScore: 0.8 },
                        { id: 'd2', type: 'TEASER', scheduledWeekAbs: (28 - 1) * 52 + 14, status: 'RELEASED', title: 'SHERDIL teaser', views: 6_200_000, H: 64 },
                    ],
                },
            },
            leaks: [{ id: 'leak1', projectId: 'proj_sherdil', title: 'SHERDIL set footage leak', weekAbs: 1, spoilsFinal: false, views: 900000 }],
            strikes: [],
        },
    } as unknown as Player;
};

export const YoutubeShowcase: React.FC<{ initial?: string | null }> = ({ initial }) => {
    const [player, setPlayer] = useState<Player>(() => showcasePlayer());
    const screen = (['home', 'watch', 'hub', 'upload', 'studio', 'channel', 'trending', 'music', 'shorts', 'live', 'money'].includes(initial || '') ? initial : 'home') as YtScreen;
    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#08080b' }}>
            <YoutubeApp player={player} onBack={() => undefined} onUpdatePlayer={setPlayer} initialScreen={screen} />
        </div>
    );
};
