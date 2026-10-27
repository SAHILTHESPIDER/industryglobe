import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Player, XPost, NPCActor, NPCState } from '../../types';
import { generateXFeed, generateTrendingTopics } from '../../services/xLogic';
import { NPC_DATABASE } from '../../services/npcLogic';
import { getEnabledGlobalCreatorSocialProfiles } from '../../services/youtubeLogic';
import { spendPlayerEnergy } from '../../services/premiumLogic';
import { gameCalendarYear, playerCityLabel } from '../../services/boxOfficeSim';
import { getPlayerLanguage, t } from '../../services/i18n';
import {
    ArrowLeft, Home, Search, PenTool, Heart, Repeat, MessageCircle, MoreHorizontal, Check, User, Mail,
    Calendar, MapPin, Link as LinkIcon, Bell, Star, Flame, ShieldCheck, Laugh, Megaphone, Film, Users,
    MessageSquareQuote, Bookmark, Share, BarChart2, Menu, Mic, Pin, Trash2, Send, Pencil, Crown, Radio,
    DollarSign, List, X, Plus, Settings, ChevronRight, Sparkles, Eye, Hash, UserPlus, AtSign, BadgeCheck
} from 'lucide-react';

interface XAppProps {
    player: Player;
    onBack: () => void;
    onUpdatePlayer: (p: Player) => void;
}

type XTab = 'HOME' | 'SEARCH' | 'SPACES' | 'NOTIFICATIONS' | 'MESSAGES' | 'PROFILE';
type FeedTab = 'FOR_YOU' | 'FOLLOWING';
type XView = 'MAIN' | 'POST_DETAIL' | 'PREMIUM' | 'BOOKMARKS' | 'LISTS' | 'MONETIZATION' | 'COMMUNITIES' | 'CHAT' | 'EDIT_PROFILE';
type ProfileTab = 'POSTS' | 'REPLIES' | 'MEDIA' | 'LIKES';
type NotifFilter = 'ALL' | 'VERIFIED' | 'MENTIONS';
type XPostType = NonNullable<XPost['postType']>;
type XReplyTone = 'SUPPORT' | 'JOKE' | 'CLAP_BACK' | 'CLARIFY' | 'APOLOGIZE';
type PremiumTier = 'NONE' | 'BASIC' | 'PREMIUM' | 'PLUS';

// Extended post shape. Extra fields are optional so existing XPost data stays valid.
type XPostEx = XPost & {
    views?: number;
    isBookmarked?: boolean;
    isPinned?: boolean;
    isEdited?: boolean;
    poll?: { options: string[]; votes: number[]; voted?: number };
    thread?: string[];
    mediaColor?: string;
    communityId?: string;
    adRevenue?: number;
};

interface DMMessage { from: 'ME' | 'THEM'; text: string; week: number }

interface XExtras {
    premium: PremiumTier;
    premiumUntil: number;        // absolute week (age * 52 + currentWeek)
    bookmarks: string[];
    muted: string[];
    communities: string[];
    pinnedPostId: string | null;
    bio: string;
    location: string;
    link: string;
    adBalance: number;
    adLifetime: number;
    spacesHosted: number;
    dms: Record<string, DMMessage[]>;
}

const DM_THREAD_CAP = 200;
const DEFAULT_BIO = 'Actor based in Los Angeles. Living the dream. 🎬';
const DEFAULT_LOCATION = 'Los Angeles, CA';

const capDmThreads = (dms: Record<string, DMMessage[]>) => {
    const next: Record<string, DMMessage[]> = {};
    Object.entries(dms || {}).forEach(([id, thread]) => {
        next[id] = (thread || []).slice(-DM_THREAD_CAP);
    });
    return next;
};

const DEFAULT_EXTRAS: XExtras = {
    premium: 'NONE', premiumUntil: 0, bookmarks: [], muted: [], communities: [], pinnedPostId: null,
    bio: DEFAULT_BIO, location: DEFAULT_LOCATION, link: 'imdb.com/name',
    adBalance: 0, adLifetime: 0, spacesHosted: 0, dms: {}
};

const PREMIUM_PLANS: Record<Exclude<PremiumTier, 'NONE'>, { name: string; price: number; charLimit: number; reach: number; revShare: number; perks: string[] }> = {
    BASIC: { name: 'Basic', price: 3_000, charLimit: 280, reach: 1.05, revShare: 0, perks: ['Edit posts (same week)', 'Bookmark folders', 'Small reply boost', 'No checkmark'] },
    PREMIUM: { name: 'Premium', price: 8_000, charLimit: 4000, reach: 1.15, revShare: 0.5, perks: ['Blue checkmark', 'Longer posts (4,000 chars)', 'Ad revenue sharing', 'Half the ads', 'Edit posts'] },
    PLUS: { name: 'Premium+', price: 16_000, charLimit: 10000, reach: 1.3, revShare: 1, perks: ['Everything in Premium', 'Largest reply boost', 'No ads in For You', 'Full ad revenue share', 'Articles & long-form'] }
};

const COMMUNITIES = [
    { id: 'film_twitter', name: 'Film Twitter', members: 1_200_000, emoji: '🎬', reach: 1.1, conversion: 0.004 },
    { id: 'indie', name: 'Indie Cinema Club', members: 340_000, emoji: '🎞️', reach: 1.05, conversion: 0.006 },
    { id: 'awards', name: 'Awards Season Watch', members: 560_000, emoji: '🏆', reach: 1.15, conversion: 0.003 },
    { id: 'method', name: 'Method & Craft', members: 120_000, emoji: '🎭', reach: 1.0, conversion: 0.007 },
    { id: 'boxoffice', name: 'Box Office Nerds', members: 410_000, emoji: '📈', reach: 1.1, conversion: 0.003 },
    { id: 'writers', name: 'Screenwriters Room', members: 230_000, emoji: '✍️', reach: 1.0, conversion: 0.005 }
];

const SPACE_TOPIC_STEMS = ['Is the theatrical window dead?', 'Awards season predictions', 'Casting horror stories', 'Best performances of the year', 'Method acting: genius or nonsense?', 'Streaming vs cinema', 'Late night script notes'];

const X_POST_TYPES: Record<XPostType, {
    label: string; prompt: string; icon: React.ElementType; reach: number; conversion: number; controversy: number; reputation: number; placeholder: string;
}> = {
    CAREER: { label: 'Career', prompt: 'Career Update', icon: Megaphone, reach: 1.25, conversion: 0.026, controversy: 0, reputation: 1, placeholder: 'Share a career update...' },
    HOT_TAKE: { label: 'Hot Take', prompt: 'Hot Take', icon: Flame, reach: 1.65, conversion: 0.018, controversy: 7, reputation: -1, placeholder: 'Say the thing Film Twitter will argue about...' },
    JOKE: { label: 'Joke', prompt: 'Joke', icon: Laugh, reach: 1.35, conversion: 0.024, controversy: 2, reputation: 0, placeholder: 'Post something funny...' },
    FILM_OPINION: { label: 'Film', prompt: 'Film Opinion', icon: Film, reach: 1.2, conversion: 0.02, controversy: 2, reputation: 1, placeholder: 'Share a film opinion...' },
    PR_STATEMENT: { label: 'PR', prompt: 'PR Statement', icon: ShieldCheck, reach: 0.85, conversion: 0.012, controversy: -6, reputation: 2, placeholder: 'Make a clean public statement...' },
    DRAMA_REPLY: { label: 'Drama', prompt: 'Drama Reply', icon: MessageSquareQuote, reach: 1.85, conversion: 0.016, controversy: 10, reputation: -2, placeholder: 'Reply to the discourse...' },
    FAN_THANKS: { label: 'Fans', prompt: 'Fan Thank You', icon: Users, reach: 1.05, conversion: 0.032, controversy: -1, reputation: 1, placeholder: 'Thank the fans...' },
    GENERAL: { label: 'General', prompt: 'General Post', icon: PenTool, reach: 1, conversion: 0.02, controversy: 0, reputation: 0, placeholder: 'What is happening?!' }
};

const X_REPLY_TONES: Record<XReplyTone, { label: string; text: string; controversy: number; reputation: number; reach: number }> = {
    SUPPORT: { label: 'Support', text: 'This is fair. People should actually read the full context.', controversy: -1, reputation: 1, reach: 0.8 },
    JOKE: { label: 'Joke', text: 'The timeline chose chaos today and somehow I respect it.', controversy: 2, reputation: 0, reach: 1.1 },
    CLAP_BACK: { label: 'Clap Back', text: 'Wild take. Loud does not always mean right.', controversy: 8, reputation: -1, reach: 1.65 },
    CLARIFY: { label: 'Clarify', text: 'Quick context before this turns into something it is not.', controversy: -4, reputation: 2, reach: 0.9 },
    APOLOGIZE: { label: 'Apologize', text: 'I hear the criticism. That could have been said better.', controversy: -8, reputation: 2, reach: 0.65 }
};

const X_REPLY_BANK: Record<XPostType, string[]> = {
    CAREER: ['Booked and busy era?', 'This sounds bigger than people realize.', 'Casting directors are watching.', 'The resume is moving.'],
    HOT_TAKE: ['The quotes are about to be a war zone.', 'Honestly? Not completely wrong.', 'Delete this before brunch.', 'Film Twitter found its lunch today.'],
    JOKE: ['Okay this one got me.', 'Rare good celebrity joke.', 'The timing is too clean.', 'I hate that I laughed.'],
    FILM_OPINION: ['Cinema discourse is alive.', 'This is a brave ranking.', 'Respectfully disagree but I see it.', 'You can tell they actually watch movies.'],
    PR_STATEMENT: ['This is the mature version.', 'PR team finally slept tonight.', 'Good clarification.', 'Clean statement, no notes.'],
    DRAMA_REPLY: ['The timeline is awake.', 'This is getting screenshotted.', 'PR is sweating.', 'This reply changed the whole conversation.'],
    FAN_THANKS: ['Day one fans are emotional.', 'This is why people root for you.', 'Simple and sweet.', 'The fanbase needed this.'],
    GENERAL: ['Real.', 'The timeline gets it.', 'Mood.', 'This app is unserious.']
};

const DM_REPLIES = [
    'Hey! Saw your post, people are talking.',
    'We should work together at some point.',
    'My agent said your name came up this week.',
    'Haha the timeline is a mess today.',
    'Let me know when you are free, there is a script floating around.',
    'Keep posting, the algorithm likes you right now.'
];

const MEDIA_COLORS = ['from-blue-900 to-indigo-700', 'from-rose-900 to-orange-700', 'from-emerald-900 to-teal-700', 'from-zinc-800 to-zinc-600', 'from-purple-900 to-fuchsia-700'];

export const XApp: React.FC<XAppProps> = ({ player, onBack, onUpdatePlayer }) => {
    const language = getPlayerLanguage(player);
    const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

    // --- STATE ---
    const [tab, setTab] = useState<XTab>('HOME');
    const [view, setView] = useState<XView>('MAIN');
    const [feedTab, setFeedTab] = useState<FeedTab>('FOR_YOU');
    const [profileTab, setProfileTab] = useState<ProfileTab>('POSTS');
    const [notifFilter, setNotifFilter] = useState<NotifFilter>('ALL');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeType, setComposeType] = useState<XPostType>('GENERAL');
    const [composeCommunity, setComposeCommunity] = useState<string | null>(null);
    const [tweetContent, setTweetContent] = useState('');
    const [threadParts, setThreadParts] = useState<string[]>([]);
    const [pollEnabled, setPollEnabled] = useState(false);
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<NPCActor | null>(null);
    const [selectedPost, setSelectedPost] = useState<XPostEx | null>(null);
    const [moreMenuPost, setMoreMenuPost] = useState<XPostEx | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatNpc, setChatNpc] = useState<NPCActor | null>(null);
    const [chatDraft, setChatDraft] = useState('');
    const [toast, setToast] = useState<string | null>(null);
    const [profileDraft, setProfileDraft] = useState({ bio: '', location: '', link: '' });
    const [replyDraft, setReplyDraft] = useState('');
    const [liveSpaceId, setLiveSpaceId] = useState<string | null>(null);

    const needsFreshFeed = player.x.feed.length === 0 || player.x.lastPostWeek !== player.currentWeek;
    const [feed, setFeed] = useState<XPostEx[]>(() => needsFreshFeed ? generateXFeed(player) : player.x.feed);
    const feedBootstrapped = useRef(false);

    // --- DERIVED ---
    const extras: XExtras = { ...DEFAULT_EXTRAS, ...((player.flags as any)?.xExtras || {}), dms: capDmThreads(((player.flags as any)?.xExtras?.dms) || {}) };
    const cityLabel = playerCityLabel(player);
    const shownLocation = !extras.location || extras.location === DEFAULT_LOCATION ? cityLabel : extras.location;
    const shownBio = extras.bio === DEFAULT_BIO ? `Actor based in ${cityLabel}. Living the dream. 🎬` : extras.bio;
    const spaceTopics = useMemo(
        () => [...SPACE_TOPIC_STEMS, `Indie financing in ${gameCalendarYear(player.age)}`],
        [player.age]
    );
    const absWeek = player.age * 52 + player.currentWeek;
    const premiumActive: PremiumTier = extras.premium !== 'NONE' && extras.premiumUntil >= absWeek ? extras.premium : 'NONE';
    const premiumPlan = premiumActive === 'NONE' ? null : PREMIUM_PLANS[premiumActive];
    const isPlayerVerified = player.stats.fame > 50 || premiumActive === 'PREMIUM' || premiumActive === 'PLUS';
    const charLimit = premiumPlan?.charLimit ?? 280;
    const money = Number((player as any).money ?? 0);
    const trending = generateTrendingTopics(player);
    const npcStates = (player.instagram?.npcStates || {}) as Record<string, NPCState>;

    const npcPool = useMemo(() => {
        const creators = getEnabledGlobalCreatorSocialProfiles(player);
        return [...NPC_DATABASE, ...(Array.isArray(player.flags?.extraNPCs) ? player.flags.extraNPCs : []), ...creators]
            .filter((npc, index, arr) => arr.findIndex(entry => entry.id === npc.id) === index) as NPCActor[];
    }, [player]);

    const viewsOf = (post: XPostEx) => post.views ?? Math.floor(post.likes * 38 + post.retweets * 120 + post.replies * 60 + 40);
    const isNpcVerified = (npc: NPCActor) => npc.tier === 'A_LIST' || npc.tier === 'ESTABLISHED';

    const profilePosts = useMemo<XPostEx[]>(() => {
        if (!selectedProfile) return player.x.posts as XPostEx[];
        const realPosts = feed.filter(post => post.authorId === selectedProfile.id);
        const syntheticPosts: XPostEx[] = Array.from({ length: 8 }).map((_, index) => {
            const types: XPostType[] = selectedProfile.occupation === 'DIRECTOR'
                ? ['FILM_OPINION', 'CAREER', 'GENERAL', 'PR_STATEMENT']
                : ['CAREER', 'JOKE', 'FILM_OPINION', 'FAN_THANKS'];
            const postType = types[(selectedProfile.id.charCodeAt(0) + index) % types.length];
            const likes = Math.max(20, Math.floor((selectedProfile.followers || 1000) * (0.001 + ((index + 2) * 0.0007))));
            return {
                id: `x_profile_${selectedProfile.id}_${index}`,
                authorId: selectedProfile.id,
                authorName: selectedProfile.name,
                authorHandle: selectedProfile.handle,
                authorAvatar: selectedProfile.avatar,
                content: [
                    'Long day, good work.', 'Every project teaches you something.',
                    'The industry is quieter than people think until it suddenly is not.',
                    'Reading a script that understands silence.', 'Grateful for the people still showing up.',
                    'Film discourse is better when people actually watch the film.', 'Back on set soon.',
                    'Some rumors are funnier than the truth.'
                ][index],
                timestamp: Math.max(1, player.currentWeek - index),
                likes,
                retweets: Math.floor(likes * 0.18),
                replies: Math.floor(likes * 0.08),
                isPlayer: false,
                isLiked: false,
                isRetweeted: false,
                isVerified: isNpcVerified(selectedProfile),
                postType,
                replyList: X_REPLY_BANK[postType].slice(0, 3),
                quoteList: ['Interesting timing.', 'This has layers.', 'The replies are better than the trades.'],
                sentiment: postType === 'JOKE' ? 'FUNNY' : postType === 'HOT_TAKE' ? 'MESSY' : 'NEUTRAL',
                mediaColor: index % 3 === 0 ? MEDIA_COLORS[index % MEDIA_COLORS.length] : undefined
            };
        });
        return [...realPosts, ...syntheticPosts].slice(0, 12);
    }, [feed, player.currentWeek, player.x.posts, selectedProfile]);

    const spaces = useMemo(() => npcPool.slice(0, 6).map((npc, i) => ({
        id: `space_${npc.id}`,
        host: npc,
        topic: spaceTopics[(npc.id.charCodeAt(0) + i + player.currentWeek) % spaceTopics.length],
        listeners: Math.max(40, Math.floor((npc.followers || 1000) * 0.002 * (1 + i * 0.3)))
    })), [npcPool, player.currentWeek, spaceTopics]);

    useEffect(() => {
        if (feedBootstrapped.current || !needsFreshFeed) return;
        feedBootstrapped.current = true;
        onUpdatePlayer({ ...player, x: { ...player.x, feed, lastPostWeek: player.currentWeek } });
    }, [feed, needsFreshFeed, onUpdatePlayer, player]);

    // --- HELPERS ---
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };
    const formatMoney = (num: number) => '$' + Math.floor(num).toLocaleString();

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 1800);
    };

    const withExtras = (base: Player, partial: Partial<XExtras>): Player => ({
        ...base,
        flags: { ...(base.flags || {}), xExtras: { ...extras, ...partial, dms: capDmThreads(partial.dms || extras.dms) } } as any
    });

    const patchExtras = (partial: Partial<XExtras>) => onUpdatePlayer(withExtras(player, partial));

    const syncFeed = (updatedFeed: XPostEx[], extraPlayer?: Partial<Player>) => {
        setFeed(updatedFeed);
        const updatedPosts = (player.x.posts as XPostEx[]).map(p => updatedFeed.find(f => f.id === p.id) || p);
        onUpdatePlayer({ ...player, ...extraPlayer, x: { ...player.x, ...(extraPlayer?.x || {}), feed: updatedFeed, posts: updatedPosts } });
    };

    const mutatePost = (postId: string, fn: (p: XPostEx) => XPostEx) => {
        const updatedFeed = feed.map(p => (p.id === postId ? fn(p) : p));
        if (selectedPost?.id === postId) setSelectedPost(fn(selectedPost));
        syncFeed(updatedFeed);
    };

    // --- ACTIONS: POSTING ---
    const resetComposer = () => {
        setTweetContent(''); setThreadParts([]); setPollEnabled(false); setPollOptions(['', '']);
        setComposeCommunity(null); setEditingPostId(null); setComposeOpen(false);
    };

    const openComposer = (type: XPostType = 'GENERAL') => {
        setComposeType(type);
        setComposeOpen(true);
    };

    const postEnergyCost = 5 + (threadParts.length ? 2 : 0);
    const canAffordPost = editingPostId ? true : player.energy.current >= postEnergyCost;

    const handlePost = () => {
        if (!tweetContent.trim()) return;
        if (tweetContent.length > charLimit) return;
        if (!editingPostId && player.energy.current < postEnergyCost) return;

        // EDIT MODE (Premium)
        if (editingPostId) {
            mutatePost(editingPostId, p => ({ ...p, content: tweetContent, isEdited: true }));
            resetComposer();
            showToast('Post edited');
            return;
        }

        const avatarToSave = player.avatar.startsWith('data:') ? '' : player.avatar;
        const currentXFollowers = Math.max(0, player.x.followers);
        const fameFactor = Math.max(1, player.stats.fame);
        const typeConfig = X_POST_TYPES[composeType];
        const community = COMMUNITIES.find(c => c.id === composeCommunity);
        const validPoll = pollEnabled ? pollOptions.map(o => o.trim()).filter(Boolean) : [];
        const hasPoll = validPoll.length >= 2;
        const cleanThread = threadParts.map(p => p.trim()).filter(Boolean);

        const reachMult = typeConfig.reach * (premiumPlan?.reach ?? 1) * (community?.reach ?? 1) * (hasPoll ? 1.2 : 1) * (cleanThread.length ? 1.15 : 1);
        const baseReach = (30 + (currentXFollowers * 0.15) + (fameFactor * 40)) * reachMult;
        const qualityMultiplier = 0.5 + (Math.random() * 2.0);
        const engagementRate = 0.01 + (Math.random() * 0.04);

        let likes = Math.floor(baseReach * engagementRate * qualityMultiplier);
        if (likes <= 0) likes = Math.floor(Math.random() * 3) + 1;
        if (Math.random() < 0.02) likes *= 8;
        else if (Math.random() < 0.1) likes *= 3;

        const retweets = Math.floor(likes * (0.15 + Math.random() * 0.25));
        const replies = Math.floor(likes * (0.05 + Math.random() * 0.15) * (hasPoll ? 1.4 : 1));
        const views = Math.floor(likes * (25 + Math.random() * 45) + baseReach);

        let conversionRate = typeConfig.conversion + (Math.random() * 0.012) + (community?.conversion ?? 0);
        if (currentXFollowers < 500) conversionRate += 0.05;
        let organicGain = Math.floor(likes * conversionRate);
        if (organicGain === 0 && likes > 10) organicGain = 1;

        const adRevenue = premiumPlan && premiumPlan.revShare > 0 && currentXFollowers >= 500
            ? views * 0.0015 * premiumPlan.revShare
            : 0;

        const totalVotes = Math.max(5, Math.floor(likes * 3));
        const pollVotes = hasPoll ? validPoll.map(() => Math.random()).map((r, _, arr) => Math.floor((r / arr.reduce((a, b) => a + b, 0)) * totalVotes)) : [];

        const newPost: XPostEx = {
            id: `x_post_player_${Date.now()}`,
            authorId: 'PLAYER',
            authorName: player.name,
            authorHandle: player.x.handle,
            authorAvatar: avatarToSave,
            content: tweetContent,
            timestamp: player.currentWeek,
            likes, retweets, replies, views,
            isPlayer: true, isLiked: false, isRetweeted: false,
            isVerified: isPlayerVerified,
            postType: composeType,
            replyList: X_REPLY_BANK[composeType].sort(() => 0.5 - Math.random()).slice(0, 4),
            quoteList: ['This is spreading outside the fandom.', 'Someone in the industry definitely saw this.', 'The replies are doing the most.', 'This is the kind of post that changes the week.'].sort(() => 0.5 - Math.random()).slice(0, 2),
            controversyScore: Math.max(0, typeConfig.controversy + Math.floor(Math.random() * 4)),
            sentiment: typeConfig.controversy >= 7 ? 'MESSY' : composeType === 'JOKE' ? 'FUNNY' : composeType === 'CAREER' ? 'INDUSTRY' : 'NEUTRAL',
            poll: hasPoll ? { options: validPoll, votes: pollVotes } : undefined,
            thread: cleanThread.length ? cleanThread : undefined,
            communityId: community?.id,
            adRevenue
        };

        const updatedPosts = [newPost, ...player.x.posts];
        const updatedFeed = [newPost, ...feed];
        const reputationDelta = typeConfig.reputation;
        const controversyDelta = Math.max(-8, typeConfig.controversy);
        const logType = controversyDelta >= 7 ? 'negative' as const : 'positive' as const;

        let nextPlayer: Player = {
            ...player,
            stats: {
                ...player.stats,
                reputation: Math.max(0, Math.min(100, player.stats.reputation + reputationDelta)),
                fame: Math.max(0, Math.min(100, player.stats.fame + (likes >= 500 ? 1 : 0)))
            },
            x: { ...player.x, posts: updatedPosts, feed: updatedFeed, followers: currentXFollowers + organicGain, lastPostWeek: player.currentWeek },
            instagram: { ...player.instagram, controversy: Math.max(0, Math.min(100, (player.instagram.controversy || 0) + Math.max(0, controversyDelta))) },
            logs: [{ week: player.currentWeek, year: player.age, message: controversyDelta >= 7 ? `X heated up after your ${typeConfig.label.toLowerCase()} post.` : `Posted a ${typeConfig.label.toLowerCase()} update on X.`, type: logType }, ...player.logs].slice(0, 50)
        };
        if (adRevenue > 0) nextPlayer = withExtras(nextPlayer, { adBalance: extras.adBalance + adRevenue, adLifetime: extras.adLifetime + adRevenue });
        spendPlayerEnergy(nextPlayer, 5 + (cleanThread.length ? 2 : 0));
        onUpdatePlayer(nextPlayer);
        setFeed(updatedFeed);
        resetComposer();
        showToast(organicGain > 0 ? `Posted · +${formatNumber(organicGain)} followers` : 'Posted');
    };

    const toggleLike = (postId: string) => mutatePost(postId, p => ({ ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }));
    const toggleRetweet = (postId: string) => mutatePost(postId, p => ({ ...p, isRetweeted: !p.isRetweeted, retweets: p.isRetweeted ? p.retweets - 1 : p.retweets + 1 }));

    const toggleBookmark = (post: XPostEx) => {
        const has = extras.bookmarks.includes(post.id);
        const bookmarks = has ? extras.bookmarks.filter(id => id !== post.id) : [post.id, ...extras.bookmarks];
        patchExtras({ bookmarks });
        showToast(has ? 'Removed from Bookmarks' : 'Added to Bookmarks');
    };

    const sharePost = (post: XPostEx) => {
        try { navigator.clipboard?.writeText(`x.com/${post.authorHandle.replace('@', '')}/status/${post.id}`); } catch { /* ignore */ }
        showToast('Link copied');
    };

    const votePoll = (post: XPostEx, index: number) => {
        if (post.isPlayer || post.poll?.voted !== undefined) return;
        mutatePost(post.id, p => p.poll ? { ...p, poll: { ...p.poll, voted: index, votes: p.poll.votes.map((v, i) => (i === index ? v + 1 : v)) } } : p);
    };

    const deletePost = (post: XPostEx) => {
        const updatedFeed = feed.filter(p => p.id !== post.id);
        setFeed(updatedFeed);
        onUpdatePlayer(withExtras({ ...player, x: { ...player.x, feed: updatedFeed, posts: player.x.posts.filter(p => p.id !== post.id) } }, { pinnedPostId: extras.pinnedPostId === post.id ? null : extras.pinnedPostId }));
        setMoreMenuPost(null);
        if (selectedPost?.id === post.id) { setView('MAIN'); setSelectedPost(null); }
        showToast('Post deleted');
    };

    const muteAuthor = (authorId: string) => {
        patchExtras({ muted: [...new Set([...extras.muted, authorId])] });
        setMoreMenuPost(null);
        showToast('Muted');
    };

    const startEdit = (post: XPostEx) => {
        setMoreMenuPost(null);
        setEditingPostId(post.id);
        setTweetContent(post.content);
        setComposeType(post.postType || 'GENERAL');
        setComposeOpen(true);
    };

    const openPostDetail = (post: XPostEx) => {
        setSelectedPost(post);
        setView('POST_DETAIL');
    };

    const handleQuoteOrReply = (post: XPostEx, tone: XReplyTone, mode: 'QUOTE' | 'REPLY') => {
        if (player.energy.current < (mode === 'QUOTE' ? 8 : 5)) return;
        const toneConfig = X_REPLY_TONES[tone];
        const sourceReach = Math.max(40, post.likes + post.retweets * 2 + post.replies * 4);
        const reach = Math.floor(sourceReach * toneConfig.reach * (premiumPlan?.reach ?? 1) * (0.2 + Math.random() * 0.25));
        const likes = Math.max(1, Math.floor(reach * (0.08 + Math.random() * 0.08)));
        const retweets = Math.floor(likes * (mode === 'QUOTE' ? 0.35 : 0.18));
        const replies = Math.floor(likes * (toneConfig.controversy > 4 ? 0.28 : 0.1));
        const gainedFollowers = Math.max(0, Math.floor(likes * (toneConfig.controversy > 4 ? 0.012 : 0.018)));
        const postType: XPostType = tone === 'CLAP_BACK' ? 'DRAMA_REPLY' : tone === 'JOKE' ? 'JOKE' : tone === 'CLARIFY' || tone === 'APOLOGIZE' ? 'PR_STATEMENT' : 'GENERAL';
        const newPost: XPostEx = {
            id: `x_${mode.toLowerCase()}_${Date.now()}`,
            authorId: 'PLAYER',
            authorName: player.name,
            authorHandle: player.x.handle,
            authorAvatar: player.avatar.startsWith('data:') ? '' : player.avatar,
            content: mode === 'QUOTE' ? `${toneConfig.text}\n\nQuote: "${post.content}"` : `Replying to ${post.authorHandle}\n${toneConfig.text}`,
            timestamp: player.currentWeek,
            likes, retweets, replies,
            views: Math.floor(reach * 30),
            isPlayer: true, isLiked: false, isRetweeted: false,
            isVerified: isPlayerVerified,
            postType,
            quoteOfId: mode === 'QUOTE' ? post.id : undefined,
            replyList: X_REPLY_BANK[postType === 'GENERAL' ? 'PR_STATEMENT' : postType].slice(0, 4),
            quoteList: ['This reply changed the tone.', 'The timeline is watching.', 'Smart move.', 'Risky but effective.'],
            controversyScore: Math.max(0, toneConfig.controversy),
            sentiment: toneConfig.controversy >= 6 ? 'MESSY' : tone === 'JOKE' ? 'FUNNY' : 'NEUTRAL'
        };
        const updatedFeed = [newPost, ...feed].slice(0, 80);
        const updatedPosts = [newPost, ...player.x.posts].slice(0, 80);
        const nextPlayer: Player = {
            ...player,
            stats: {
                ...player.stats,
                reputation: Math.max(0, Math.min(100, player.stats.reputation + toneConfig.reputation)),
                fame: Math.max(0, Math.min(100, player.stats.fame + (likes >= 1000 ? 1 : 0)))
            },
            x: { ...player.x, posts: updatedPosts, feed: updatedFeed, followers: player.x.followers + gainedFollowers },
            instagram: { ...player.instagram, controversy: Math.max(0, Math.min(100, (player.instagram.controversy || 0) + Math.max(0, toneConfig.controversy))) },
            logs: [{ week: player.currentWeek, year: player.age, message: mode === 'QUOTE' ? `Quoted ${post.authorName} on X.` : `Replied to ${post.authorName} on X.`, type: toneConfig.controversy >= 6 ? 'negative' as const : 'positive' as const }, ...player.logs].slice(0, 50)
        };
        spendPlayerEnergy(nextPlayer, mode === 'QUOTE' ? 8 : 5);
        setFeed(updatedFeed);
        setSelectedPost(newPost);
        setReplyDraft('');
        onUpdatePlayer(nextPlayer);
    };

    const submitCustomReply = () => {
        if (!selectedPost) return;
        const text = replyDraft.trim();
        if (!text || player.energy.current < 5) return;
        const newPost: XPostEx = {
            id: `x_reply_${Date.now()}`,
            authorId: 'PLAYER',
            authorName: player.name,
            authorHandle: player.x.handle,
            authorAvatar: player.avatar.startsWith('data:') ? '' : player.avatar,
            content: text,
            timestamp: player.currentWeek,
            likes: Math.max(1, Math.floor((selectedPost.likes || 10) * 0.04)),
            retweets: 0,
            replies: 0,
            isPlayer: true,
            isLiked: false,
            isRetweeted: false,
            isVerified: isPlayerVerified,
            postType: 'DRAMA_REPLY',
            replyList: [],
            sentiment: 'NEUTRAL',
        };
        const updatedTarget: XPostEx = {
            ...selectedPost,
            replies: selectedPost.replies + 1,
            replyList: [text, ...(selectedPost.replyList || [])].slice(0, 12),
        };
        const updatedFeed = [newPost, ...feed.map(post => post.id === selectedPost.id ? updatedTarget : post)].slice(0, 80);
        const nextPlayer: Player = {
            ...player,
            x: {
                ...player.x,
                posts: [newPost, ...player.x.posts].slice(0, 80),
                feed: updatedFeed,
                lastPostWeek: player.currentWeek,
            },
            logs: [{ week: player.currentWeek, year: player.age, message: `Replied to ${selectedPost.authorName} on X.`, type: 'neutral' as const }, ...player.logs].slice(0, 50),
        };
        spendPlayerEnergy(nextPlayer, 5);
        setFeed(updatedFeed);
        setSelectedPost(updatedTarget);
        setReplyDraft('');
        onUpdatePlayer(nextPlayer);
        showToast('Reply posted');
    };

    // --- ACTIONS: SOCIAL ---
    const defaultNpcState = (npc: NPCActor): NPCState => ({
        npcId: npc.id, isFollowing: false, isFollowedBy: false, relationshipScore: 0, relationshipLevel: 'STRANGER', lastInteractionWeek: 0, hasMet: false, chatHistory: []
    } as NPCState);

    const handleFollowToggle = (npc: NPCActor) => {
        const currentState = npcStates[npc.id] || defaultNpcState(npc);
        onUpdatePlayer({
            ...player,
            instagram: { ...player.instagram, npcStates: { ...player.instagram.npcStates, [npc.id]: { ...currentState, isFollowing: !currentState.isFollowing } } }
        });
    };

    const handleProfileClick = (npcId: string) => {
        setProfileTab('POSTS');
        if (npcId === 'PLAYER') {
            setSelectedProfile(null);
            setTab('PROFILE');
        } else {
            const npc = npcPool.find(n => n.id === npcId);
            if (npc) { setSelectedProfile(npc); setTab('PROFILE'); }
        }
    };

    const openChat = (npc: NPCActor) => {
        setChatNpc(npc);
        setChatDraft('');
        setView('CHAT');
    };

    const sendDM = () => {
        if (!chatNpc || !chatDraft.trim() || player.energy.current < 2) return;
        const history = extras.dms[chatNpc.id] || [];
        const reply = DM_REPLIES[(history.length + chatNpc.id.charCodeAt(0)) % DM_REPLIES.length];
        const newHistory: DMMessage[] = [...history, { from: 'ME', text: chatDraft.trim(), week: player.currentWeek }, { from: 'THEM', text: reply, week: player.currentWeek }];
        const currentState = npcStates[chatNpc.id] || defaultNpcState(chatNpc);
        let nextPlayer = withExtras({
            ...player,
            instagram: {
                ...player.instagram,
                npcStates: {
                    ...player.instagram.npcStates,
                    [chatNpc.id]: { ...currentState, hasMet: true, lastInteractionWeek: player.currentWeek, relationshipScore: Math.min(100, (currentState.relationshipScore || 0) + 2) }
                }
            }
        }, { dms: { ...extras.dms, [chatNpc.id]: newHistory } });
        spendPlayerEnergy(nextPlayer, 2);
        onUpdatePlayer(nextPlayer);
        setChatDraft('');
    };

    // --- ACTIONS: PREMIUM / MONEY ---
    const buyPremium = (tier: Exclude<PremiumTier, 'NONE'>) => {
        const plan = PREMIUM_PLANS[tier];
        if (money < plan.price) { showToast('Not enough money'); return; }
        const nextPlayer = withExtras({ ...player, money: money - plan.price } as Player, { premium: tier, premiumUntil: absWeek + 4 });
        onUpdatePlayer({
            ...nextPlayer,
            logs: [{ week: player.currentWeek, year: player.age, message: `Subscribed to X ${plan.name}.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
        });
        showToast(`${plan.name} active for 4 weeks`);
    };

    const cancelPremium = () => { patchExtras({ premium: 'NONE', premiumUntil: 0 }); showToast('Subscription cancelled'); };

    const payout = () => {
        if (extras.adBalance < 10) { showToast('Minimum payout is $10'); return; }
        const amount = extras.adBalance;
        onUpdatePlayer(withExtras({
            ...player,
            money: money + amount,
            logs: [{ week: player.currentWeek, year: player.age, message: `X ad revenue payout: ${formatMoney(amount)}.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
        } as Player, { adBalance: 0 }));
        showToast(`Paid out ${formatMoney(amount)}`);
    };

    const toggleCommunity = (id: string) => {
        const joined = extras.communities.includes(id);
        patchExtras({ communities: joined ? extras.communities.filter(c => c !== id) : [...extras.communities, id] });
    };

    // --- ACTIONS: SPACES ---
    const joinSpace = (spaceId: string, host: NPCActor) => {
        if (player.energy.current < 3) { showToast('Not enough energy'); return; }
        setLiveSpaceId(spaceId);
        const gain = Math.floor(2 + Math.random() * 6 + player.stats.fame * 0.1);
        const currentState = npcStates[host.id] || defaultNpcState(host);
        const nextPlayer: Player = {
            ...player,
            x: { ...player.x, followers: player.x.followers + gain },
            instagram: { ...player.instagram, npcStates: { ...player.instagram.npcStates, [host.id]: { ...currentState, hasMet: true, relationshipScore: Math.min(100, (currentState.relationshipScore || 0) + 1) } } }
        };
        spendPlayerEnergy(nextPlayer, 3);
        onUpdatePlayer(nextPlayer);
        showToast(`Joined · +${gain} followers`);
    };

    const hostSpace = () => {
        if (player.energy.current < 10) { showToast('Need 10 energy to host'); return; }
        const listeners = Math.floor(20 + player.x.followers * 0.01 * (0.5 + Math.random()) + player.stats.fame * 15);
        const gain = Math.floor(listeners * (0.08 + Math.random() * 0.1));
        const nextPlayer = withExtras({
            ...player,
            x: { ...player.x, followers: player.x.followers + gain },
            stats: { ...player.stats, reputation: Math.min(100, player.stats.reputation + 1) },
            logs: [{ week: player.currentWeek, year: player.age, message: `Hosted an X Space with ${formatNumber(listeners)} listeners.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
        }, { spacesHosted: extras.spacesHosted + 1 });
        spendPlayerEnergy(nextPlayer, 10);
        onUpdatePlayer(nextPlayer);
        setLiveSpaceId('mine');
        showToast(`${formatNumber(listeners)} listeners · +${gain} followers`);
    };

    // --- FILTERED DATA ---
    const visibleFeed = feed.filter(p => p.isPlayer || !extras.muted.includes(p.authorId));
    const filteredFeed = feedTab === 'FOR_YOU'
        ? visibleFeed
        : visibleFeed.filter(p => p.isPlayer || npcStates[p.authorId]?.isFollowing);

    const bookmarkedPosts = extras.bookmarks.map(id => feed.find(p => p.id === id) || (player.x.posts as XPostEx[]).find(p => p.id === id)).filter(Boolean) as XPostEx[];

    const searchPeople = searchQuery.trim() ? npcPool.filter(n => `${n.name} ${n.handle}`.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8) : [];
    const searchPosts = searchQuery.trim() ? visibleFeed.filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10) : [];

    const profileTabPosts: XPostEx[] = (() => {
        const isReply = (p: XPostEx) => p.id.startsWith('x_reply_') || p.id.startsWith('x_quote_');
        if (profileTab === 'LIKES') return feed.filter(p => p.isLiked);
        if (profileTab === 'MEDIA') return profilePosts.filter(p => p.mediaColor);
        if (profileTab === 'REPLIES') return profilePosts.filter(isReply);
        const base = profilePosts.filter(p => !isReply(p));
        if (!selectedProfile && extras.pinnedPostId) {
            const pinned = base.find(p => p.id === extras.pinnedPostId);
            if (pinned) return [{ ...pinned, isPinned: true }, ...base.filter(p => p.id !== pinned.id)];
        }
        return base;
    })();

    const notifications = useMemo(() => {
        const list: { id: string; kind: 'LIKE' | 'REPOST' | 'REPLY' | 'FOLLOW' | 'MENTION' | 'SYSTEM'; npc: NPCActor; post?: XPostEx; text: string }[] = [];
        if (premiumActive !== 'NONE') list.push({ id: 'sys_premium', kind: 'SYSTEM', npc: npcPool[0], text: `Your ${PREMIUM_PLANS[premiumActive].name} subscription is active. Replies are boosted.` });
        (player.x.posts as XPostEx[]).slice(0, 8).forEach((post, index) => {
            const npc = npcPool[(index * 3) % npcPool.length] || NPC_DATABASE[0];
            const kinds: Array<'LIKE' | 'REPOST' | 'REPLY' | 'MENTION'> = ['LIKE', 'REPOST', 'REPLY', 'MENTION'];
            const kind = kinds[index % kinds.length];
            list.push({ id: `${post.id}_note`, kind, npc, post, text: kind === 'LIKE' ? 'liked your post' : kind === 'REPOST' ? 'reposted your post' : kind === 'REPLY' ? 'replied to your post' : 'mentioned you in a post' });
        });
        npcPool.slice(3, 6).forEach((npc, i) => { if ((player.x.followers + i) % 2 === 0) list.push({ id: `follow_${npc.id}`, kind: 'FOLLOW', npc, text: 'followed you' }); });
        return list.filter(n => notifFilter === 'ALL' ? true : notifFilter === 'VERIFIED' ? isNpcVerified(n.npc) || n.kind === 'SYSTEM' : n.kind === 'MENTION' || n.kind === 'REPLY');
    }, [player.x.posts, player.x.followers, npcPool, notifFilter, premiumActive]);

    const activeComposeConfig = X_POST_TYPES[composeType];
    const composeImpact = [
        { label: 'Reach', value: `x${(activeComposeConfig.reach * (premiumPlan?.reach ?? 1)).toFixed(2)}`, color: 'text-blue-300' },
        { label: 'Followers', value: activeComposeConfig.conversion >= 0.028 ? 'High' : activeComposeConfig.conversion >= 0.02 ? 'Medium' : 'Low', color: 'text-emerald-300' },
        { label: 'Heat', value: activeComposeConfig.controversy > 6 ? 'Risky' : activeComposeConfig.controversy > 0 ? `+${activeComposeConfig.controversy}` : activeComposeConfig.controversy < 0 ? 'Cools' : 'Low', color: activeComposeConfig.controversy > 0 ? 'text-red-300' : activeComposeConfig.controversy < 0 ? 'text-emerald-300' : 'text-zinc-300' },
        { label: 'Rep', value: activeComposeConfig.reputation > 0 ? `+${activeComposeConfig.reputation}` : `${activeComposeConfig.reputation}`, color: activeComposeConfig.reputation >= 0 ? 'text-emerald-300' : 'text-rose-300' }
    ];

    // --- SUB-COMPONENTS ---
    const Verified: React.FC<{ size?: number; gold?: boolean }> = ({ size = 14, gold }) => (
        <BadgeCheck size={size} className={gold ? 'text-amber-400 fill-amber-400/20 shrink-0' : 'text-blue-400 fill-blue-400/20 shrink-0'} />
    );

    const PollBlock: React.FC<{ post: XPostEx }> = ({ post }) => {
        if (!post.poll) return null;
        const total = Math.max(1, post.poll.votes.reduce((a, b) => a + b, 0));
        const showResults = post.isPlayer || post.poll.voted !== undefined;
        return (
            <div className="mb-3 space-y-1.5" onClick={e => e.stopPropagation()}>
                {post.poll.options.map((opt, i) => {
                    const pct = Math.round((post.poll!.votes[i] / total) * 100);
                    return (
                        <button key={i} onClick={() => votePoll(post, i)} disabled={showResults} className="relative w-full overflow-hidden rounded-lg border border-zinc-800 text-left text-sm">
                            {showResults && <div className="absolute inset-y-0 left-0 bg-blue-500/25" style={{ width: `${pct}%` }} />}
                            <div className="relative flex justify-between px-3 py-2">
                                <span className={post.poll!.voted === i ? 'font-bold text-white' : 'text-zinc-200'}>{opt}</span>
                                {showResults && <span className="font-bold text-zinc-300">{pct}%</span>}
                            </div>
                        </button>
                    );
                })}
                <div className="text-xs text-zinc-500">{formatNumber(total)} votes · {post.timestamp === player.currentWeek ? '2 days left' : 'Final results'}</div>
            </div>
        );
    };

    const TweetCard: React.FC<{ post: XPostEx; compact?: boolean }> = ({ post, compact }) => {
        const avatarSrc = post.isPlayer ? player.avatar : post.authorAvatar;
        const bookmarked = extras.bookmarks.includes(post.id);
        const community = COMMUNITIES.find(c => c.id === post.communityId);
        return (
            <div onClick={() => openPostDetail(post)} className="p-4 flex gap-3 border-b border-zinc-800 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="shrink-0" onClick={(e) => { e.stopPropagation(); handleProfileClick(post.authorId); }}>
                    <img src={avatarSrc} className="w-10 h-10 rounded-full object-cover bg-zinc-800 border border-zinc-800" />
                </div>
                <div className="flex-1 min-w-0">
                    {post.isPinned && <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 mb-1"><Pin size={11} /> Pinned</div>}
                    {community && <div className="text-[11px] font-bold text-zinc-500 mb-1">{community.emoji} {community.name}</div>}
                    <div className="flex items-center gap-1 mb-0.5">
                        <span className="font-bold text-white truncate max-w-[130px] hover:underline" onClick={(e) => { e.stopPropagation(); handleProfileClick(post.authorId); }}>{post.authorName}</span>
                        {(post.isPlayer ? isPlayerVerified : post.isVerified) && <Verified gold={post.isPlayer && premiumActive === 'PLUS'} />}
                        <span className="text-zinc-500 text-sm truncate">{post.authorHandle} · {post.timestamp === player.currentWeek ? '2h' : `${player.currentWeek - post.timestamp}w`}</span>
                        <button onClick={(e) => { e.stopPropagation(); setMoreMenuPost(post); }} className="ml-auto p-1 text-zinc-500 hover:text-blue-400"><MoreHorizontal size={16} /></button>
                    </div>
                    <div className={`text-sm text-zinc-200 leading-normal mb-3 whitespace-pre-wrap ${compact ? 'line-clamp-3' : ''}`}>
                        {post.content}
                        {post.isEdited && <span className="text-zinc-600 text-xs"> · edited</span>}
                    </div>
                    {post.thread && post.thread.length > 0 && <div className="mb-3 text-xs font-bold text-blue-400">Show this thread ({post.thread.length + 1} posts)</div>}
                    {post.mediaColor && <div className={`mb-3 h-40 rounded-2xl border border-zinc-800 bg-gradient-to-br ${post.mediaColor}`} />}
                    <PollBlock post={post} />
                    {post.quoteOfId && <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">Quoted post</div>}

                    <div className="flex justify-between items-center text-zinc-500 pr-1">
                        <button onClick={(e) => { e.stopPropagation(); openPostDetail(post); setReplyDraft(''); }} className="flex items-center gap-1 group hover:text-blue-400 transition-colors">
                            <MessageCircle size={16} className="group-hover:bg-blue-500/10 rounded-full p-1 box-content" />
                            <span className="text-xs">{formatNumber(post.replies)}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleRetweet(post.id); }} className={`flex items-center gap-1 group transition-colors ${post.isRetweeted ? 'text-green-500' : 'hover:text-green-400'}`}>
                            <Repeat size={16} className="group-hover:bg-green-500/10 rounded-full p-1 box-content" />
                            <span className="text-xs">{formatNumber(post.retweets)}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(post.id); }} className={`flex items-center gap-1 group transition-colors ${post.isLiked ? 'text-pink-500' : 'hover:text-pink-400'}`}>
                            <Heart size={16} fill={post.isLiked ? 'currentColor' : 'none'} className="group-hover:bg-pink-500/10 rounded-full p-1 box-content" />
                            <span className="text-xs">{formatNumber(post.likes)}</span>
                        </button>
                        <div className="flex items-center gap-1">
                            <BarChart2 size={16} className="p-1 box-content" />
                            <span className="text-xs">{formatNumber(viewsOf(post))}</span>
                        </div>
                        <div className="flex items-center">
                            <button onClick={(e) => { e.stopPropagation(); toggleBookmark(post); }} className={bookmarked ? 'text-blue-400' : 'hover:text-blue-400'}>
                                <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} className="p-1 box-content" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); sharePost(post); }} className="hover:text-blue-400">
                                <Share size={16} className="p-1 box-content" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const SubHeader: React.FC<{ title: string; subtitle?: string; onBack: () => void; right?: React.ReactNode }> = ({ title, subtitle, onBack: back, right }) => (
        <div className="sticky top-0 z-20 bg-black/85 backdrop-blur-md px-4 pt-12 pb-3 border-b border-zinc-800 flex items-center gap-4">
            <button onClick={back} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
            <div className="flex-1 min-w-0">
                <div className="font-black text-lg leading-none truncate">{title}</div>
                {subtitle && <div className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">{subtitle}</div>}
            </div>
            {right}
        </div>
    );

    const closeSubView = () => { setView('MAIN'); setSelectedPost(null); setChatNpc(null); };

    const NavButton: React.FC<{ id: XTab; icon: React.ElementType; badge?: number }> = ({ id, icon: Icon, badge }) => (
        <button onClick={() => { setTab(id); if (id === 'PROFILE') setSelectedProfile(null); }} className={`relative p-3 rounded-full ${tab === id ? 'text-white' : 'text-zinc-500'}`}>
            <Icon size={24} strokeWidth={tab === id ? 2.6 : 2} />
            {!!badge && <span className="absolute top-2 right-2 min-w-[16px] h-4 rounded-full bg-blue-500 text-[9px] font-black text-white flex items-center justify-center px-1">{badge}</span>}
        </button>
    );

    // =====================================================================
    // RENDER
    // =====================================================================
    return (
        <div className="absolute inset-0 bg-black flex flex-col lg:flex-row z-40 text-white animate-in slide-in-from-right duration-300 font-sans overflow-hidden">

            {/* TOAST */}
            {toast && <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[90] rounded-full bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-xl">{toast}</div>}

            {/* MORE MENU SHEET */}
            {moreMenuPost && (
                <div className="absolute inset-0 z-[85] flex items-end bg-black/60" onClick={() => setMoreMenuPost(null)}>
                    <div className="w-full rounded-t-3xl border-t border-zinc-800 bg-zinc-950 p-4 pb-10 space-y-1 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />
                        <button onClick={() => { toggleBookmark(moreMenuPost); setMoreMenuPost(null); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-zinc-900"><Bookmark size={18} /> {extras.bookmarks.includes(moreMenuPost.id) ? 'Remove bookmark' : 'Bookmark'}</button>
                        <button onClick={() => { sharePost(moreMenuPost); setMoreMenuPost(null); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-zinc-900"><Share size={18} /> Copy link</button>
                        {moreMenuPost.isPlayer ? (
                            <>
                                <button onClick={() => { patchExtras({ pinnedPostId: extras.pinnedPostId === moreMenuPost.id ? null : moreMenuPost.id }); setMoreMenuPost(null); showToast(extras.pinnedPostId === moreMenuPost.id ? 'Unpinned' : 'Pinned to profile'); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-zinc-900"><Pin size={18} /> {extras.pinnedPostId === moreMenuPost.id ? 'Unpin from profile' : 'Pin to your profile'}</button>
                                <button onClick={() => premiumActive !== 'NONE' && moreMenuPost.timestamp === player.currentWeek ? startEdit(moreMenuPost) : (setMoreMenuPost(null), setView('PREMIUM'))} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-zinc-900">
                                    <Pencil size={18} /> Edit post {premiumActive === 'NONE' ? <span className="ml-auto text-[10px] font-black text-amber-400 uppercase">Premium</span> : moreMenuPost.timestamp !== player.currentWeek ? <span className="ml-auto text-[10px] text-zinc-500 uppercase">Expired</span> : null}
                                </button>
                                <button onClick={() => deletePost(moreMenuPost)} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-red-400 hover:bg-zinc-900"><Trash2 size={18} /> Delete</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { const npc = npcPool.find(n => n.id === moreMenuPost.authorId); if (npc) handleFollowToggle(npc); setMoreMenuPost(null); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-zinc-900"><UserPlus size={18} /> {npcStates[moreMenuPost.authorId]?.isFollowing ? 'Unfollow' : 'Follow'} {moreMenuPost.authorHandle}</button>
                                <button onClick={() => muteAuthor(moreMenuPost.authorId)} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-zinc-900"><X size={18} /> Mute {moreMenuPost.authorHandle}</button>
                                <button onClick={() => setMoreMenuPost(null)} className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-zinc-400 hover:bg-zinc-900"><Flame size={18} /> Not interested in this post</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* LEFT DRAWER */}
            {drawerOpen && (
                <div className="absolute inset-0 z-[80] flex bg-black/60" onClick={() => setDrawerOpen(false)}>
                    <div className="h-full w-[78%] max-w-xs bg-black border-r border-zinc-800 pt-14 px-5 overflow-y-auto animate-in slide-in-from-left duration-200" onClick={e => e.stopPropagation()}>
                        <img src={player.avatar} className="w-12 h-12 rounded-full object-cover border border-zinc-800" />
                        <div className="mt-3 flex items-center gap-1 font-black text-lg">{player.name} {isPlayerVerified && <Verified gold={premiumActive === 'PLUS'} />}</div>
                        <div className="text-sm text-zinc-500">{player.x.handle}</div>
                        <div className="mt-3 flex gap-4 text-sm"><span><b className="text-white">12</b> <span className="text-zinc-500">Following</span></span><span><b className="text-white">{formatNumber(player.x.followers || 0)}</b> <span className="text-zinc-500">Followers</span></span></div>
                        <div className="mt-6 space-y-1">
                            {[
                                { label: 'Profile', icon: User, action: () => { setSelectedProfile(null); setTab('PROFILE'); } },
                                { label: premiumActive === 'NONE' ? 'Premium' : `Premium · ${PREMIUM_PLANS[premiumActive].name}`, icon: Crown, action: () => setView('PREMIUM') },
                                { label: 'Bookmarks', icon: Bookmark, action: () => setView('BOOKMARKS') },
                                { label: 'Lists', icon: List, action: () => setView('LISTS') },
                                { label: 'Communities', icon: Users, action: () => setView('COMMUNITIES') },
                                { label: 'Spaces', icon: Mic, action: () => setTab('SPACES') },
                                { label: 'Monetization', icon: DollarSign, action: () => setView('MONETIZATION') }
                            ].map(item => (
                                <button key={item.label} onClick={() => { item.action(); setDrawerOpen(false); }} className="w-full flex items-center gap-4 rounded-xl px-2 py-3 text-lg font-bold hover:bg-zinc-900"><item.icon size={22} /> {item.label}</button>
                            ))}
                        </div>
                        <div className="mt-6 border-t border-zinc-800 pt-4 space-y-1">
                            <button onClick={() => { patchExtras({ muted: [] }); showToast('Unmuted everyone'); }} className="w-full flex items-center gap-3 px-2 py-2 text-sm text-zinc-400 hover:text-white"><Settings size={16} /> Settings · Unmute all ({extras.muted.length})</button>
                            <button onClick={() => { setDrawerOpen(false); onBack(); }} className="w-full flex items-center gap-3 px-2 py-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={16} /> Exit X</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= SUB VIEWS ================= */}

            {/* POST DETAIL */}
            {view === 'POST_DETAIL' && selectedPost && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <SubHeader title="Post" subtitle={X_POST_TYPES[selectedPost.postType || 'GENERAL'].label} onBack={closeSubView} right={<button onClick={() => setMoreMenuPost(selectedPost)} className="p-2 text-zinc-400"><MoreHorizontal size={20} /></button>} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                        <div className="p-4 border-b border-zinc-800">
                            <div className="flex gap-3">
                                <img src={selectedPost.isPlayer ? player.avatar : selectedPost.authorAvatar} className="w-12 h-12 rounded-full object-cover bg-zinc-800" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1"><div className="font-black text-white truncate">{selectedPost.authorName}</div>{(selectedPost.isPlayer ? isPlayerVerified : selectedPost.isVerified) && <Verified />}</div>
                                    <div className="text-sm text-zinc-500">{selectedPost.authorHandle}</div>
                                </div>
                            </div>
                            <div className="mt-4 whitespace-pre-wrap text-[17px] leading-relaxed text-white">{selectedPost.content}</div>
                            {selectedPost.thread?.map((part, i) => (
                                <div key={i} className="mt-3 border-l-2 border-zinc-800 pl-3 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-200"><span className="text-xs font-black text-zinc-500">{i + 2}/</span> {part}</div>
                            ))}
                            {selectedPost.mediaColor && <div className={`mt-4 h-52 rounded-2xl border border-zinc-800 bg-gradient-to-br ${selectedPost.mediaColor}`} />}
                            <div className="mt-4"><PollBlock post={selectedPost} /></div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-widest">
                                <span className="rounded-full bg-zinc-900 px-3 py-1 text-zinc-400">{selectedPost.timestamp === player.currentWeek ? 'This week' : `Week ${selectedPost.timestamp}`}</span>
                                <span className="rounded-full bg-zinc-900 px-3 py-1 text-zinc-400 flex items-center gap-1"><Eye size={11} /> {formatNumber(viewsOf(selectedPost))} views</span>
                                {(selectedPost.controversyScore || 0) > 0 && <span className="rounded-full bg-red-500/10 px-3 py-1 text-red-300">Heat {selectedPost.controversyScore}</span>}
                                {selectedPost.isEdited && <span className="rounded-full bg-zinc-900 px-3 py-1 text-zinc-500">Edited</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 border-b border-zinc-800 text-center">
                            <div className="p-3"><div className="font-black">{formatNumber(selectedPost.replies)}</div><div className="text-[10px] text-zinc-500 uppercase">Replies</div></div>
                            <div className="p-3 border-l border-zinc-800"><div className="font-black">{formatNumber(selectedPost.retweets)}</div><div className="text-[10px] text-zinc-500 uppercase">Reposts</div></div>
                            <div className="p-3 border-l border-zinc-800"><div className="font-black">{formatNumber(selectedPost.likes)}</div><div className="text-[10px] text-zinc-500 uppercase">Likes</div></div>
                            <div className="p-3 border-l border-zinc-800"><div className="font-black">{formatNumber(extras.bookmarks.includes(selectedPost.id) ? Math.floor(selectedPost.likes * 0.12) + 1 : Math.floor(selectedPost.likes * 0.12))}</div><div className="text-[10px] text-zinc-500 uppercase">Saves</div></div>
                        </div>

                        <div className="flex justify-around border-b border-zinc-800 py-2 text-zinc-500">
                            <button onClick={() => {
                                if (selectedPost.isPlayer) { setTab('MESSAGES'); setView('MAIN'); return; }
                                const npc = npcPool.find(entry => entry.id === selectedPost.authorId);
                                if (npc) openChat(npc);
                            }} className="p-2 hover:text-blue-400" aria-label="Message"><MessageCircle size={20} /></button>
                            <button onClick={() => toggleRetweet(selectedPost.id)} className={`p-2 ${selectedPost.isRetweeted ? 'text-green-500' : ''}`}><Repeat size={20} /></button>
                            <button onClick={() => toggleLike(selectedPost.id)} className={`p-2 ${selectedPost.isLiked ? 'text-pink-500' : ''}`}><Heart size={20} fill={selectedPost.isLiked ? 'currentColor' : 'none'} /></button>
                            <button onClick={() => toggleBookmark(selectedPost)} className={`p-2 ${extras.bookmarks.includes(selectedPost.id) ? 'text-blue-400' : ''}`}><Bookmark size={20} fill={extras.bookmarks.includes(selectedPost.id) ? 'currentColor' : 'none'} /></button>
                            <button onClick={() => sharePost(selectedPost)} className="p-2"><Share size={20} /></button>
                        </div>

                        {selectedPost.isPlayer && (
                            <div className="p-4 border-b border-zinc-800">
                                <div className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2"><BarChart2 size={14} /> Post analytics</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Impressions', value: formatNumber(viewsOf(selectedPost)) },
                                        { label: 'Engagement rate', value: `${((selectedPost.likes + selectedPost.retweets + selectedPost.replies) / Math.max(1, viewsOf(selectedPost)) * 100).toFixed(1)}%` },
                                        { label: 'Profile visits', value: formatNumber(Math.floor(viewsOf(selectedPost) * 0.03)) },
                                        { label: 'Ad revenue', value: selectedPost.adRevenue ? formatMoney(selectedPost.adRevenue) : premiumPlan?.revShare ? '$0' : 'Premium only' }
                                    ].map(s => (
                                        <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"><div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{s.label}</div><div className="text-base font-black mt-1">{s.value}</div></div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!selectedPost.isPlayer && (
                            <div className="p-4 border-b border-zinc-800">
                                <div className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Respond</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.keys(X_REPLY_TONES) as XReplyTone[]).map(tone => (
                                        <button key={tone} onClick={() => handleQuoteOrReply(selectedPost, tone, tone === 'SUPPORT' || tone === 'CLARIFY' ? 'REPLY' : 'QUOTE')} disabled={player.energy.current < 5} className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-left disabled:opacity-40">
                                            <div className="text-sm font-black text-white">{X_REPLY_TONES[tone].label}</div>
                                            <div className="mt-1 text-[11px] leading-snug text-zinc-500">{tone === 'CLAP_BACK' ? 'High reach, risky.' : tone === 'APOLOGIZE' ? 'Cools backlash.' : tone === 'SUPPORT' || tone === 'CLARIFY' ? 'Public reply.' : 'Quote post.'}</div>
                                        </button>
                                    ))}
                                </div>
                                {premiumActive !== 'NONE' && <div className="mt-2 text-[10px] text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1"><Sparkles size={11} /> Premium reply boost active</div>}
                                {player.energy.current < 5 && <div className="mt-2 text-[11px] font-bold text-amber-300">Need 5 energy to reply. You have {player.energy.current}.</div>}
                            </div>
                        )}

                        <div className="p-4 space-y-4">
                            <div>
                                <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Replies</div>
                                {(selectedPost.replyList && selectedPost.replyList.length > 0 ? selectedPost.replyList : X_REPLY_BANK[selectedPost.postType || 'GENERAL']).map((reply, index) => {
                                    const mine = player.x.posts.some(post => post.isPlayer && (post.content === reply || post.content.endsWith(reply)));
                                    return (
                                    <div key={`${selectedPost.id}_reply_${index}`} className="flex gap-3 border-b border-zinc-900 py-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-xs font-black text-zinc-400">{mine ? <img src={player.avatar} className="h-full w-full object-cover" /> : '@'}</div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-zinc-500 flex items-center gap-1">{mine ? player.x.handle : `@timeline_${index + 1}`} {index === 0 && <Verified size={11} />}</div>
                                            <div className="text-sm leading-relaxed text-zinc-200">{reply}</div>
                                            <div className="mt-1 flex gap-4 text-[11px] text-zinc-600"><span>{formatNumber(Math.floor(selectedPost.likes * 0.04 / (index + 1)))} likes</span><span>{formatNumber(Math.floor(viewsOf(selectedPost) * 0.05 / (index + 1)))} views</span></div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            <div>
                                <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">Quotes</div>
                                {(selectedPost.quoteList && selectedPost.quoteList.length > 0 ? selectedPost.quoteList : ['People are watching this one.']).map((quote, index) => (
                                    <div key={`${selectedPost.id}_quote_${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300 mb-2"><span className="font-bold text-white">@quote_room_{index + 1}</span> {quote}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-zinc-800 bg-black px-3 pb-6 pt-3">
                        <div className="flex items-center gap-2">
                            <img src={player.avatar} className="h-9 w-9 rounded-full object-cover" />
                            <input value={replyDraft} onChange={e => setReplyDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitCustomReply()} placeholder={`Reply to ${selectedPost.authorHandle}`} className="flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
                            <button onClick={submitCustomReply} disabled={!replyDraft.trim() || player.energy.current < 5} className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-black disabled:opacity-40">Reply</button>
                        </div>
                        {player.energy.current < 5 && <div className="mt-2 text-center text-[11px] font-bold text-amber-300">Need 5 energy to reply. You have {player.energy.current}.</div>}
                    </div>
                </div>
            )}

            {/* PREMIUM */}
            {view === 'PREMIUM' && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <SubHeader title="Premium" subtitle={premiumActive === 'NONE' ? 'Not subscribed' : `${PREMIUM_PLANS[premiumActive].name} · ${Math.max(0, extras.premiumUntil - absWeek)} weeks left`} onBack={closeSubView} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-3">
                        <div className="rounded-[1.75rem] border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-5">
                            <div className="flex items-center gap-2 text-amber-400 font-black uppercase tracking-widest text-xs"><Crown size={14} /> Upgrade your reach</div>
                            <div className="mt-2 text-2xl font-black">Get verified. Get paid.</div>
                            <div className="mt-1 text-sm text-zinc-400">Subscriptions run 4 weeks. Balance: <span className="text-white font-bold">{formatMoney(money)}</span></div>
                        </div>
                        {(Object.keys(PREMIUM_PLANS) as Array<Exclude<PremiumTier, 'NONE'>>).map(tier => {
                            const plan = PREMIUM_PLANS[tier];
                            const active = premiumActive === tier;
                            return (
                                <div key={tier} className={`rounded-[1.5rem] border p-4 ${active ? 'border-blue-500 bg-blue-500/5' : tier === 'PREMIUM' ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-800 bg-zinc-950'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 font-black text-lg">{plan.name} {tier !== 'BASIC' && <Verified gold={tier === 'PLUS'} size={16} />}</div>
                                        <div className="text-right"><div className="font-black">{formatMoney(plan.price)}</div><div className="text-[10px] text-zinc-500 uppercase">per 4 weeks</div></div>
                                    </div>
                                    {tier === 'PREMIUM' && <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-400">Most popular</div>}
                                    <ul className="mt-3 space-y-1 text-sm text-zinc-300">{plan.perks.map(p => <li key={p} className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> {p}</li>)}</ul>
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                                        <div className="rounded-xl bg-black border border-zinc-900 p-2"><div className="text-zinc-500 uppercase font-black">Reach</div><div className="text-white font-black">x{plan.reach.toFixed(2)}</div></div>
                                        <div className="rounded-xl bg-black border border-zinc-900 p-2"><div className="text-zinc-500 uppercase font-black">Chars</div><div className="text-white font-black">{formatNumber(plan.charLimit)}</div></div>
                                        <div className="rounded-xl bg-black border border-zinc-900 p-2"><div className="text-zinc-500 uppercase font-black">Rev share</div><div className="text-white font-black">{plan.revShare * 100}%</div></div>
                                    </div>
                                    {active ? (
                                        <button onClick={cancelPremium} className="mt-4 w-full rounded-full border border-zinc-700 py-2.5 text-sm font-bold text-zinc-300">Cancel subscription</button>
                                    ) : (
                                        <button onClick={() => buyPremium(tier)} disabled={money < plan.price} className="mt-4 w-full rounded-full bg-white py-2.5 text-sm font-black text-black disabled:opacity-40">{premiumActive === 'NONE' ? 'Subscribe' : 'Switch plan'}</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* BOOKMARKS */}
            {view === 'BOOKMARKS' && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <SubHeader title="Bookmarks" subtitle={`${bookmarkedPosts.length} saved`} onBack={closeSubView} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                        {bookmarkedPosts.length === 0 ? (
                            <div className="p-10 text-center"><Bookmark size={40} className="mx-auto text-zinc-700" /><div className="mt-4 font-black text-xl">Save posts for later</div><div className="mt-1 text-sm text-zinc-500">Bookmark posts to easily find them again.</div></div>
                        ) : bookmarkedPosts.map(p => <TweetCard key={p.id} post={p} />)}
                    </div>
                </div>
            )}

            {/* LISTS */}
            {view === 'LISTS' && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <SubHeader title="Lists" subtitle="Curated timelines" onBack={closeSubView} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                        {[
                            { name: 'Directors I follow', filter: (n: NPCActor) => n.occupation === 'DIRECTOR' },
                            { name: 'A-List', filter: (n: NPCActor) => n.tier === 'A_LIST' },
                            { name: 'Following', filter: (n: NPCActor) => !!npcStates[n.id]?.isFollowing },
                            { name: 'Everyone else', filter: () => true }
                        ].map(list => {
                            const members = npcPool.filter(list.filter);
                            return (
                                <div key={list.name} className="border-b border-zinc-800 p-4">
                                    <div className="flex items-center justify-between"><div className="font-black">{list.name}</div><div className="text-xs text-zinc-500">{members.length} members</div></div>
                                    <div className="mt-3 flex -space-x-2">{members.slice(0, 6).map(m => <img key={m.id} src={m.avatar} onClick={() => { closeSubView(); handleProfileClick(m.id); }} className="w-8 h-8 rounded-full border-2 border-black object-cover" />)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* COMMUNITIES */}
            {view === 'COMMUNITIES' && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <SubHeader title="Communities" subtitle={`${extras.communities.length} joined`} onBack={closeSubView} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                        {COMMUNITIES.map(c => {
                            const joined = extras.communities.includes(c.id);
                            return (
                                <div key={c.id} className="flex items-center gap-3 border-b border-zinc-800 p-4">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-2xl">{c.emoji}</div>
                                    <div className="flex-1 min-w-0"><div className="font-black">{c.name}</div><div className="text-xs text-zinc-500">{formatNumber(c.members)} members · x{c.reach.toFixed(2)} reach</div></div>
                                    <button onClick={() => toggleCommunity(c.id)} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${joined ? 'border-zinc-600 text-white' : 'bg-white text-black border-white'}`}>{joined ? 'Joined' : 'Join'}</button>
                                </div>
                            );
                        })}
                        <div className="p-4 text-xs text-zinc-500">Posting into a joined community boosts reach and follower conversion for that post.</div>
                    </div>
                </div>
            )}

            {/* MONETIZATION */}
            {view === 'MONETIZATION' && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <SubHeader title="Monetization" subtitle="Creator revenue" onBack={closeSubView} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-3">
                        <div className="rounded-[1.75rem] border border-zinc-800 bg-gradient-to-br from-emerald-950/40 to-black p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Available balance</div>
                            <div className="mt-1 text-3xl font-black">{formatMoney(extras.adBalance)}</div>
                            <div className="text-xs text-zinc-500 mt-1">Lifetime: {formatMoney(extras.adLifetime)}</div>
                            <button onClick={payout} disabled={extras.adBalance < 10} className="mt-4 w-full rounded-full bg-emerald-500 py-2.5 text-sm font-black text-black disabled:opacity-40">Pay out to wallet</button>
                        </div>
                        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
                            <div className="font-black">Eligibility</div>
                            <div className="mt-3 space-y-2 text-sm">
                                {[
                                    { label: 'Premium or Premium+ subscription', ok: premiumActive === 'PREMIUM' || premiumActive === 'PLUS' },
                                    { label: '500+ followers', ok: player.x.followers >= 500 },
                                    { label: 'Posted in the last 4 weeks', ok: player.x.posts.length > 0 }
                                ].map(r => <div key={r.label} className="flex items-center gap-2">{r.ok ? <Check size={16} className="text-emerald-400" /> : <X size={16} className="text-red-400" />}<span className={r.ok ? 'text-zinc-200' : 'text-zinc-500'}>{r.label}</span></div>)}
                            </div>
                            {premiumActive !== 'PREMIUM' && premiumActive !== 'PLUS' && <button onClick={() => setView('PREMIUM')} className="mt-4 w-full rounded-full border border-zinc-700 py-2 text-sm font-bold">Get Premium</button>}
                        </div>
                        <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
                            <div className="font-black">How it works</div>
                            <div className="mt-2 text-sm text-zinc-400 leading-relaxed">You earn roughly $1.50 per 1,000 verified impressions, scaled by your plan's revenue share. Hot takes get views, but heat also costs reputation. Spaces hosted: {extras.spacesHosted}.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT PROFILE */}
            {view === 'EDIT_PROFILE' && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-bottom duration-200">
                    <SubHeader title="Edit profile" onBack={closeSubView} right={<button onClick={() => { patchExtras(profileDraft); closeSubView(); showToast('Profile saved'); }} className="rounded-full bg-white px-4 py-1.5 text-sm font-black text-black">Save</button>} />
                    <div className="p-4 space-y-4">
                        {([['bio', 'Bio'], ['location', 'Location'], ['link', 'Website']] as const).map(([key, label]) => (
                            <div key={key}>
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
                                <input value={profileDraft[key]} onChange={e => setProfileDraft({ ...profileDraft, [key]: e.target.value })} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CHAT (DM) */}
            {view === 'CHAT' && chatNpc && (
                <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-right duration-200">
                    <SubHeader title={chatNpc.name} subtitle={chatNpc.handle} onBack={() => { setView('MAIN'); setChatNpc(null); }} right={<img src={chatNpc.avatar} onClick={() => { closeSubView(); handleProfileClick(chatNpc.id); }} className="w-8 h-8 rounded-full object-cover" />} />
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                        {(extras.dms[chatNpc.id] || []).length === 0 && <div className="text-center text-xs text-zinc-500 py-10">Start a conversation. Costs 2 energy per message and builds relationship.</div>}
                        {(extras.dms[chatNpc.id] || []).map((m, i) => (
                            <div key={i} className={`flex ${m.from === 'ME' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${m.from === 'ME' ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'}`}>{m.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-zinc-800 p-3 pb-8 flex gap-2">
                        <input value={chatDraft} onChange={e => setChatDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendDM()} placeholder="Start a new message" className="flex-1 rounded-full bg-zinc-900 px-4 py-2.5 text-sm text-white focus:outline-none border border-zinc-800 focus:border-blue-500" />
                        <button onClick={sendDM} disabled={!chatDraft.trim() || player.energy.current < 2} className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center disabled:opacity-40"><Send size={18} /></button>
                    </div>
                </div>
            )}

            <aside className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-zinc-800 px-3 py-6">
                <div className="px-3 text-2xl font-black">𝕏</div>
                <nav className="mt-4 space-y-1">
                    {([
                        ['HOME', Home, 'Home'],
                        ['SEARCH', Search, 'Explore'],
                        ['SPACES', Mic, 'Spaces'],
                        ['NOTIFICATIONS', Bell, 'Notifications'],
                        ['MESSAGES', Mail, 'Messages'],
                        ['PROFILE', User, 'Profile'],
                    ] as const).map(([id, Icon, label]) => (
                        <button key={id} onClick={() => { setTab(id); if (id === 'PROFILE') setSelectedProfile(null); }} className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-left text-lg font-bold ${tab === id ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:bg-zinc-950'}`}>
                            <Icon size={24} strokeWidth={tab === id ? 2.6 : 2} /> {label}
                        </button>
                    ))}
                </nav>
                <button onClick={() => openComposer('GENERAL')} disabled={player.energy.current < 5} className="mx-2 mt-4 rounded-full bg-blue-500 py-3 text-sm font-black text-white disabled:opacity-40">Post</button>
                {player.energy.current < 5 && <div className="mx-3 mt-2 text-[11px] font-bold text-amber-300">Need 5 energy to post. You have {player.energy.current}.</div>}
                <button onClick={onBack} className="mt-auto flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-400 hover:text-white"><ArrowLeft size={16} /> Exit X</button>
            </aside>
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col lg:max-w-[680px] lg:border-r lg:border-zinc-800">

            {/* ================= HEADER ================= */}
            {tab === 'HOME' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-800">
                    <div className="flex justify-between items-center px-4 pt-10 pb-2">
                        <div onClick={() => setDrawerOpen(true)} className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 cursor-pointer"><img src={player.avatar} className="w-full h-full object-cover" /></div>
                        <div className="text-xl font-black">𝕏</div>
                        <div className="flex items-center gap-1">
                            {premiumActive === 'NONE' && <button onClick={() => setView('PREMIUM')} className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">Upgrade</button>}
                            <div onClick={onBack} className="p-2 -mr-2"><ArrowLeft size={20} /></div>
                        </div>
                    </div>
                    <div className="flex text-sm font-bold text-zinc-500">
                        <button onClick={() => setFeedTab('FOR_YOU')} className={`flex-1 py-3 text-center hover:bg-white/5 relative ${feedTab === 'FOR_YOU' ? 'text-white' : ''}`}>
                            {tr('x.forYou')}
                            {feedTab === 'FOR_YOU' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />}
                        </button>
                        <button onClick={() => setFeedTab('FOLLOWING')} className={`flex-1 py-3 text-center hover:bg-white/5 relative ${feedTab === 'FOLLOWING' ? 'text-white' : ''}`}>
                            {tr('x.following')}
                            {feedTab === 'FOLLOWING' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />}
                        </button>
                    </div>
                </div>
            ) : tab === 'SEARCH' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 pt-12 pb-3 border-b border-zinc-800 flex items-center gap-3">
                    <img src={player.avatar} onClick={() => setDrawerOpen(true)} className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={tr('x.search')} className="w-full bg-zinc-900 rounded-full py-2 pl-10 pr-9 text-sm text-white focus:outline-none focus:bg-black border border-zinc-800 focus:border-blue-500 transition-colors" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"><X size={14} /></button>}
                    </div>
                </div>
            ) : tab === 'PROFILE' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 pt-12 pb-2 flex items-center gap-6 border-b border-zinc-800">
                    <button onClick={() => { if (selectedProfile) setSelectedProfile(null); setTab('HOME'); }} className="p-2 -ml-2 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>
                    <div>
                        <div className="font-bold text-lg leading-none flex items-center gap-1">{selectedProfile ? selectedProfile.name : player.name}</div>
                        <div className="text-xs text-zinc-500">{selectedProfile ? '24' : player.x.posts.length} {tr('x.posts').toLowerCase()}</div>
                    </div>
                </div>
            ) : tab === 'SPACES' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 pt-12 pb-3 border-b border-zinc-800 flex items-center gap-3">
                    <img src={player.avatar} onClick={() => setDrawerOpen(true)} className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                    <div className="font-black text-lg">Spaces</div>
                    <div className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> {spaces.length} live</div>
                </div>
            ) : tab === 'MESSAGES' ? (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 pt-12 pb-3 border-b border-zinc-800 flex items-center gap-3">
                    <img src={player.avatar} onClick={() => setDrawerOpen(true)} className="w-8 h-8 rounded-full object-cover border border-zinc-700" />
                    <div className="font-black text-lg">Messages</div>
                </div>
            ) : (
                <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-800">
                    <div className="px-4 pt-12 pb-2 flex items-center gap-3"><img src={player.avatar} onClick={() => setDrawerOpen(true)} className="w-8 h-8 rounded-full object-cover border border-zinc-700" /><div className="font-black text-lg">{tr('x.notifications')}</div></div>
                    <div className="flex text-sm font-bold text-zinc-500">
                        {(['ALL', 'VERIFIED', 'MENTIONS'] as NotifFilter[]).map(f => (
                            <button key={f} onClick={() => setNotifFilter(f)} className={`flex-1 py-3 text-center relative ${notifFilter === f ? 'text-white' : ''}`}>
                                {f === 'ALL' ? 'All' : f === 'VERIFIED' ? 'Verified' : 'Mentions'}
                                {notifFilter === f && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ================= MAIN CONTENT ================= */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {/* HOME */}
                {tab === 'HOME' && (
                    <div className="pb-20">
                        {filteredFeed.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">
                                <div className="font-bold text-lg text-white mb-2">{tr('x.welcome')}</div>
                                <p>{tr('x.welcomeSub')}</p>
                                <button onClick={() => setTab('SEARCH')} className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-sm">{tr('x.letsGo')}</button>
                            </div>
                        ) : filteredFeed.map(post => <TweetCard key={post.id} post={post} />)}
                    </div>
                )}

                {/* SEARCH */}
                {tab === 'SEARCH' && (
                    <div className="pb-20">
                        {searchQuery.trim() ? (
                            <div>
                                <div className="p-4 border-b border-zinc-800">
                                    <h3 className="font-extrabold text-lg mb-3">People</h3>
                                    {searchPeople.length === 0 && <div className="text-sm text-zinc-500">No people found.</div>}
                                    <div className="space-y-3">
                                        {searchPeople.map(npc => (
                                            <div key={npc.id} onClick={() => handleProfileClick(npc.id)} className="flex items-center gap-3">
                                                <img src={npc.avatar} className="w-10 h-10 rounded-full object-cover" />
                                                <div className="flex-1 min-w-0"><div className="font-bold truncate flex items-center gap-1">{npc.name} {isNpcVerified(npc) && <Verified size={12} />}</div><div className="text-zinc-500 text-sm truncate">{npc.handle}</div></div>
                                                <button onClick={(e) => { e.stopPropagation(); handleFollowToggle(npc); }} className={`px-4 py-1.5 rounded-full text-sm font-bold border ${npcStates[npc.id]?.isFollowing ? 'border-zinc-600 text-white' : 'bg-white text-black border-white'}`}>{npcStates[npc.id]?.isFollowing ? tr('x.following') : tr('x.follow')}</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <h3 className="font-extrabold text-lg p-4 pb-2">Posts</h3>
                                {searchPosts.length === 0 && <div className="px-4 text-sm text-zinc-500">No posts match.</div>}
                                {searchPosts.map(p => <TweetCard key={p.id} post={p} compact />)}
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-zinc-800">
                                    <h3 className="font-extrabold text-lg mb-4">{tr('x.trendsForYou')}</h3>
                                    <div className="space-y-5">
                                        {trending.map((trend, i) => (
                                            <div key={i} onClick={() => setSearchQuery(trend.tag.replace('#', ''))} className="flex justify-between items-start cursor-pointer">
                                                <div>
                                                    <div className="text-xs text-zinc-500 font-bold">{i + 1} · {trend.category} · {tr('x.trending')}</div>
                                                    <div className="font-bold text-white text-base mt-0.5">{trend.tag}</div>
                                                    <div className="text-xs text-zinc-500 mt-0.5">{trend.posts}</div>
                                                </div>
                                                <MoreHorizontal size={16} className="text-zinc-600" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4 border-b border-zinc-800">
                                    <h3 className="font-extrabold text-lg mb-3">Communities</h3>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {COMMUNITIES.slice(0, 4).map(c => (
                                            <button key={c.id} onClick={() => setView('COMMUNITIES')} className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left"><div className="text-lg">{c.emoji}</div><div className="text-xs font-bold whitespace-nowrap">{c.name}</div><div className="text-[10px] text-zinc-500">{formatNumber(c.members)}</div></button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-extrabold text-lg mb-4">{tr('x.whoToFollow')}</h3>
                                    <div className="space-y-4">
                                        {npcPool.slice(0, 5).map(npc => {
                                            const isFollowing = npcStates[npc.id]?.isFollowing;
                                            return (
                                                <div key={npc.id} onClick={() => handleProfileClick(npc.id)} className="flex items-center gap-3">
                                                    <img src={npc.avatar} className="w-10 h-10 rounded-full object-cover" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-white truncate flex items-center gap-1">{npc.name} {isNpcVerified(npc) && <Verified size={12} />}</div>
                                                        <div className="text-zinc-500 text-sm truncate">{npc.handle}</div>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleFollowToggle(npc); }} className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${isFollowing ? 'bg-transparent border-zinc-600 text-white' : 'bg-white text-black border-white'}`}>{isFollowing ? tr('x.following') : tr('x.follow')}</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* SPACES */}
                {tab === 'SPACES' && (
                    <div className="pb-20">
                        <div className="p-4">
                            <div className="rounded-[1.75rem] border border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-black p-5">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300"><Radio size={12} /> Host a Space</div>
                                <div className="mt-2 text-xl font-black">Go live with your audience</div>
                                <div className="mt-1 text-sm text-zinc-400">Listeners scale with followers and fame. Costs 10 energy. +1 reputation.</div>
                                <button onClick={hostSpace} disabled={player.energy.current < 10} className="mt-4 w-full rounded-full bg-purple-500 py-3 text-sm font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"><Mic size={16} /> Start your Space</button>
                                {liveSpaceId === 'mine' && <div className="mt-3 text-xs text-purple-300 font-bold">Your Space just ended. Check your follower count.</div>}
                            </div>
                        </div>
                        <div className="px-4 pb-2 text-xs font-black uppercase tracking-widest text-zinc-500">Happening now</div>
                        {spaces.map(space => (
                            <div key={space.id} className="mx-4 mb-3 rounded-[1.5rem] border border-zinc-800 bg-zinc-950 p-4">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Live · {formatNumber(space.listeners)} listening</div>
                                <div className="mt-2 font-black text-base leading-snug">{space.topic}</div>
                                <div className="mt-3 flex items-center gap-2">
                                    <img src={space.host.avatar} onClick={() => handleProfileClick(space.host.id)} className="w-8 h-8 rounded-full object-cover" />
                                    <div className="text-sm"><span className="font-bold">{space.host.name}</span> <span className="text-zinc-500">Host</span></div>
                                    <button onClick={() => joinSpace(space.id, space.host)} disabled={player.energy.current < 3} className={`ml-auto rounded-full px-4 py-1.5 text-sm font-black ${liveSpaceId === space.id ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-black'} disabled:opacity-40`}>{liveSpaceId === space.id ? 'Joined' : 'Join'}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MESSAGES */}
                {tab === 'MESSAGES' && (
                    <div className="pb-20">
                        {[...npcPool].sort((a, b) => ((extras.dms[b.id]?.length || 0) + (npcStates[b.id]?.isFollowing ? 1 : 0)) - ((extras.dms[a.id]?.length || 0) + (npcStates[a.id]?.isFollowing ? 1 : 0))).slice(0, 10).map(npc => {
                            const history = extras.dms[npc.id] || [];
                            const last = history[history.length - 1];
                            return (
                                <button key={npc.id} onClick={() => openChat(npc)} className="w-full flex items-center gap-3 border-b border-zinc-900 p-4 text-left hover:bg-zinc-950">
                                    <img src={npc.avatar} className="w-12 h-12 rounded-full object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 font-bold">{npc.name} {isNpcVerified(npc) && <Verified size={12} />}<span className="text-zinc-500 font-normal text-sm truncate">{npc.handle}</span></div>
                                        <div className="text-sm text-zinc-500 truncate">{last ? `${last.from === 'ME' ? 'You: ' : ''}${last.text}` : npcStates[npc.id]?.isFollowing ? 'You follow each other' : 'Message request'}</div>
                                    </div>
                                    <ChevronRight size={16} className="text-zinc-600" />
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* PROFILE */}
                {tab === 'PROFILE' && (
                    <div className="pb-20">
                        <div className="h-32 bg-zinc-800 relative"><div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-zinc-900 opacity-50" /></div>
                        <div className="px-4 relative mb-4">
                            <div className="w-20 h-20 rounded-full border-4 border-black absolute -top-10 bg-black overflow-hidden"><img src={selectedProfile ? selectedProfile.avatar : player.avatar} className="w-full h-full object-cover" /></div>
                            <div className="flex justify-end py-3">
                                {selectedProfile ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => openChat(selectedProfile)} className="w-9 h-9 rounded-full border border-zinc-600 flex items-center justify-center text-white"><Mail size={16} /></button>
                                        <button onClick={() => handleFollowToggle(selectedProfile)} className={`px-5 py-1.5 rounded-full text-sm font-bold border ${npcStates[selectedProfile.id]?.isFollowing ? 'border-zinc-600 text-white' : 'bg-white text-black border-white'}`}>{npcStates[selectedProfile.id]?.isFollowing ? tr('x.following') : tr('x.follow')}</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {premiumActive === 'NONE' && <button onClick={() => setView('PREMIUM')} className="px-3 py-1.5 rounded-full text-sm font-bold bg-white text-black flex items-center gap-1"><Crown size={14} /> Get verified</button>}
                                        <button onClick={() => { setProfileDraft({ bio: shownBio, location: shownLocation, link: extras.link }); setView('EDIT_PROFILE'); }} className="px-4 py-1.5 rounded-full text-sm font-bold border border-zinc-600 text-white">{tr('x.editProfile')}</button>
                                    </div>
                                )}
                            </div>
                            <div className="mt-1">
                                <div className="font-black text-xl text-white flex items-center gap-1">
                                    {selectedProfile ? selectedProfile.name : player.name}
                                    {((!selectedProfile && isPlayerVerified) || (selectedProfile && isNpcVerified(selectedProfile))) && <Verified size={18} gold={!selectedProfile && premiumActive === 'PLUS'} />}
                                </div>
                                <div className="text-zinc-500 text-sm mb-3">{selectedProfile ? selectedProfile.handle : player.x.handle}</div>
                                <div className="text-sm text-white mb-3">{selectedProfile ? selectedProfile.bio : shownBio}</div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-zinc-500 text-sm mb-3">
                                    <div className="flex items-center gap-1"><MapPin size={14} /> {selectedProfile ? cityLabel : shownLocation}</div>
                                    <div className="flex items-center gap-1"><LinkIcon size={14} /> <span className="text-blue-400">{selectedProfile ? 'imdb.com/name' : extras.link}</span></div>
                                    <div className="flex items-center gap-1"><Calendar size={14} /> {tr('x.joined')} {selectedProfile ? 'March 2018' : 'September 2024'}</div>
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <div><span className="font-bold text-white">{selectedProfile ? '450' : '12'}</span> <span className="text-zinc-500">{tr('x.following')}</span></div>
                                    <div><span className="font-bold text-white">{formatNumber(selectedProfile ? selectedProfile.followers : (player.x.followers || 0))}</span> <span className="text-zinc-500">{tr('x.followers')}</span></div>
                                </div>
                                {!selectedProfile && premiumActive !== 'NONE' && <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300"><Crown size={11} /> {PREMIUM_PLANS[premiumActive].name} subscriber</div>}
                            </div>
                        </div>

                        <div className="flex border-b border-zinc-800 mt-2 font-bold text-sm text-zinc-500">
                            {([['POSTS', tr('x.posts')], ['REPLIES', tr('x.replies')], ['MEDIA', tr('x.media')], ['LIKES', tr('x.likes')]] as [ProfileTab, string][]).map(([id, label]) => (
                                <button key={id} onClick={() => setProfileTab(id)} className={`flex-1 py-3 relative ${profileTab === id ? 'text-white' : 'hover:bg-white/5'}`}>
                                    {label}
                                    {profileTab === id && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-500 rounded-full" />}
                                </button>
                            ))}
                        </div>

                        {profileTab === 'MEDIA' && profileTabPosts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-0.5 p-0.5">
                                {profileTabPosts.map(p => <div key={p.id} onClick={() => openPostDetail(p)} className={`aspect-square bg-gradient-to-br ${p.mediaColor}`} />)}
                            </div>
                        ) : profileTabPosts.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">{profileTab === 'POSTS' ? tr('x.noPostsYet') : 'Nothing here yet.'}</div>
                        ) : profileTabPosts.map(p => <TweetCard key={p.id} post={p} />)}
                    </div>
                )}

                {/* NOTIFICATIONS */}
                {tab === 'NOTIFICATIONS' && (
                    <div className="divide-y divide-zinc-800 pb-20">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">{tr('x.noNotifications')}</div>
                        ) : notifications.map(n => (
                            <button key={n.id} onClick={() => n.post ? openPostDetail(n.post) : n.kind === 'FOLLOW' ? handleProfileClick(n.npc.id) : setView('PREMIUM')} className="w-full p-4 flex gap-3 hover:bg-zinc-900 text-left">
                                {n.kind === 'LIKE' ? <Heart size={22} className="text-pink-500 fill-pink-500 shrink-0" /> : n.kind === 'REPOST' ? <Repeat size={22} className="text-green-500 shrink-0" /> : n.kind === 'REPLY' ? <MessageCircle size={22} className="text-blue-400 shrink-0" /> : n.kind === 'MENTION' ? <AtSign size={22} className="text-blue-400 shrink-0" /> : n.kind === 'FOLLOW' ? <UserPlus size={22} className="text-blue-400 shrink-0" /> : <Star size={22} className="text-purple-500 fill-purple-500 shrink-0" />}
                                <div className="min-w-0 flex-1">
                                    {n.kind !== 'SYSTEM' && <div className="mb-1"><img src={n.npc.avatar} className="w-8 h-8 rounded-full object-cover" /></div>}
                                    <div className="text-sm text-zinc-300">{n.kind === 'SYSTEM' ? <span className="font-bold text-white">X</span> : <span className="font-bold text-white inline-flex items-center gap-1">{n.npc.name} {isNpcVerified(n.npc) && <Verified size={12} />}</span>} {n.text}</div>
                                    {n.post && <div className="truncate text-zinc-500 text-sm mt-1">"{n.post.content}"</div>}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB */}
            {(tab === 'HOME' || tab === 'SEARCH' || tab === 'PROFILE') && (
                <button onClick={() => openComposer('GENERAL')} className="absolute bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-900/20 transition-transform active:scale-90 lg:hidden">
                    <Plus size={26} className="text-white" />
                </button>
            )}
            {tab === 'MESSAGES' && (
                <button onClick={() => openChat(npcPool[0])} className="absolute bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-lg lg:hidden"><Mail size={22} /></button>
            )}

            {/* BOTTOM NAV */}
            <div className="z-30 flex h-14 shrink-0 items-center justify-around border-t border-zinc-800 bg-black px-1 pb-2 lg:hidden">
                <NavButton id="HOME" icon={Home} />
                <NavButton id="SEARCH" icon={Search} />
                <NavButton id="SPACES" icon={Mic} />
                <NavButton id="NOTIFICATIONS" icon={Bell} badge={Math.min(9, notifications.length)} />
                <NavButton id="MESSAGES" icon={Mail} />
            </div>
            </div>
            <aside className="hidden w-[320px] shrink-0 overflow-y-auto px-4 py-6 lg:block">
                <div className="rounded-2xl bg-zinc-950 p-4">
                    <div className="mb-3 text-lg font-black">What&apos;s happening</div>
                    <div className="mb-3 text-xs font-bold text-zinc-500">{cityLabel} · {gameCalendarYear(player.age)}</div>
                    {trending.map(trend => (
                        <button key={trend.tag} onClick={() => { setSearchQuery(trend.tag); setTab('SEARCH'); }} className="block w-full border-b border-zinc-900 py-3 text-left last:border-0 hover:bg-white/5">
                            <div className="text-[11px] font-bold text-zinc-500">{trend.category}</div>
                            <div className="font-bold">{trend.tag}</div>
                            <div className="text-xs text-zinc-500">{trend.posts}</div>
                        </button>
                    ))}
                </div>
            </aside>

            {/* ================= COMPOSE ================= */}
            {composeOpen && (
                <div className="absolute inset-0 bg-black z-50 flex flex-col animate-in slide-in-from-bottom duration-200">
                    <div className="px-4 pt-12 pb-3 border-b border-zinc-900 flex items-center justify-between bg-black/95 shrink-0">
                        <button onClick={resetComposer} className="rounded-full bg-zinc-950 border border-zinc-800 px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-300 active:scale-95">{tr('x.cancel')}</button>
                        <div className="text-center">
                            <div className="font-black text-lg leading-tight">{editingPostId ? 'Edit post' : tr('x.studio')}</div>
                            <div className="text-[9px] text-blue-400 font-black uppercase tracking-[0.25em]">{editingPostId ? 'Premium' : tr('x.createPost')}</div>
                        </div>
                        <div className="flex flex-col items-end">
                            <button onClick={handlePost} disabled={!tweetContent.trim() || tweetContent.length > charLimit || !canAffordPost} className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-black disabled:opacity-40">{editingPostId ? 'Save' : 'Post'}</button>
                            {!editingPostId && player.energy.current < postEnergyCost && (
                                <div className="mt-1 max-w-[140px] text-right text-[10px] font-bold leading-tight text-amber-300">Need {postEnergyCost} energy. You have {player.energy.current}.</div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-36">
                        <div className="p-4 space-y-4">
                            <div className="rounded-[1.75rem] border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-4 shadow-2xl">
                                <div className="flex gap-3">
                                    <img src={player.avatar} className="w-11 h-11 rounded-full object-cover border border-zinc-800 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <div className="font-black text-white truncate">{player.name}</div>
                                            {isPlayerVerified && <Verified gold={premiumActive === 'PLUS'} />}
                                            <div className="text-zinc-500 text-sm truncate">{player.x.handle}</div>
                                        </div>
                                        {composeCommunity && <div className="text-[11px] font-bold text-zinc-500 mt-0.5">{COMMUNITIES.find(c => c.id === composeCommunity)?.emoji} {COMMUNITIES.find(c => c.id === composeCommunity)?.name}</div>}
                                        <textarea
                                            value={tweetContent}
                                            onChange={(e) => setTweetContent(e.target.value)}
                                            placeholder={activeComposeConfig.placeholder}
                                            className="mt-2 w-full bg-transparent text-[17px] text-white placeholder:text-zinc-600 resize-none focus:outline-none min-h-[96px] leading-relaxed"
                                            autoFocus
                                        />
                                        {threadParts.map((part, i) => (
                                            <div key={i} className="mt-2 border-l-2 border-zinc-800 pl-3 flex gap-2">
                                                <textarea value={part} onChange={e => setThreadParts(threadParts.map((p, j) => (j === i ? e.target.value : p)))} placeholder={`Add another post (${i + 2}/)`} className="flex-1 bg-transparent text-[15px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none min-h-[60px]" />
                                                <button onClick={() => setThreadParts(threadParts.filter((_, j) => j !== i))} className="text-zinc-600 self-start"><X size={14} /></button>
                                            </div>
                                        ))}
                                        {pollEnabled && (
                                            <div className="mt-3 rounded-2xl border border-zinc-800 p-3 space-y-2">
                                                {pollOptions.map((opt, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input value={opt} onChange={e => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))} placeholder={`Choice ${i + 1}${i > 1 ? ' (optional)' : ''}`} maxLength={25} className="flex-1 rounded-xl border border-zinc-800 bg-black px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
                                                        {i > 1 && <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-zinc-600"><X size={14} /></button>}
                                                    </div>
                                                ))}
                                                <div className="flex justify-between items-center">
                                                    {pollOptions.length < 4 ? <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs font-bold text-blue-400">+ Add choice</button> : <span />}
                                                    <button onClick={() => { setPollEnabled(false); setPollOptions(['', '']); }} className="text-xs font-bold text-red-400">Remove poll</button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="flex gap-1 text-blue-400">
                                                {!editingPostId && <button onClick={() => setPollEnabled(true)} disabled={pollEnabled} className="p-2 rounded-full hover:bg-blue-500/10 disabled:opacity-40" title="Poll"><BarChart2 size={18} /></button>}
                                                {!editingPostId && <button onClick={() => setThreadParts([...threadParts, ''])} disabled={threadParts.length >= 4} className="p-2 rounded-full hover:bg-blue-500/10 disabled:opacity-40" title="Add to thread"><Plus size={18} /></button>}
                                                {!editingPostId && <button onClick={() => setComposeCommunity(composeCommunity ? null : (extras.communities[0] || null))} disabled={extras.communities.length === 0} className={`p-2 rounded-full hover:bg-blue-500/10 disabled:opacity-40 ${composeCommunity ? 'text-white' : ''}`} title="Community"><Hash size={18} /></button>}
                                            </div>
                                            <div className={`text-xs font-mono ${tweetContent.length > charLimit ? 'text-red-400' : tweetContent.length > charLimit * 0.9 ? 'text-amber-400' : 'text-zinc-500'}`}>{tweetContent.length}/{charLimit}</div>
                                        </div>
                                        {tweetContent.length > 280 && premiumActive === 'NONE' && <div className="mt-2 text-[11px] text-amber-400 font-bold">Posts over 280 characters need <button onClick={() => { setComposeOpen(false); setView('PREMIUM'); }} className="underline">Premium</button>.</div>}
                                    </div>
                                </div>
                            </div>

                            {!editingPostId && extras.communities.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    <button onClick={() => setComposeCommunity(null)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${!composeCommunity ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400'}`}>Everyone</button>
                                    {extras.communities.map(id => { const c = COMMUNITIES.find(x => x.id === id)!; return <button key={id} onClick={() => setComposeCommunity(id)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${composeCommunity === id ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-400'}`}>{c.emoji} {c.name}</button>; })}
                                </div>
                            )}

                            {!editingPostId && (
                                <>
                                    <div className="space-y-3">
                                        <div className="px-1">
                                            <div className="text-xs font-black text-zinc-400 uppercase tracking-[0.22em]">{tr('x.publicVoice')}</div>
                                            <div className="text-[11px] text-zinc-600 mt-1">{tr('x.chooseTone')}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(Object.keys(X_POST_TYPES) as XPostType[]).filter(type => type !== 'DRAMA_REPLY').map(type => {
                                                const config = X_POST_TYPES[type];
                                                const Icon = config.icon;
                                                const isSelected = composeType === type;
                                                return (
                                                    <button key={type} onClick={() => setComposeType(type)} className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${isSelected ? 'bg-white text-black border-white shadow-[0_0_28px_rgba(255,255,255,0.08)]' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900'}`}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-black text-white' : 'bg-black border border-zinc-800 text-blue-300'}`}><Icon size={15} /></div>
                                                            <div className="min-w-0">
                                                                <div className="font-black text-xs uppercase tracking-wide truncate">{config.label}</div>
                                                                <div className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-zinc-500' : 'text-zinc-600'}`}>x{config.reach.toFixed(1)} reach</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="rounded-[1.5rem] border border-zinc-800 bg-gradient-to-br from-zinc-950 to-black p-4">
                                        <div className="text-sm font-black text-white">{tr('x.timelineForecast')}</div>
                                        <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                            X is volatile. Small accounts can still get discovered, but heat can spill into reputation and future events.
                                            {pollEnabled && ' Polls boost replies and reach.'}{threadParts.length > 0 && ' Threads cost extra energy but reach further.'}
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-4">
                                            {composeImpact.map(item => (
                                                <div key={item.label} className="rounded-2xl bg-black border border-zinc-900 p-2">
                                                    <div className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">{item.label}</div>
                                                    <div className={`text-xs font-black mt-1 ${item.color}`}>{item.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent px-4 pt-10 pb-8">
                        <button onClick={handlePost} disabled={!tweetContent.trim() || tweetContent.length > charLimit || !canAffordPost} className="pointer-events-auto w-full rounded-[1.4rem] bg-gradient-to-r from-blue-600 to-sky-400 py-4 text-white font-black tracking-wide shadow-[0_18px_45px_rgba(37,99,235,0.28)] disabled:opacity-50 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 active:scale-[0.99] transition-transform">
                            {editingPostId ? 'Save edit' : threadParts.length > 0 ? `Post thread (${threadParts.length + 1})` : tr('x.postToX')}
                        </button>
                        {!editingPostId && player.energy.current < postEnergyCost && (
                            <div className="pointer-events-none mt-2 text-center text-[11px] font-bold text-amber-300">Need {postEnergyCost} energy to post. You have {player.energy.current}.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};