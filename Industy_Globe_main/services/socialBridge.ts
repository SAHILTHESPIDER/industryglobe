import type { InstaPost, Player, XPost, YoutubeTrend, YoutubeVideo } from '../types';
import { cartoonAvatarUrl } from './cartoonAvatar';

/**
 * In-game only. A post on one phone app shows up on the others.
 * No outside network is called.
 */

const spill = (views: number) => Math.max(40, Math.min(25_000, Math.floor((views || 0) / 80)));

const trendFrom = (title: string) => `#${title.replace(/[^A-Za-z0-9]+/g, '').slice(0, 28) || 'IndustryGlobe'}`;

const playerXPost = (player: Player, content: string, id: string): XPost => ({
    id,
    authorId: 'player',
    authorName: player.name,
    authorHandle: player.x?.handle || `@${player.name.replace(/\s+/g, '')}`,
    authorAvatar: player.avatar || cartoonAvatarUrl(player.name),
    content,
    timestamp: player.currentWeek,
    likes: 80,
    retweets: 12,
    replies: 4,
    isPlayer: true,
    isLiked: false,
    isRetweeted: false,
    isVerified: (player.stats?.fame || 0) > 50,
    postType: 'CAREER',
    system: true,
    sentiment: 'INDUSTRY',
});

const playerIgPost = (player: Player, caption: string, id: string): InstaPost => ({
    id,
    authorId: 'player',
    authorName: player.name,
    authorHandle: player.instagram?.handle || player.x?.handle || `@${player.name.replace(/\s+/g, '')}`,
    authorAvatar: player.avatar || cartoonAvatarUrl(player.name),
    type: 'REEL',
    caption,
    week: player.currentWeek,
    year: player.age,
    likes: 120,
    comments: 8,
    shares: 6,
    isPlayer: true,
    mood: 'INDUSTRY',
});

const hasId = (rows: { id: string }[] | undefined, id: string) => (rows || []).some(row => row.id === id);

/** A YouTube upload is also an X post and an Instagram reel, and a few followers move with it. */
export const mirrorYoutubeUpload = (player: Player, video: YoutubeVideo): Player => {
    if (!video?.id || !video.isPlayer || !player.x || !player.instagram || !player.youtube) return player;
    const id = `link_yt_${video.id}`;
    const line = video.title;
    const xFeed = hasId(player.x?.feed, id) ? player.x.feed : [playerXPost(player, line, id), ...(player.x?.feed || [])].slice(0, 80);
    const xPosts = hasId(player.x?.posts, id) ? player.x.posts : [playerXPost(player, line, `${id}_mine`), ...(player.x?.posts || [])].slice(0, 40);
    const ig = hasId(player.instagram?.feed, id) ? player.instagram.feed : [playerIgPost(player, line, id), ...(player.instagram?.feed || [])].slice(0, 80);
    const bump = spill(video.views);
    const tag = trendFrom(video.title);
    const trend: YoutubeTrend = {
        id: `yt_trend_${video.id}`,
        title: tag,
        detail: 'The upload is moving on X and Instagram too.',
        heat: 55,
        weeksLeft: 1,
        kind: 'PREMIERE',
    };
    const partner = player.youtube?.partner;
    const trends = partner
        ? [trend, ...(partner.trends || []).filter(row => row.id !== trend.id)].slice(0, 8)
        : partner;
    return {
        ...player,
        x: {
            ...player.x,
            followers: (player.x?.followers || 0) + Math.floor(bump * 0.45),
            feed: xFeed,
            posts: xPosts,
        },
        instagram: {
            ...player.instagram,
            followers: (player.instagram?.followers || 0) + Math.floor(bump * 0.7),
            feed: ig,
        },
        youtube: partner ? { ...player.youtube, partner: { ...partner, trends: trends as YoutubeTrend[] } } : player.youtube,
        stats: {
            ...player.stats,
            followers: (player.stats?.followers || 0) + Math.floor(bump * 0.15),
        },
        flags: {
            ...(player.flags || {}),
            linkedSocial: { videoId: video.id, tag, week: player.currentWeek, year: player.age },
        },
    };
};

/** Once a week, the loudest title is a trend on X, Instagram, and YouTube together. */
export const linkSocialWeek = (player: Player): Player => {
    const linked = player.flags?.linkedSocial as { week?: number; year?: number; tag?: string } | undefined;
    if (linked && linked.week === player.currentWeek && linked.year === player.age) return player;
    const video = (player.youtube?.videos || []).find(row => row.isPlayer && row.weekUploaded === player.currentWeek && (row.yearUploaded == null || row.yearUploaded === player.age));
    if (video) return mirrorYoutubeUpload(player, video);
    const project = player.world?.projects?.[0];
    const release = player.activeReleases?.find(row => row.status === 'RUNNING' || row.status === 'BLOCKBUSTER_TRACK');
    const title = release?.name || project?.title;
    if (!title) return player;
    const tag = trendFrom(title);
    const id = `link_trend_${player.age}_${player.currentWeek}`;
    const who = project?.leadActorName || player.name;
    const caption = `${tag} is moving this week. ${who}.`;
    const avatar = cartoonAvatarUrl(who);
    const xPost: XPost = {
        ...playerXPost(player, caption, id),
        authorId: project?.leadActorId || 'desk',
        authorName: who,
        authorHandle: `@${who.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'desk'}`,
        authorAvatar: avatar,
        isPlayer: false,
        system: true,
    };
    const igPost: InstaPost = {
        ...playerIgPost(player, caption, id),
        authorId: project?.leadActorId || 'desk',
        authorName: who,
        authorHandle: xPost.authorHandle,
        authorAvatar: avatar,
        isPlayer: false,
        type: 'INDUSTRY_NEWS',
    };
    const partner = player.youtube?.partner;
    const trend: YoutubeTrend = {
        id,
        title: tag,
        detail: caption,
        heat: 48,
        weeksLeft: 1,
        kind: 'PREMIERE',
    };
    const xBump = 180 + Math.floor((player.stats?.fame || 0) * 4);
    return {
        ...player,
        x: {
            ...player.x,
            followers: (player.x?.followers || 0) + Math.floor(xBump * 0.25),
            feed: [xPost, ...(player.x?.feed || [])].slice(0, 80),
        },
        instagram: {
            ...player.instagram,
            followers: (player.instagram?.followers || 0) + Math.floor(xBump * 0.35),
            feed: [igPost, ...(player.instagram?.feed || [])].slice(0, 80),
        },
        youtube: {
            ...player.youtube,
            subscribers: (player.youtube?.subscribers || 0) + Math.floor(xBump * 0.15),
            partner: partner ? { ...partner, trends: [trend, ...(partner.trends || [])].slice(0, 8) } : player.youtube?.partner,
        },
        flags: { ...(player.flags || {}), linkedSocial: { tag, week: player.currentWeek, year: player.age } },
    };
};

export const linkedTrendTag = (player: Player): string | undefined => {
    const linked = player.flags?.linkedSocial as { tag?: string } | undefined;
    return linked?.tag;
};
