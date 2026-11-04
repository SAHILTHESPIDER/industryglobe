import React, { useEffect, useMemo, useState } from 'react';
import { YoutubeCreatorIdentity, YoutubeMerchTier, YoutubeUploadPlan, YoutubeVideo, YoutubeVideoType } from '../../../types';
import { saveMediaBlob } from '../../../services/mediaStorage';
import { aiContent, aiOffline } from '../../../src/services/aiContent';
import { hashString, liveCreators, PUBLIC_CREATORS, reactionTitle, streamers } from '../../../services/youtubeCreators';
import { calculateYoutubeCreatorScore, getYoutubePublicImageLabel, YOUTUBE_MONETIZATION_SUBS } from '../../../services/youtubeLogic';
import { COUNTRY_CPM, yppProgress, YPP_WATCH_HOURS } from '../../../services/youtubePartner';
import { dropOutlook } from '../../../services/youtubeConsequences';
import {
    carry, ctrFor, dropCost, dropEnergy, ensureCampaign, forecastOpeningGross, forecastYtLift, isMarketingType,
    MARKETING_TYPES, musicOpeningBonus, openingMultiplier, PERSONAL_TYPES, readPhase,
    trailerWarShare, typeLabel,
} from '../../../services/youtubeMarketing';
import { findRivalChannel, personalityLabel } from '../../../services/youtubeRivals';
import { AnalyticsScreen } from './AnalyticsScreen';
import {
    changeIdentity, completeBrand, completeCollab, dropMerch, enableMemberships, goLive, identityTuning, setChannel,
    MERCH, PERSONAL_COSTS, personalCollab, publishUpload, raidStreamer, reactToVideo, resolveLeak,
    strikeCount, toggleSave, toggleSubscription, UPLOAD_PLANS,
} from './actions';
import { Av, formatCompact, formatMoney, Gauge, Spark, Thumb } from './bits';
import { useYt } from './state';
import { badgeFor, creatorFor, dubLine, postedAgo, STILL, stillForType, stillUrl, verifiedAuthor, weeksAgoFor } from './stills';
import { createFittedThumbnailBlob, Face, MAX_THUMBNAIL_SOURCE_SIZE, ThumbnailFitMode } from './thumb';

const MUSIC_TYPES: YoutubeVideoType[] = ['MUSIC_VIDEO', 'JUKEBOX', 'LYRIC_VIDEO'];
const LIVE_TYPES: YoutubeVideoType[] = ['PREMIERE_LIVE'];
const PROJECT_TYPES = MARKETING_TYPES.filter(type => !MUSIC_TYPES.includes(type) && !LIVE_TYPES.includes(type));
const IDENTITIES: YoutubeCreatorIdentity[] = ['ACTOR_VLOGGER', 'CHAOS_CREATOR', 'PRESTIGE_FILMMAKER', 'LIFESTYLE_ICON', 'CONTROVERSY_MAGNET'];
const PLANS: YoutubeUploadPlan[] = ['SAFE', 'VIRAL_BAIT', 'BTS', 'PROJECT_PROMO', 'SPONSOR_HEAVY'];
const LANGS = ['Hindi', 'English', 'Tamil', 'Telugu', 'Spanish', 'Arabic'];

const authorKind = (video: YoutubeVideo): 'me' | 'studio' | 'eplus' | 'letter' => {
    if (video.rivalChannelId) return 'letter';
    if (video.channelKind === 'empirePlus') return 'eplus';
    if (video.channelKind === 'studio') return 'studio';
    if (video.isPlayer) return 'me';
    return 'letter';
};

const ownedVideo = (video: YoutubeVideo) => !!(video.isPlayer || video.channelKind === 'studio' || video.channelKind === 'empirePlus');

const Card: React.FC<{ video: YoutubeVideo; onOpen: (id: string) => void; age: number; week: number }> = ({ video, onOpen, age, week }) => {
    const scheduled = video.weekUploaded > week && (video.yearUploaded || age) >= age;
    const ago = postedAgo(weeksAgoFor(video, age, week), /TRAILER|PREMIERE/.test(video.type));
    const meta = scheduled ? `Scheduled · ${formatCompact(video.views)} waiting` : `${formatCompact(video.views)} views · ${ago}`;
    const big = /TEASER|TRAILER|MUSIC|POSTER|JUKEBOX|LYRIC/.test(video.type) ? video.title.split(/[–|]/)[0].trim() : undefined;
    return (
        <button type="button" className="vc" onClick={() => onOpen(video.id)} data-yt-video={video.id}>
            <Face video={video} big={big} sub={big ? badgeFor(video).label : undefined} />
            <div className="vmeta">
                <Av kind={authorKind(video)} label={video.authorName} size={34} />
                <div style={{ minWidth: 0 }}>
                    <div className="t">{video.title}</div>
                    <div className="s">{video.authorName}{verifiedAuthor(video) ? <span className="vf">✓</span> : null}</div>
                    <div className="s">{meta}</div>
                </div>
            </div>
        </button>
    );
};

const projectTitle = (api: ReturnType<typeof useYt>, id?: string) =>
    api.projects.find(item => item.id === id)?.projectDetails?.title || api.projects[0]?.projectDetails?.title || '';

const CHIPS = ['All', 'Your projects', 'Trailers', 'Music', 'Interviews', 'Shorts', 'Live', 'Bollywood', 'Hollywood', 'K-Drama', 'Vlogs', 'Gaming', 'Podcasts'];

const matchesChip = (video: YoutubeVideo, chip: string) => {
    const creator = creatorFor(video.authorName);
    if (chip === 'Your projects') return !video.rivalChannelId && ownedVideo(video);
    if (chip === 'Trailers') return /TRAILER|TEASER|POSTER/.test(video.type);
    if (chip === 'Music') return MUSIC_TYPES.includes(video.type) || video.type === 'COVER';
    if (chip === 'Interviews') return video.type === 'CAST_INTERVIEW' || video.type === 'Q_AND_A';
    if (chip === 'Shorts') return !!(video.isShort || video.type === 'SHORT');
    if (chip === 'Live') return video.type === 'PREMIERE_LIVE';
    if (chip === 'Bollywood') return video.isPlayer || creator?.country === 'India' || /India|Bollywood/i.test(video.authorName);
    if (chip === 'Hollywood') return creator?.country === 'United States' || /Warner|Aurora|Hollywood|Pictures/i.test(video.authorName);
    if (chip === 'K-Drama') return creator?.country === 'South Korea' || creator?.country === 'Korea';
    if (chip === 'Vlogs') return video.type === 'VLOG' || video.type === 'STORYTIME';
    if (chip === 'Gaming') return creator?.category === 'STREAMER' || /game|raid|react/i.test(`${video.title} ${video.type}`);
    if (chip === 'Podcasts') return video.type === 'Q_AND_A';
    return true;
};

const releaseWeekNumber = (api: ReturnType<typeof useYt>, abs: number | null) => {
    if (abs == null) return null;
    let week = api.player.currentWeek + (abs - api.absWeek);
    while (week > 52) week -= 52;
    while (week < 1) week += 52;
    return week;
};

export const HomeScreen: React.FC = () => {
    const api = useYt();
    const [chip, setChip] = useState('All');
    const [booked, setBooked] = useState(false);
    const q = api.query.trim().toLowerCase();
    const pool = api.videos.filter(video => !q || `${video.title} ${video.authorName} ${video.language || ''} ${video.country || ''}`.toLowerCase().includes(q));
    const filtered = chip === 'All' ? pool : pool.filter(video => matchesChip(video, chip));
    const project = api.projects.find(item => item.id === api.projectId) || api.projects[0];
    const phase = project ? readPhase(api.player, project) : null;
    const campaign = project ? ensureCampaign(api.channel, project.id) : null;
    const weeks = phase?.releaseWeekAbs != null ? Math.max(0, phase.releaseWeekAbs - api.absWeek) : null;
    const releaseWeek = releaseWeekNumber(api, phase?.releaseWeekAbs ?? null);
    const done = campaign?.drops.filter(drop => drop.status === 'RELEASED').length || 0;
    const hero = filtered.find(video => ownedVideo(video) && video.type === 'TRAILER_2')
        || filtered.find(video => ownedVideo(video) && /TRAILER|TEASER/.test(video.type))
        || filtered.find(ownedVideo)
        || filtered[0]
        || pool[0];
    const rivals = pool.filter(video => video.rivalChannelId && video.id !== hero?.id && /TRAILER|TEASER|POSTER|ANNOUNCE|RELEASE_PROMO|STREAM_PREMIERE/.test(video.type)).sort((a, b) => b.views - a.views).slice(0, 2);
    const board = [hero, ...rivals].filter((video): video is YoutubeVideo => !!video).slice(0, 3);
    const owned = pool.filter(video => ownedVideo(video) && !video.rivalChannelId && !video.isShort && video.type !== 'SHORT' && video.id !== hero?.id);
    const pick = (type: YoutubeVideo['type']) => owned.find(video => video.type === type);
    const fromProjects = [pick('TEASER'), pick('MUSIC_VIDEO'), pick('CAST_INTERVIEW'), pick('BTS')].filter((video): video is YoutubeVideo => !!video);
    const projectCards = fromProjects.length ? fromProjects : owned.slice(0, 4);
    const shorts = pool.filter(video => video.isShort || video.type === 'SHORT').slice(0, 6);
    const used = new Set([hero?.id, ...projectCards.map(video => video.id), ...shorts.map(video => video.id)]);
    const recommended = [...pool]
        .filter(video => !used.has(video.id) && !video.isShort && video.type !== 'SHORT' && (chip === 'All' || matchesChip(video, chip)))
        .sort((a, b) => {
            const rank = (video: YoutubeVideo) => {
                if (video.channelKind === 'empirePlus') return 0;
                if (video.type === 'VLOG' && video.isPlayer) return 1;
                if (!video.projectId && /TRAILER/.test(video.type)) return 2;
                if (video.type === 'PREMIERE_LIVE' && (video.isPlayer || video.channelKind)) return 3;
                return 6;
            };
            return rank(a) - rank(b) || b.views - a.views;
        })
        .slice(0, 4);
    const heroRival = hero?.rivalChannelId ? findRivalChannel(api.channel, hero.rivalChannelId) : null;
    const title = heroRival ? hero.title : (project?.projectDetails?.title || hero?.title || 'Your channel');
    const tagline = project?.projectDetails?.customPoster?.tagline || project?.projectDetails?.genre || '';
    const role = project?.projectDetails?.castList?.find(member => member.isPlayer)?.roleName
        || project?.projectDetails?.castList?.find(member => member.isPlayer)?.characterName;
    const house = (api.player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE');
    const studioHandle = api.channel.officialChannels?.studio?.handle || '';
    const studioName = house?.name || (studioHandle ? `${studioHandle.replace('@', '').replace(/studios$/i, '').replace(/^./, char => char.toUpperCase())} Studios` : api.player.name);
    const hype = Math.round(campaign?.campaignHype ?? project?.projectDetails?.hiddenStats?.ytCampaignHype ?? hero?.hype ?? 0);
    const opening = forecastOpeningGross(project?.projectDetails?.estimatedBudget || 0, hype);
    const lift = forecastYtLift(hype, campaign?.songStreams || 0);
    const trendingRank = hero?.countryRanks?.IN || (hero && hero.views >= (pool[1]?.views || 0) ? 1 : 4);
    const premiere = hero ? weeksAgoFor(hero, api.player.age, api.player.currentWeek) <= 0 && /TRAILER|PREMIERE|TEASER/.test(hero.type) : false;
    const remixes = shorts.reduce((sum, video) => sum + Math.floor(video.views * 0.02), 0);

    return (
        <div>
            <div className="chips">
                {CHIPS.map(item => (
                    <button key={item} className={`chip${chip === item ? ' on' : ''}${item === 'Your projects' && chip !== item ? ' red' : ''}`} onClick={() => setChip(item)}>
                        {item === 'Your projects' ? '⚡ ' : ''}{item}
                    </button>
                ))}
            </div>
            {hero && (
                <div className="hero">
                    <div className="bill">
                        <div className="img" style={{ backgroundImage: `url(${stillUrl(hero)})` }} />
                        <div className="sh" />
                        <div className="stats">
                            <div className="glass"><span className="red">▲</span> #{trendingRank} Trending · India</div>
                            <div className="glass"><span className="mono">{formatCompact(hero.views)}</span> {premiere ? 'in 6 hrs' : postedAgo(weeksAgoFor(hero, api.player.age, api.player.currentWeek), true)}</div>
                        </div>
                        <div className="in">
                            <div className="row" style={{ flexWrap: 'wrap' }}>
                                <span className="pill red">▶ {typeLabel(hero.type).toUpperCase()}{premiere ? ' · WORLD PREMIERE' : ''}</span>
                                <span className="pill">{dubLine(hero.dubCount)}</span>
                            </div>
                            <div className="ttl">{title}{tagline ? <span>{tagline}</span> : null}</div>
                            <div className="m">{heroRival ? hero.authorName : studioName} <span className="vf">✓</span>{heroRival ? ` · ${formatCompact(heroRival.subscribers)} subs` : ''}{!heroRival && releaseWeek ? ` · In theaters Week ${releaseWeek}` : ''}{!heroRival && role ? ` · Your film as ${role}` : ''}</div>
                            <div className="acts">
                                <button className="btn white lg" onClick={() => api.openVideo(hero.id)}>▶ Watch trailer</button>
                                <button className="btn lg" onClick={() => api.go('hub')}>Marketing Hub</button>
                                <button className="btn lg ghost" onClick={() => setBooked(true)}>{booked ? 'Pre-booked' : 'Pre-book'}</button>
                            </div>
                        </div>
                    </div>
                    <div className="card pad radar">
                        <div className="between"><div className="h2">Release radar</div>{hype > 0 && <span className="pill amb">Hype {hype}</span>}</div>
                        <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>{title}{releaseWeek ? ` opens Week ${releaseWeek}` : ''} · theatrical in IN, AE, UK, US</div>
                        <div className="cd">
                            <div><b>{weeks == null ? '—' : String(weeks).padStart(2, '0')}</b><small>WEEKS</small></div>
                            <div><b>{done}</b><small>DROPS</small></div>
                            <div><b className="mint">{opening > 0 ? formatMoney(opening) : '—'}</b><small>OPENING</small></div>
                            <div><b className="amb">{lift >= 0 ? `+${lift}%` : `${lift}%`}</b><small>FROM YT</small></div>
                        </div>
                        <div className="lbl" style={{ margin: '14px 0 4px' }}>Competing trailers this week</div>
                        {board.map((video, index) => {
                            const delta = ({ vid_sherdil_t2: 2, rival_eclipse: -1, rival_kill: -1 } as Record<string, number>)[video.id]
                                ?? ((hashString(video.id) % 5) - 2);
                            return (
                                <button key={video.id} className="rr" onClick={() => api.openVideo(video.id)}>
                                    <span className="n">{index + 1}</span>
                                    <span className="mini" style={{ backgroundImage: `url(${stillUrl(video)})` }} />
                                    <span style={{ flex: 1, minWidth: 0 }}>
                                        <b style={{ fontSize: 12.5 }}>{video.title}</b>
                                        <span className="dim" style={{ display: 'block', fontSize: 11.5 }}>{video.authorName} · <span className="mono">{formatCompact(video.views)}</span></span>
                                    </span>
                                    <span className={delta >= 0 ? 'up' : 'dn'} style={{ fontSize: 11, fontWeight: 800 }}>{delta >= 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {pool.some(video => video.rivalChannelId) && (
                <section className="sect">
                    <div className="between"><div className="h2">From the houses</div><button className="btn sm" onClick={() => api.go('subs')}>All channels</button></div>
                    <div className="grid">
                        {pool.filter(video => video.rivalChannelId && !video.isShort).sort((a, b) => b.views - a.views).slice(0, 4).map(video => (
                            <Card key={video.id} video={video} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />
                        ))}
                    </div>
                </section>
            )}
            <section className="sect">
                <div className="between"><div className="h2">From your projects</div><button className="btn sm" onClick={() => api.go('hub')}>See all {done || projectCards.length} drops</button></div>
                <div className="g4">
                    {projectCards.map(video => <Card key={video.id} video={video} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />)}
                    {projectCards.length === 0 && <div className="card pad mu">The channel starts at 0 subscribers. Create a vlog or open the Marketing Hub once a film is greenlit.</div>}
                </div>
            </section>
            <section className="sect">
                <div className="between"><div className="h2">Shorts</div><span className="dim" style={{ fontSize: 12 }}>{remixes > 0 ? `#${(title || 'Film').replace(/\s/g, '')}Challenge · ${formatCompact(remixes)} remixes` : 'Open the Shorts desk'}</span></div>
                <div className="g6">
                    {shorts.map(video => (
                        <button key={video.id} className="shortc" onClick={() => api.openVideo(video.id)} style={{ backgroundImage: `url(${stillUrl(video)})` }}>
                            <div className="tt">{video.title}<small>{formatCompact(video.views)} views</small></div>
                        </button>
                    ))}
                </div>
            </section>
            <section className="sect">
                <div className="h2">Recommended</div>
                <div className="g4" style={{ marginTop: 12 }}>
                    {(chip === 'All' ? recommended : filtered.filter(video => video.id !== hero?.id).slice(0, 8)).map(video => (
                        <Card key={video.id} video={video} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />
                    ))}
                </div>
            </section>
        </div>
    );
};

export const WatchScreen: React.FC = () => {
    const api = useYt();
    const video = api.videos.find(item => item.id === api.watchId) || api.videos.find(item => item.type === 'TRAILER_2' && ownedVideo(item)) || api.videos.find(ownedVideo) || api.videos[0];
    const [filter, setFilter] = useState('All');
    const [comments, setComments] = useState<string[]>([]);
    const [playing, setPlaying] = useState(true);
    const reaction = (api.player.flags?.youtubeVideoReactions || {})[video?.id || ''] as string | undefined;
    const project = video && !video.rivalChannelId
        ? (video.projectId ? api.projects.find(item => item.id === video.projectId) : api.projects[0])
        : undefined;
    const campaign = project ? ensureCampaign(api.channel, project.id) : null;
    const hype = video?.hype ?? campaign?.campaignHype ?? 50;
    const sentiment = video?.sentiment || [62, 24, 14];
    const upNext = api.videos.filter(item => item.id !== video?.id && (filter === 'All' || (filter === 'Rivals' ? !!item.rivalChannelId || !item.isPlayer : !item.rivalChannelId && item.projectId === project?.id))).slice(0, 6);

    useEffect(() => {
        if (!video) return;
        const brief = {
            videoTitle: video.title,
            videoType: typeLabel(video.type),
            author: video.authorName,
            project: project?.projectDetails?.title,
            sentiment: (sentiment[2] > sentiment[0] ? 'negative' : sentiment[0] > 55 ? 'positive' : 'mixed') as 'positive' | 'mixed' | 'negative',
            seed: video.id,
            network: !!api.player.settings?.aiContentEnabled,
        };
        const local = video.comments?.length ? video.comments : aiOffline.generateComments(brief);
        setComments(local);
        let cancelled = false;
        if (brief.network) {
            aiContent.generateComments(brief).then(lines => { if (!cancelled && lines.length) setComments(lines); }).catch(() => undefined);
        }
        return () => { cancelled = true; };
    }, [video?.id, api.player.settings?.aiContentEnabled]);

    if (!video) return <div className="card pad">Nothing to watch yet.</div>;
    const watchingRival = video.rivalChannelId ? findRivalChannel(api.channel, video.rivalChannelId) : undefined;
    const subscribed = !!(watchingRival && (api.channel.subscriptions || []).includes(watchingRival.id));
    const subs = watchingRival
        ? watchingRival.subscribers
        : video.isPlayer || video.channelKind
            ? api.channel.subscribers
            : (creatorFor(video.authorName)?.followers || 0);
    const likes = video.likes + (reaction === 'LIKE' ? 1 : 0);
    const dislikes = Math.floor(video.views * 0.006) + (reaction === 'DISLIKE' ? 1 : 0);

    return (
        <div className="wgrid">
            <div>
                <button className="backfloat show-m" onClick={() => api.go('home')}>Back</button>
                <div className="player" onClick={() => setPlaying(value => !value)}>
                    <Face video={video} plain badge={playing ? 'PLAYING' : 'PAUSED'} />
                    <div className="shade" />
                    <div style={{ position: 'absolute', left: 16, right: 16, top: 14 }} className="between">
                        <span className="pill red">{typeLabel(video.type).toUpperCase()}</span>
                        <span className="pill">4K · {video.dubCount || 1} dub</span>
                    </div>
                    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
                        <div className="scrub"><div className="pl" style={{ width: playing ? '47%' : '12%' }} /><div className="knob" style={{ left: playing ? '47%' : '12%' }} /></div>
                        <div className="between" style={{ marginTop: 8 }}><span className="mono">{playing ? '1:12 / 2:34' : '0:18 / 2:34'}</span><span className="pill">{dubLine(video.dubCount)}</span></div>
                    </div>
                </div>
                <h1 className="h2" style={{ fontSize: 20, marginTop: 14, lineHeight: 1.3 }}>{video.title}</h1>
                <div className="between" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                    <div className="row">
                        <button type="button" className="row" onClick={() => { if (watchingRival) api.openRival(watchingRival.id); }} style={{ background: 'none' }}>
                        <Av kind={authorKind(video)} label={video.authorName} />
                        <div style={{ textAlign: 'left' }}><b>{video.authorName}</b>{verifiedAuthor(video) ? <span className="vf">✓</span> : null}<div className="dim">{formatCompact(subs)} subs{video.country ? ` · ${video.country}` : ''}</div></div>
                        </button>
                        {watchingRival ? (
                            <button className={`btn sm${subscribed ? '' : ' white'}`} onClick={() => api.apply(toggleSubscription(api.player, watchingRival.id))}>{subscribed ? 'Subscribed' : 'Subscribe'}</button>
                        ) : (video.isPlayer || video.channelKind) ? <span className="pill">Your channel</span> : null}
                    </div>
                    <div className="row">
                        <button className={`btn sm${reaction === 'LIKE' ? ' red' : ''}`} onClick={() => api.update(reactToVideo(api.player, video.id, 'LIKE'))}>▲ {formatCompact(likes)}</button>
                        <button className={`btn sm${reaction === 'DISLIKE' ? ' red' : ''}`} onClick={() => api.update(reactToVideo(api.player, video.id, 'DISLIKE'))}>▼ {formatCompact(dislikes)}</button>
                        <button className="btn sm" onClick={() => api.update(toggleSave(api.player, video.id))}>{(api.channel.savedVideoIds || []).includes(video.id) ? 'Saved' : 'Save'}</button>
                        <button className="btn sm" onClick={() => api.go('shorts')}>Clip</button>
                    </div>
                </div>
                <div className="card pad" style={{ marginTop: 14 }}>
                    <div className="mono dim">{formatCompact(video.views)} views · Week {video.weekUploaded}</div>
                    <p style={{ marginTop: 8 }}>{typeLabel(video.type)}{project ? ` · ${project.projectDetails?.title}` : ''}{video.dubCount ? ` · ${video.dubCount} dubs` : ''}. Pre-book opens with the release week.</p>
                    {campaign && (
                        <div className="mint" style={{ marginTop: 8 }}>Feeds {project?.projectDetails?.title}: opening {openingMultiplier(campaign.campaignHype).toFixed(2)}× · hype {Math.round(campaign.campaignHype)}</div>
                    )}
                </div>
                <div className="card pad" style={{ marginTop: 14 }}>
                    <div className="h2">Comments</div>
                    {comments.map((line, index) => (
                        <div key={`${line}-${index}`} className="row" style={{ alignItems: 'flex-start', marginTop: 12 }}>
                            <Av kind="letter" label={line} size={28} />
                            <div><b>viewer{index + 1}</b> <span className={`pill ${index % 3 === 2 ? 'red' : index % 3 === 1 ? 'amb' : 'mint'}`}>{index % 3 === 2 ? 'critical' : index % 3 === 1 ? 'mixed' : 'praise'}</span><div className="mu">{line}</div></div>
                        </div>
                    ))}
                </div>
            </div>
            <aside>
                <div className="card pad">
                    <div className="between">
                        <div className="h2">Trailer performance</div>
                        <Gauge value={hype} label="HYPE" />
                    </div>
                    <Spark values={video.weeklyHistory?.length ? video.weeklyHistory : [hype, hype * 1.4, hype * 1.1, hype * 1.8, hype * 1.3, hype * 2]} />
                    <div className="g3" style={{ marginTop: 10 }}>
                        <div><div className="lbl">Like ratio</div><b className="mono">{Math.round((video.likeRatio || likes / Math.max(1, likes + dislikes)) * 100)}%</b></div>
                        <div><div className="lbl">CTR</div><b className="mono">{((video.ctr || ctrFor(0.62, hype)) * 100).toFixed(1)}%</b></div>
                        <div><div className="lbl">Viewed</div><b className="mono">64%</b></div>
                    </div>
                    <div className="sent"><i style={{ flex: sentiment[0], background: 'var(--mint)' }} /><i style={{ flex: sentiment[1], background: 'var(--amb)' }} /><i style={{ flex: sentiment[2], background: 'var(--red)' }} /></div>
                    <div className="dim" style={{ marginTop: 6 }}>Themes: score, VFX, cast, runtime</div>
                </div>
                <div className="between" style={{ marginTop: 16 }}>
                    <div className="h2">Up next</div>
                    <div className="seg">{['All', 'Rivals', 'Project'].map(item => <button key={item} className={filter === item ? 'on' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
                </div>
                <div style={{ display: 'grid', gap: 12, marginTop: 10 }}>
                    {upNext.map(item => <Card key={item.id} video={item} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />)}
                </div>
            </aside>
        </div>
    );
};

export const HubScreen: React.FC = () => {
    const api = useYt();
    const project = api.projects.find(item => item.id === api.projectId) || api.projects[0];
    if (!project?.projectDetails) {
        return <div className="card pad">Marketing Hub opens when you have a film or series in production. Personal uploads still live under Create.</div>;
    }
    const phase = readPhase(api.player, project);
    const campaign = ensureCampaign(api.channel, project.id);
    const weeksLeft = phase.releaseWeekAbs != null ? phase.releaseWeekAbs - api.absWeek : 8;
    const slots = MARKETING_TYPES;
    const views = campaign.drops.reduce((sum, drop) => sum + (drop.views || 0), 0);

    return (
        <div>
            <div className="chips" style={{ marginBottom: 12 }}>
                {api.projects.map(item => (
                    <button key={item.id} className={`chip${item.id === project.id ? ' on' : ''}`} onClick={() => api.setProjectId(item.id)}>{item.projectDetails?.title}</button>
                ))}
            </div>
            <div className="hubhead">
                <div className="poster" data-title={project.projectDetails.title} style={{ backgroundImage: `url(${STILL.hero})` }} />
                <div>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><span className="pill red">Marketing Hub</span><span className="pill">{project.projectDetails.genre}</span><span className="pill">{dubLine(4)}</span></div>
                    <div className="ptitle" style={{ marginTop: 8 }}>{project.projectDetails.title}{project.projectDetails.customPoster?.tagline ? <small>{project.projectDetails.customPoster.tagline}</small> : null}</div>
                    <div className="mu" style={{ marginTop: 8 }}>{project.projectDetails.directorName ? `Dir. ${project.projectDetails.directorName} · ` : ''}Budget {formatMoney(project.projectDetails.estimatedBudget || 0)} · {project.projectPhase?.replace(/_/g, ' ') || 'In production'}</div>
                    <button className="btn red sm" style={{ marginTop: 12 }} onClick={() => api.go('upload')}>New drop</button>
                </div>
                <div className="hstats">
                    <div><span className="lbl">Campaign hype</span><b className="red">{Math.round(campaign.campaignHype)}</b></div>
                    <div><span className="lbl">Total views</span><b>{formatCompact(views)}</b></div>
                    <div><span className="lbl">Opening proj.</span><b className="mint">{formatMoney(forecastOpeningGross(project.projectDetails.estimatedBudget || 0, campaign.campaignHype))}</b></div>
                    <div><span className="lbl">From YouTube</span><b className="amb">+{forecastYtLift(campaign.campaignHype, campaign.songStreams || 0)}%</b></div>
                </div>
            </div>
            <div className="card pad" style={{ marginTop: 16 }}>
                <div className="between"><div className="h2">Release-timing planner</div><span className="pill amb">TODAY W{api.player.currentWeek}</span></div>
                <div style={{ display: 'flex', gap: 3, marginTop: 12, alignItems: 'flex-end', height: 72 }}>
                    {Array.from({ length: 12 }, (_, index) => {
                        const ahead = index;
                        const height = Math.round(carry(Math.max(0, weeksLeft - ahead)) * 64);
                        return <div key={index} style={{ flex: 1, height, background: ahead === 0 ? 'var(--red)' : 'linear-gradient(180deg, var(--amb), var(--red))', borderRadius: 4, opacity: 0.35 + carry(Math.max(0, weeksLeft - ahead)) * 0.65 }} />;
                    })}
                </div>
                <div className="dim" style={{ marginTop: 8 }}>{weeksLeft > 0 ? `${weeksLeft} weeks to release. Drops closer to release carry more hype.` : 'Release week. Premiere and review slots are open.'}</div>
            </div>
            <div className="g3" style={{ marginTop: 12 }}>
                <div className="card pad"><div className="lbl">Optimal slot</div><div className="h2">1–3 weeks out</div><div className="mu">Carry stays above 0.84.</div></div>
                <div className="card pad"><div className="lbl">Repeats</div><div className="h2">{slots.filter(type => campaign.drops.some(drop => drop.type === type)).length} used</div><div className="mu">Post again. Each repeat returns less.</div></div>
                <div className="card pad"><div className="lbl">Rival clash</div><div className="h2">Watch Trending</div><div className="mu">Trailer war uses hype^1.5.</div></div>
            </div>
            <div className="slotgrid" style={{ marginTop: 16 }}>
                {slots.map(type => {
                    const posted = campaign.drops.filter(item => item.type === type);
                    const drop = posted[posted.length - 1];
                    const outlook = dropOutlook({
                        type,
                        weeksBefore: phase.releaseWeekAbs == null ? null : phase.releaseWeekAbs - api.absWeek,
                        repeats: posted.length,
                        sameWeekPosts: 1,
                        rivalBigDrops: 1,
                        quality: project.projectDetails?.hiddenStats?.qualityScore,
                    });
                    return (
                        <button key={type} className="slot" onClick={() => api.armUpload(type, project.id)}>
                            <div className="between"><b>{typeLabel(type)}</b><span className={`pill ${posted.length ? 'mint' : 'red'}`}>{posted.length ? `${posted.length} out` : 'Open'}</span></div>
                            <div className="dim" style={{ marginTop: 6 }}>{formatMoney(dropCost(type, project.projectDetails?.estimatedBudget || 0))} if you pay · {dropEnergy(type)}E</div>
                            <div className="dim" style={{ marginTop: 6 }}>{outlook.note}</div>
                            {drop?.title && <div style={{ marginTop: 6 }}>{drop.title}</div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export const UploadScreen: React.FC = () => {
    const api = useYt();
    const [step, setStep] = useState(0);
    const [tab, setTab] = useState<'Personal' | 'Project' | 'Music' | 'Live'>('Personal');
    const [type, setType] = useState<YoutubeVideoType>(api.presetType || 'VLOG');
    const [plan, setPlan] = useState<YoutubeUploadPlan>('SAFE');
    const [title, setTitle] = useState('');
    const [langs, setLangs] = useState<string[]>(['Hindi', 'English']);
    const [weekOffset, setWeekOffset] = useState(0);
    const [source, setSource] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [fit, setFit] = useState<ThumbnailFitMode>('cover');
    const [variant, setVariant] = useState(0);
    const [busy, setBusy] = useState(false);
    const [localError, setLocalError] = useState('');
    const project = api.projects.find(item => item.id === api.projectId) || api.projects[0];
    const variants = [
        { label: 'A · Cover', fit: 'cover' as const, zoom: 1, score: 0.7 },
        { label: 'B · Tight', fit: 'cover' as const, zoom: 1.55, score: 0.84 },
        { label: 'C · Full', fit: 'contain' as const, zoom: 1, score: 0.56 },
    ];
    const hype = project ? ensureCampaign(api.channel, project.id).campaignHype : 50;
    const phase = project ? readPhase(api.player, project) : null;
    const weeksLeft = phase?.releaseWeekAbs != null ? Math.max(0, phase.releaseWeekAbs - api.absWeek - weekOffset) : 6;
    const types = tab === 'Personal' ? PERSONAL_TYPES.filter(item => item !== 'TRAILER') : tab === 'Music' ? MUSIC_TYPES : tab === 'Live' ? LIVE_TYPES : PROJECT_TYPES;

    useEffect(() => {
        if (!api.presetType) return;
        setType(api.presetType);
        if (MUSIC_TYPES.includes(api.presetType)) setTab('Music');
        else if (LIVE_TYPES.includes(api.presetType)) setTab('Live');
        else if (isMarketingType(api.presetType)) setTab('Project');
    }, [api.presetType]);

    const cost = isMarketingType(type) && type !== 'SHORT'
        ? dropCost(type, project?.projectDetails?.estimatedBudget || 0)
        : (PERSONAL_COSTS[type]?.cost || 0);
    const energy = isMarketingType(type) && type !== 'SHORT' ? dropEnergy(type) : (PERSONAL_COSTS[type]?.energy || 12);

    const publish = async () => {
        setLocalError('');
        setBusy(true);
        try {
            let thumbnailMediaId: string | undefined;
            const chosen = variants[variant];
            if (source) {
                const blob = await createFittedThumbnailBlob(source, chosen.zoom, panX, panY, chosen.fit);
                const id = `yt_thumb_${Date.now()}`;
                await saveMediaBlob(id, blob, { kind: 'youtube_thumbnail', width: 1280, height: 720 });
                thumbnailMediaId = id;
            }
            const result = publishUpload(api.player, {
                title: title || `${typeLabel(type)} · ${project?.projectDetails?.title || api.player.name}`,
                type,
                plan,
                projectId: isMarketingType(type) ? project?.id : project?.id,
                dubCount: langs.length,
                thumbnailScore: chosen.score,
                thumbnailMediaId,
                scheduledWeekAbs: api.absWeek + weekOffset,
            });
            api.apply(result);
            if (result.error) setLocalError(result.error);
        } catch (error) {
            setLocalError(error instanceof Error ? error.message : 'Thumbnail failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <div className="between"><div className="h1">Create</div><div className="stepper" style={{ width: 220 }}>{[0, 1, 2, 3, 4].map(index => <i key={index} className={index <= step ? 'on' : ''} />)}</div></div>
            <div className="dim" style={{ margin: '6px 0 14px' }}>{['Type', 'Project', 'Thumbnail', 'Details', 'Schedule'][step]}</div>
            {step === 0 && (
                <div className="wgrid">
                    <div>
                    <div className="seg">
                        {(['Personal', 'Project', 'Music', 'Live'] as const).map(item => <button key={item} className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>)}
                    </div>
                    <div className="slots" style={{ marginTop: 14 }}>
                        {types.map(item => (
                            <button key={item} className="slot" onClick={() => setType(item)} style={type === item ? { borderColor: 'var(--red)' } : undefined}>
                                <b>{typeLabel(item)}</b>
                                <div className="dim">{formatMoney(isMarketingType(item) ? dropCost(item, project?.projectDetails?.estimatedBudget || 0) : (PERSONAL_COSTS[item]?.cost || 0))} if you pay · {isMarketingType(item) ? dropEnergy(item) : (PERSONAL_COSTS[item]?.energy || 12)}E</div>
                            </button>
                        ))}
                    </div>
                    {tab === 'Live' && <button className="btn" style={{ marginTop: 12 }} onClick={() => api.go('live')}>Open the live desk</button>}
                    </div>
                    <div>
                        <Thumb src={STILL[stillForType(type)]} badge={typeLabel(type).toUpperCase()} title={project?.projectDetails?.title || api.player.name} sub={typeLabel(type).toUpperCase()} ratio="16/9" />
                        <div className="dim" style={{ marginTop: 8 }}>Uses the poster you upload on the thumbnail step. Until then this is the {typeLabel(type)} still.</div>
                    </div>
                </div>
            )}
            {step === 1 && (
                <div className="grid">
                    {api.projects.length === 0 && <div className="card pad">No project yet. Personal uploads can still publish.</div>}
                    {api.projects.map(item => (
                        <button key={item.id} className="slot" onClick={() => api.setProjectId(item.id)} style={item.id === project?.id ? { borderColor: 'var(--red)' } : undefined}>
                            <b>{item.projectDetails?.title}</b>
                            <div className="dim">{item.projectPhase} · {readPhase(api.player, item).gate}</div>
                        </button>
                    ))}
                </div>
            )}
            {step === 2 && (
                <div className="wgrid">
                    <div>
                        <label className="th" style={{ aspectRatio: '16/9', display: 'block' }}>
                            {source ? (
                                <img src={source} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: variants[variant].fit === 'contain' ? 'contain' : 'cover', transform: `scale(${variants[variant].zoom})` }} />
                            ) : <Thumb tone="poster-hero" title={typeLabel(type)} />}
                            <div className="safe" />
                            <span className="tb tb-dark">1280×720 · title safe</span>
                        </label>
                        <input type="file" accept="image/*" className="field" style={{ marginTop: 10 }} onChange={event => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/') || file.size > MAX_THUMBNAIL_SOURCE_SIZE) {
                                setLocalError('Use an image under 12MB.');
                                return;
                            }
                            if (source) URL.revokeObjectURL(source);
                            setSource(URL.createObjectURL(file));
                        }} />
                        <div className="g3" style={{ marginTop: 10 }}>
                            <label className="dim">Zoom<input className="field" type="range" min={1} max={2.5} step={0.05} value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
                            <label className="dim">Pan X<input className="field" type="range" min={-420} max={420} step={5} value={panX} onChange={event => setPanX(Number(event.target.value))} /></label>
                            <label className="dim">Pan Y<input className="field" type="range" min={-240} max={240} step={5} value={panY} onChange={event => setPanY(Number(event.target.value))} /></label>
                        </div>
                        <div className="row" style={{ marginTop: 8 }}>
                            {(['cover', 'contain'] as ThumbnailFitMode[]).map(mode => (
                                <button key={mode} className={`btn sm${fit === mode ? ' red' : ''}`} onClick={() => { setFit(mode); setZoom(1); setPanX(0); setPanY(0); }}>{mode === 'cover' ? 'Cover' : 'Fit full'}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="lbl">A/B variants</div>
                        {variants.map((item, index) => (
                            <button key={item.label} className="slot" style={{ marginTop: 8, borderColor: variant === index ? 'var(--red)' : undefined }} onClick={() => { setVariant(index); setFit(item.fit); setZoom(item.zoom); }}>
                                <div className="between"><b>{item.label}</b><span className="mono">{(ctrFor(item.score, hype) * 100).toFixed(1)}% CTR</span></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {step === 3 && (
                <div className="grid">
                    <input className="field" value={title} placeholder="Title" onChange={event => setTitle(event.target.value)} />
                    <div className="chips">{LANGS.map(lang => <button key={lang} className={`chip${langs.includes(lang) ? ' on' : ''}`} onClick={() => setLangs(current => current.includes(lang) ? current.filter(item => item !== lang) : [...current, lang])}>{lang}</button>)}</div>
                    <div className="lbl">Upload plan</div>
                    {PLANS.map(key => (
                        <button key={key} className="slot" style={plan === key ? { borderColor: 'var(--red)' } : undefined} onClick={() => setPlan(key)}>
                            <b>{UPLOAD_PLANS[key].label}</b>
                            <div className="dim">Trust {UPLOAD_PLANS[key].trust >= 0 ? '+' : ''}{UPLOAD_PLANS[key].trust} · heat {UPLOAD_PLANS[key].controversy}</div>
                        </button>
                    ))}
                </div>
            )}
            {step === 4 && (
                <div className="wgrid">
                    <div className="card pad">
                        <div className="h2">Hype carried into opening</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90, marginTop: 12 }}>
                            {[0, 1, 2, 3, 4, 5, 6].map(offset => (
                                <button key={offset} onClick={() => setWeekOffset(offset)} style={{ flex: 1, height: Math.round(carry(Math.max(0, (phase?.releaseWeekAbs != null ? phase.releaseWeekAbs - api.absWeek - offset : 8 - offset))) * 80), background: weekOffset === offset ? 'var(--red)' : 'var(--s4)', borderRadius: 6 }} />
                            ))}
                        </div>
                        <div className="dim">Schedule week {api.player.currentWeek + weekOffset} · carry {carry(weeksLeft).toFixed(2)}</div>
                    </div>
                    <div className="card pad">
                        <div className="lbl">Forecast</div>
                        <div className="kpi"><div className="v">{(ctrFor(variants[variant].score, hype) * 100).toFixed(1)}% CTR</div></div>
                        <div>Hype weight on this slot · {formatMoney(cost)} if you pay · {energy} energy</div>
                        <div className="mu">{project ? dropOutlook({
                            type,
                            weeksBefore: phase?.releaseWeekAbs == null ? null : phase.releaseWeekAbs - api.absWeek - weekOffset,
                            repeats: (ensureCampaign(api.channel, project.id).drops || []).filter(drop => drop.type === type).length,
                            sameWeekPosts: 1,
                            rivalBigDrops: 1,
                        }).note : 'Personal uploads skip the campaign.'}</div>
                        <div className="mu">Short on cash still schedules the drop, with a weaker open. 24h views settle on the next week tick. Ad CPM follows the audience country and the genre. Shorts pay much less than long-form.</div>
                    </div>
                </div>
            )}
            {localError && <div className="err" style={{ marginTop: 10 }}>{localError}</div>}
            <div className="row" style={{ marginTop: 16 }}>
                <button className="btn" disabled={step === 0} onClick={() => setStep(value => value - 1)}>Back</button>
                {step < 4 ? <button className="btn red" onClick={() => setStep(value => value + 1)}>Next</button> : <button className="btn red lg" disabled={busy} onClick={publish}>{busy ? 'Saving…' : `Schedule for W${api.player.currentWeek + weekOffset}`}</button>}
            </div>
        </div>
    );
};

export const StudioScreen: React.FC = () => {
    const api = useYt();
    const [range, setRange] = useState<'4' | '52' | 'life'>('4');
    const [content, setContent] = useState('Videos');
    const official = api.kind === 'studio' ? api.channel.officialChannels?.studio : api.kind === 'empirePlus' ? api.channel.officialChannels?.empirePlus : null;
    const subs = official ? official.subscribers : api.channel.subscribers;
    const views = official ? official.totalViews : api.channel.totalChannelViews;
    const earned = official ? official.lifetimeEarnings : api.channel.lifetimeEarnings;
    const videos = (official ? official.videos : api.channel.videos).filter(video => content === 'Shorts' ? video.isShort || video.type === 'SHORT' : content === 'Live' ? video.type === 'PREMIERE_LIVE' : true);
    const score = calculateYoutubeCreatorScore(api.player);
    const image = getYoutubePublicImageLabel(api.player);
    const factor = range === '4' ? 0.22 : range === '52' ? 0.8 : 1;
    const ctr = videos.reduce((sum, video) => sum + (video.ctr || 0.05), 0) / Math.max(1, videos.length);

    return (
        <div>
            <div className="between">
                <div className="h1">Creator Studio</div>
                <div className="seg">{(['4', '52', 'life'] as const).map(item => <button key={item} className={range === item ? 'on' : ''} onClick={() => setRange(item)}>{item === 'life' ? 'Lifetime' : `${item}w`}</button>)}</div>
            </div>
            {!official && api.kind !== 'personal' && <div className="card pad" style={{ marginTop: 12 }}>This official channel appears when the studio is active{api.kind === 'empirePlus' ? ' and Empire+ is live' : ''}.</div>}
            <div className="g6" style={{ marginTop: 14 }}>
                {[
                    ['Views', formatCompact(views * factor)],
                    ['Watch time', `${formatCompact(views * factor * 0.42)}m`],
                    ['Subs', formatCompact(subs)],
                    ['Revenue', formatMoney(earned * factor)],
                    ['CTR', `${(ctr * 100).toFixed(1)}%`],
                    ['Avg duration', '8:12'],
                ].map(([label, value]) => (
                    <div key={label} className="card pad kpi"><div className="lbl">{label}</div><div className="v">{value}</div></div>
                ))}
            </div>
            <div className="wgrid" style={{ marginTop: 16 }}>
                <div className="card pad">
                    <div className="h2">Revenue</div>
                    <Spark values={[earned * 0.2, earned * 0.35, earned * 0.3, earned * 0.5, earned * 0.46, earned * factor].map(value => Math.max(1, value))} color="#36d99a" />
                    <div className="dim">Ad CPM follows the audience mix. Open Analytics for the country rates, retention, and which wallet gets paid.</div>
                </div>
                <div className="card pad">
                    <div className="h2">Audience</div>
                    <div className="dim">Country CPM is on Analytics. A US-heavy audience pays several times an India-heavy one. Controversy cuts the rate. It does not switch ads off.</div>
                </div>
            </div>
            <div className="between" style={{ marginTop: 16 }}>
                <div className="h2">Top content</div>
                <div className="seg">{['Videos', 'Shorts', 'Live'].map(item => <button key={item} className={content === item ? 'on' : ''} onClick={() => setContent(item)}>{item}</button>)}</div>
            </div>
            <div className="g4" style={{ marginTop: 12 }}>{videos.slice(0, 4).map(video => <Card key={video.id} video={video} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />)}</div>
            <div className="card pad" style={{ marginTop: 16 }}>
                <div className="between">
                    <div><div className="lbl">Creator health</div><div className="h1">{score}</div><div className="gold">{image}</div></div>
                    <div>
                        <div>Trust {Math.round(api.channel.audienceTrust ?? 55)} · Mood {Math.round(api.channel.fanMood ?? 55)} · Heat {Math.round(api.channel.controversy ?? 0)}</div>
                        <div className="dim">Lane {identityTuning(api.channel.creatorIdentity).label}. Identity changes wait 12 weeks.</div>
                    </div>
                </div>
                <Spark values={[40, 48, score * 0.7, score * 0.9, score, Math.min(100, score + 4)]} color="#8b7bff" />
                <div className="chips" style={{ marginTop: 10 }}>
                    {IDENTITIES.map(id => (
                        <button key={id} className={`chip${api.channel.creatorIdentity === id ? ' on' : ''}`} onClick={() => api.apply(changeIdentity(api.player, id))}>{identityTuning(id).label}</button>
                    ))}
                </div>
                <button className="btn" style={{ marginTop: 10 }} onClick={() => api.apply(enableMemberships(api.player))}>{api.channel.membershipsActive ? `${formatCompact(api.channel.members)} members` : 'Turn on memberships'}</button>
            </div>
        </div>
    );
};

const playTier = (subs: number, views: number) => {
    if (subs >= 100_000_000) return 'Red Diamond';
    if (subs >= 10_000_000) return 'Diamond';
    if (subs >= 1_000_000 || views >= 1_000_000) return subs >= 1_000_000 ? 'Gold' : '1M views';
    if (subs >= 100_000) return 'Silver';
    if (subs >= 10_000) return '10K';
    return 'Starting';
};

export const ChannelScreen: React.FC = () => {
    const api = useYt();
    const [tab, setTab] = useState('Home');
    const official = api.kind === 'studio' ? api.channel.officialChannels?.studio : api.kind === 'empirePlus' ? api.channel.officialChannels?.empirePlus : null;
    const subs = official ? official.subscribers : api.channel.subscribers;
    const videos = official ? official.videos : api.channel.videos;
    const handle = official?.handle || api.channel.handle;
    const shown = videos.filter(video => tab === 'Shorts' ? video.isShort || video.type === 'SHORT' : tab === 'Live' ? video.type === 'PREMIERE_LIVE' : true);
    const featured = shown[0];

    return (
        <div>
            <div className="chan-banner" style={{ backgroundImage: 'linear-gradient(90deg, rgba(8,8,11,.25), transparent), url(/yt/premiere.webp)' }}>
                <div className="disp" style={{ position: 'absolute', right: 20, bottom: 16, zIndex: 2, textAlign: 'right', fontSize: 30, lineHeight: 0.95 }}>
                    {api.projects[0]?.projectDetails?.title || api.player.name}
                    <small style={{ display: 'block', fontSize: 12, letterSpacing: '.22em', color: 'var(--gold)' }}>NEW TRAILER OUT NOW</small>
                </div>
            </div>
            <div className="chanhead">
                <div className="row">
                    <Av kind={api.kind === 'empirePlus' ? 'eplus' : api.kind === 'studio' ? 'studio' : 'me'} label={api.player.name} size={96} />
                    <div>
                        <div className="h2">{api.kind === 'personal' ? api.player.name : handle}</div>
                        <div className="dim">{handle} · {formatCompact(subs)} subs · {videos.length} videos · {formatCompact(api.channel.members)} members</div>
                    </div>
                </div>
                <div className="row">
                    <span className="pill gold">{playTier(subs, official ? official.totalViews : api.channel.totalChannelViews)}</span>
                    <span className="pill">Your channel</span>
                    <button className="btn sm" onClick={() => api.go('money')}>Join</button>
                    <button className="btn sm" onClick={() => setTab('Store')}>Store</button>
                </div>
            </div>
            <div className="cs">
                {(['personal', 'studio', 'empirePlus'] as const).map(item => (
                    <button key={item} className={`csi${api.kind === item ? ' on' : ''}`} onClick={() => api.update(setChannel(api.player, item))}>
                        <Av kind={item === 'empirePlus' ? 'eplus' : item === 'studio' ? 'studio' : 'me'} label={api.player.name} size={26} />
                        {item === 'personal' ? 'Personal' : item === 'studio' ? 'Studio' : 'Empire+'}
                    </button>
                ))}
            </div>
            <div className="chips" style={{ marginTop: 16 }}>
                {['Home', 'Videos', 'Shorts', 'Live', 'Playlists', 'Community', 'Store', 'Membership'].map(item => (
                    <button key={item} className={`chip${tab === item ? ' on' : ''}`} onClick={() => setTab(item)}>{item}</button>
                ))}
            </div>
            {tab === 'Store' && (
                <div className="g3" style={{ marginTop: 16 }}>
                    {(Object.keys(MERCH) as YoutubeMerchTier[]).map(tier => (
                        <div key={tier} className="card pad">
                            <div className="h2">{MERCH[tier].label}</div>
                            <div className="dim">{formatMoney(MERCH[tier].cost)} · trust {MERCH[tier].trustReq}+ · 6 week cooldown</div>
                            <button className="btn red sm" style={{ marginTop: 8 }} onClick={() => api.apply(dropMerch(api.player, tier))}>Drop</button>
                        </div>
                    ))}
                    {api.channel.lastMerchResult && <div className="mu">{api.channel.lastMerchResult}</div>}
                </div>
            )}
            {tab === 'Membership' && (
                <div className="card pad" style={{ marginTop: 16 }}>
                    <div className="h2">{api.channel.membershipsActive ? 'Memberships are live' : 'Memberships are off'}</div>
                    <div className="g3" style={{ marginTop: 10 }}>
                        {['Fan', 'Set', 'Producer'].map((name, index) => <div key={name} className="slot"><b>{name}</b><div className="dim">${(index + 1) * 4}/week display tier</div></div>)}
                    </div>
                    <button className="btn" style={{ marginTop: 10 }} onClick={() => api.apply(enableMemberships(api.player))}>Enable</button>
                </div>
            )}
            {tab !== 'Store' && tab !== 'Membership' && featured && (
                <div className="wgrid" style={{ marginTop: 18 }}>
                    <Card video={featured} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />
                    <div className="grid">{shown.slice(1, 5).map(video => <Card key={video.id} video={video} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />)}</div>
                </div>
            )}
            {tab === 'Home' && (
                <div style={{ marginTop: 18 }}>
                    <div className="between"><div className="h2">Merch shelf</div><span className="pill gold">Premium drop live</span></div>
                    <div className="g6" style={{ marginTop: 10 }}>
                        {(Object.keys(MERCH) as YoutubeMerchTier[]).map((tier, index) => (
                            <button key={tier} className="card pad" style={{ textAlign: 'left' }} onClick={() => api.apply(dropMerch(api.player, tier))}>
                                <Thumb src={[STILL.short, STILL.hero, STILL.bts][index] || STILL.short} ratio="1/1" />
                                <b style={{ display: 'block', marginTop: 8 }}>{MERCH[tier].label}</b>
                                <small className="dim">{formatMoney(MERCH[tier].cost)}</small>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {tab === 'Community' && <div className="card pad" style={{ marginTop: 16 }}>{api.player.logs.slice(0, 5).map((log, index) => <div key={`${log.week}-${index}`} className="mu" style={{ marginTop: 6 }}>{log.message}</div>)}</div>}
            {tab === 'Playlists' && <div className="card pad" style={{ marginTop: 16 }}>Saved videos: {(api.channel.savedVideoIds || []).length}</div>}
        </div>
    );
};

const COUNTRIES = ['Global', 'India', 'United States', 'Spain', 'South Korea', 'Brazil'];

export const TrendingScreen: React.FC = () => {
    const api = useYt();
    const [country, setCountry] = useState('India');
    const [tab, setTab] = useState('Now');
    const ranked = useMemo(() => {
        const code = country === 'India' ? 'IN' : country === 'United States' ? 'US' : country === 'Spain' ? 'ES' : country === 'South Korea' ? 'KR' : country === 'Brazil' ? 'BR' : '';
        const matchTab = (video: YoutubeVideo) => {
            if (tab === 'Trailers') return /TRAILER|TEASER|ANNOUNCE|PROMO|STREAM_PREMIERE|POSTER/.test(video.type);
            if (tab === 'Music') return MUSIC_TYPES.includes(video.type) || video.type === 'COVER';
            if (tab === 'Films & Series') return !!video.projectId || !!video.rivalChannelId || /TRAILER|CLIP|REVIEW/.test(video.type);
            if (tab === 'Gaming') return /game|raid|react/i.test(`${video.title} ${video.type}`);
            return true;
        };
        const local = api.videos.filter(video => matchTab(video) && (!code || !video.country || video.country === code));
        const rows = local.length >= 3 ? local : api.videos.filter(matchTab);
        return [...rows].sort((a, b) => b.views - a.views).slice(0, 10);
    }, [api.videos, tab, country]);
    const top = ranked[0];
    const yours = api.videos.find(video => video.isPlayer && /TRAILER|TEASER/.test(video.type)) || api.videos.find(video => video.isPlayer);
    const rival = ranked.find(video => video.id !== yours?.id);
    const share = trailerWarShare(yours?.hype || yours?.views || 1, [rival?.hype || rival?.views || 1]);
    const headline = top ? aiOffline.newsHeadline({ subject: top.title, event: 'a viral YouTube record', tone: 'record', seed: top.id }) : '';
    const post = top ? aiOffline.xPosts({ speaker: 'Creator Pulse', subject: top.title, event: 'set a record', seed: top.id })[0] : '';
    const rising = (tab === 'Creators' || tab === 'Gaming'
        ? PUBLIC_CREATORS.filter(creator => creator.category === 'STREAMER' && (country === 'Global' || creator.country === country))
        : PUBLIC_CREATORS.filter(creator => (country === 'Global' || creator.country === country) && creator.category !== 'OFFICIAL')
    ).slice(0, 8);
    const project = api.projects[0];

    const invite = (name: string, id: string) => {
        const creator = PUBLIC_CREATORS.find(item => item.id === id);
        const title = creator && project?.projectDetails
            ? reactionTitle(creator, project.projectDetails.title, 'trailer')
            : `${name} × ${api.player.name}`;
        if (project) {
            api.apply(publishUpload(api.player, { title, type: 'REACTION_COLLAB', plan: 'PROJECT_PROMO', projectId: project.id }));
            return;
        }
        api.apply(personalCollab(api.player, name, title));
    };

    return (
        <div>
            <div className="chips">{COUNTRIES.map(item => <button key={item} className={`chip${country === item ? ' on' : ''}`} onClick={() => setCountry(item)}>{item}</button>)}</div>
            <div className="chips" style={{ marginTop: 8 }}>{['Now', 'Trailers', 'Music', 'Films & Series', 'Gaming', 'Creators'].map(item => <button key={item} className={`chip${tab === item ? ' red' : ''}`} onClick={() => setTab(item)}>{item}</button>)}</div>
            {top && (
                <div className="card pad" style={{ marginTop: 14 }}>
                    <div className="lbl">Viral record</div>
                    <div className="h2">{top.title}</div>
                    <div className="mu">{headline}</div>
                    <div className="dim" style={{ marginTop: 6 }}>X · {post}</div>
                    <div className="dim">Fame, campaign hype, and a listed EMP shock when the record clears the viral line.</div>
                </div>
            )}
            <div style={{ marginTop: 8 }}>
                {ranked.map((video, index) => (
                    <button key={video.id} className="rank" onClick={() => api.openVideo(video.id)}>
                        <b className="mono" style={{ width: 28 }}>{index + 1}</b>
                        <Face video={video} ratio="16/10" />
                        <div style={{ flex: 1 }}><b>{video.title}</b><div className="dim">{video.authorName} · {video.rivalChannelId ? 'House' : video.isPlayer ? 'Your project' : 'Creator'}{video.country ? ` · ${video.country}` : ''}</div></div>
                        <span className={index % 3 === 2 ? 'dn' : 'up'}>{index % 3 === 2 ? '▼' : '▲'} {formatCompact(video.views)}</span>
                    </button>
                ))}
            </div>
            {yours && rival && (
                <div className="card pad" style={{ marginTop: 12 }}>
                    <div className="h2">Trailer war</div>
                    <div className="between"><span>{yours.title}</span><span>{rival.title}</span></div>
                    <div className="between mono"><span>{formatCompact(yours.views)} · {formatCompact(yours.likes)} likes</span><span>{formatCompact(rival.views)}</span></div>
                    <div className="mint">Your projected opening-weekend share {Math.round(share * 100)}%.</div>
                </div>
            )}
            <div className="h2" style={{ marginTop: 16 }}>Rising · {country}</div>
            <div className="slots" style={{ marginTop: 8 }}>
                {rising.map(creator => (
                    <div key={creator.id} className="slot">
                        <div className="between"><b>{creator.name}</b><span className="pill">{creator.category === 'STREAMER' ? 'Streamer' : creator.niche}</span></div>
                        <div className="dim">{creator.handle} · {creator.country}{creator.org ? ` · ${creator.org}` : ''} · {formatCompact(creator.followers)}</div>
                        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => invite(creator.name, creator.id)}>Invite</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MusicScreen: React.FC = () => {
    const api = useYt();
    const project = api.projects.find(item => item.id === api.projectId) || api.projects[0];
    const campaign = project ? ensureCampaign(api.channel, project.id) : null;
    const songs = campaign?.songs?.length ? campaign.songs : [
        { id: 'title', title: `${project?.projectDetails?.title || 'Untitled'} Title Track`, singer: 'House vocal', composer: 'Studio score', plays: campaign?.songStreams || 0, duration: '3:42', status: 'PREMIERE' as const },
        { id: 'lyric', title: 'Lyric cut', singer: 'House vocal', composer: 'Studio score', plays: Math.floor((campaign?.songStreams || 0) * 0.4), duration: '3:18', status: 'LYRIC' as const },
        { id: 'bgm', title: 'Night BGM', singer: 'Instrumental', composer: 'Studio score', plays: Math.floor((campaign?.songStreams || 0) * 0.2), duration: '2:56', status: 'LOCKED' as const },
    ];
    const [current, setCurrent] = useState(songs[0]?.id);
    const [chart, setChart] = useState('IN');
    const song = songs.find(item => item.id === current) || songs[0];
    const bonus = musicOpeningBonus(campaign?.songStreams || song?.plays || 0);
    const chartCode = chart === 'Global' ? '' : chart === 'US' ? 'US' : 'IN';
    const chartRows = api.videos.filter(video => (MUSIC_TYPES.includes(video.type) || video.type === 'COVER') && (!chartCode || !video.country || video.country === chartCode));

    return (
        <div>
            <div className="wgrid">
                <div className="card" style={{ overflow: 'hidden' }}>
                    <Thumb src={STILL.song} ratio="1/1" title={song?.title} sub="JUKEBOX" badge="MUSIC" badgeC="gold" />
                    <div className="pad">
                        <div className="lbl">Soundtrack</div>
                        <div className="h1">{song?.title}</div>
                        <div className="mu">{song?.composer} · {song?.singer}</div>
                        <div className="gold" style={{ marginTop: 8 }}>Songs add up to +{(bonus * 100).toFixed(1)}% opening · {formatCompact(song?.plays || 0)} plays</div>
                    </div>
                </div>
                <div>
                    {songs.map(item => (
                        <button key={item.id} className="rank" onClick={() => setCurrent(item.id)}>
                            <Thumb src={STILL.song} ratio="1/1" />
                            <div style={{ flex: 1, textAlign: 'left' }}><b>{item.title}</b><div className="dim">{item.singer} · {item.status} · {item.duration}</div></div>
                            <span className="mono">{formatCompact(item.plays)}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="h2" style={{ marginTop: 18 }}>Top songs</div>
            <div className="chips" style={{ marginTop: 8 }}>{['IN', 'Global', 'US'].map(item => <button key={item} className={`chip${chart === item ? ' on' : ''}`} onClick={() => setChart(item)}>{item === 'IN' ? 'India' : item === 'US' ? 'US' : 'Global'}</button>)}</div>
            <div className="card pad" style={{ marginTop: 10 }}>
                {chartRows.slice(0, 8).map((video, index) => (
                    <button key={video.id} className="between" style={{ width: '100%', marginTop: 8 }} onClick={() => api.openVideo(video.id)}>
                        <span>{index + 1}. {video.title}</span><span className="dim">{video.authorName}{video.country ? ` · ${video.country}` : ''}</span>
                    </button>
                ))}
                {chartRows.length === 0 && <div className="mu">Chart fills when a music video, lyric video, or cover is out.</div>}
            </div>
            <div className="card pad" style={{ marginTop: 12 }}>
                <div className="between"><b>Now playing</b><span className="dim">{song?.duration}</span></div>
                <Spark values={[2, 8, 4, 12, 6, 14, 9, 11, 5, 13]} color="#f6c453" />
            </div>
        </div>
    );
};

export const ShortsScreen: React.FC = () => {
    const api = useYt();
    const shorts = api.videos.filter(video => video.isShort || video.type === 'SHORT');
    const list = shorts.length ? shorts : api.videos.slice(0, 4);
    const [index, setIndex] = useState(0);
    const video = list[index] || list[0];
    if (!video) return <div className="card pad">No Shorts yet.</div>;
    const remixes = Math.floor(video.views * 0.02);

    const analytics = (
        <div className="card pad">
            <div className="lbl">This Short</div>
            <div className="mono">{formatCompact(video.views)} views</div>
            <div className="dim">Viewed vs swiped 71% · subs +{Math.floor(video.views / 240)} · Shorts RPM is a small fraction of long-form</div>
            <Spark values={video.weeklyHistory?.length ? video.weeklyHistory : [4, 8, 6, 12, 9, 14, 11]} />
            <div className="mint">Remixes drive the title track +{formatCompact(remixes * 40)} streams.</div>
        </div>
    );

    return (
        <div className="shorts-layout">
            {analytics}
            <div className="short-stage">
                <button className="backfloat show-m" onClick={() => api.go('home')}>Back</button>
                <Face video={video} ratio="9/16" badge="#Challenge" />
                <div style={{ position: 'absolute', right: 10, bottom: 80, display: 'grid', gap: 8 }}>
                    <button className="btn sm" onClick={() => api.update(reactToVideo(api.player, video.id, 'LIKE'))}>Like</button>
                    <button className="btn sm" onClick={() => api.update(reactToVideo(api.player, video.id, 'DISLIKE'))}>Dislike</button>
                    <button className="btn sm" onClick={() => api.openVideo(video.id)}>Comments</button>
                    <button className="btn sm" onClick={() => api.update(toggleSave(api.player, video.id))}>Remix</button>
                </div>
                <div style={{ position: 'absolute', left: 12, right: 70, bottom: 16 }}>
                    <b>{video.title}</b>
                    <div className="dim">{video.authorName} · sound {projectTitle(api, video.projectId) || 'original'}</div>
                </div>
            </div>
            <div>
                <div className="card pad">
                    <div className="h2">Sound usage</div>
                    <div>{formatCompact(remixes)} remixes</div>
                    <button className="btn sm" style={{ marginTop: 8 }} onClick={() => api.armUpload('SHORT', video.rivalChannelId ? undefined : video.projectId)}>Use this sound</button>
                </div>
                <div className="h2" style={{ marginTop: 12 }}>Up next</div>
                {list.map((item, itemIndex) => (
                    <button key={item.id} className="rank" onClick={() => setIndex(itemIndex)}><Face video={item} ratio="9/12" /><span>{item.title}</span></button>
                ))}
            </div>
        </div>
    );
};

export const LiveScreen: React.FC = () => {
    const api = useYt();
    const slate = liveCreators(api.absWeek, 36);
    const india = slate.filter(creator => creator.country === 'India').slice(0, 10);
    const world = slate.filter(creator => creator.country !== 'India').slice(0, 8);
    const [host, setHost] = useState(india[0]?.id || world[0]?.id || '');
    const current = slate.find(creator => creator.id === host) || india[0] || world[0];
    const [ended, setEnded] = useState(false);
    const chat = aiOffline.generateComments({ videoTitle: current ? `${current.name} live` : 'live', videoType: 'livestream', author: api.player.name, seed: `${api.absWeek}:${host}`, count: 6 });
    const ownLive = api.channel.lastLivestreamWeek === api.absWeek;
    const project = api.projects[0];
    const phase = project ? readPhase(api.player, project) : null;

    const Row: React.FC<{ creator: (typeof slate)[number] }> = ({ creator }) => (
        <div className="slot">
            <div className="between"><b>{creator.name}</b><span className="pill cy">{formatCompact(creator.concurrent)} live</span></div>
            <div className="dim">{creator.country} · {creator.niche}{creator.org ? ` · ${creator.org}` : ''}</div>
            <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={() => setHost(creator.id)}>Watch</button>
                <button className="btn sm red" onClick={() => api.apply(raidStreamer(api.player, creator.id))}>Raid trailer</button>
                <button className="btn sm" onClick={() => api.apply(personalCollab(api.player, creator.name, reactionTitle(creator, project?.projectDetails?.title || api.player.name, 'stream')))}>Collab</button>
            </div>
        </div>
    );

    return (
        <div className="wgrid">
            <div>
                <button className="backfloat show-m" onClick={() => api.go('home')}>Back</button>
                <div className="player">
                    <Thumb src={STILL.premiere} badge="LIVE" badgeC="red" title={current?.name || api.player.name} sub={ended ? 'ENDED' : 'ON AIR'} ratio="16/9" />
                    <div className="stats" style={{ position: 'absolute', right: 12, top: 12 }}><span className="pill red">{current ? formatCompact(current.concurrent) : formatCompact(api.channel.peakLive || 0)} watching</span></div>
                    {!ended && <div className="card pad" style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: 280 }}><b>Poll</b><div className="mu">Drop the teaser now?</div><div className="row"><span className="pill mint">Yes 71%</span><span className="pill">Not yet</span></div></div>}
                </div>
                <div className="g3" style={{ marginTop: 12 }}>
                    <div className="card pad"><div className="lbl">Peak</div><b className="mono">{formatCompact(Math.max(api.channel.peakLive || 0, current?.concurrent || 0))}</b></div>
                    <div className="card pad"><div className="lbl">Super chat</div><b className="mono">{formatMoney(api.channel.superChatLifetime || 0)}</b></div>
                    <div className="card pad"><div className="lbl">Heat</div><b className="mono">{Math.round(api.channel.controversy ?? 0)}</b><div className="dim">Messy-moment risk rises with heat.</div></div>
                </div>
                <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn red" onClick={() => api.apply(goLive(api.player, 'standard'))}>{ownLive ? 'Streamed this week' : 'Go live'}</button>
                    <button className="btn" onClick={() => api.apply(goLive(api.player, 'guest'))}>Co-star</button>
                    <button className="btn" onClick={() => api.apply(goLive(api.player, 'surprise'))}>Surprise drop</button>
                    <button className="btn" onClick={() => api.apply(goLive(api.player, 'poll'))}>New poll</button>
                    <button className="btn" onClick={() => setEnded(true)}>End stream</button>
                </div>
                {project && <div className="card pad" style={{ marginTop: 12 }}><b>Premiere livestream</b><div className="mu">{project.projectDetails?.title} · {phase?.releaseWeekAbs != null ? `week ${((phase.releaseWeekAbs % 52) + 1)}` : 'when the film releases'}</div></div>}
            </div>
            <div>
                <div className="card pad" style={{ maxHeight: 280, overflow: 'auto' }}>
                    <div className="h2">Live chat</div>
                    <div className="pill gold">Pinned · gifted memberships on</div>
                    {chat.map((line, index) => <div key={`${index}-${line}`} style={{ marginTop: 8 }}><b className={index === 0 ? 'gold' : ''}>{index === 0 ? 'Member' : `chat${index}`}</b> <span className="mu">{line}</span></div>)}
                </div>
                <div className="h2" style={{ marginTop: 14 }}>India live</div>
                <div className="grid" style={{ marginTop: 8 }}>{india.map(creator => <Row key={creator.id} creator={creator} />)}</div>
                <div className="h2" style={{ marginTop: 14 }}>World live</div>
                <div className="grid" style={{ marginTop: 8 }}>{world.map(creator => <Row key={creator.id} creator={creator} />)}</div>
                <div className="dim" style={{ marginTop: 8 }}>{streamers().length} streamers on the roster. Names of living people are altered in play.</div>
            </div>
        </div>
    );
};

const MILESTONES = [
    { id: 'subs_10000', name: '10K', need: 10_000, kind: 'subs' as const },
    { id: 'subs_100000', name: 'Silver', need: 100_000, kind: 'subs' as const },
    { id: 'views_1000000', name: '1M views', need: 1_000_000, kind: 'views' as const },
    { id: 'subs_1000000', name: 'Gold', need: 1_000_000, kind: 'subs' as const },
    { id: 'subs_10000000', name: 'Diamond', need: 10_000_000, kind: 'subs' as const },
    { id: 'subs_100000000', name: 'Red Diamond', need: 100_000_000, kind: 'subs' as const },
];

export const MoneyScreen: React.FC = () => {
    const api = useYt();
    const unlocked = new Set<string>(api.player.flags?.youtubeMilestonesUnlocked || []);
    const strikes = strikeCount(api.player);
    const leaks = (api.channel.leaks || []).filter(leak => !leak.resolved);
    const progress = yppProgress(api.channel, api.kind, api.absWeek);
    const monetized = progress.monetized || api.channel.isMonetized;

    return (
        <div>
            <div className="h1">Earn</div>
            <div className="dim">Monetization at {YOUTUBE_MONETIZATION_SUBS.toLocaleString()} subs and {YPP_WATCH_HOURS.toLocaleString()} watch hours. CPM follows audience country and genre, and the money goes to {api.kind === 'personal' ? 'personal cash' : api.kind === 'studio' ? 'the studio treasury' : 'the Empire+ treasury'}. {monetized ? 'This channel is monetized.' : `This channel has ${Math.round(progress.watchHours).toLocaleString()} watch hours.`}</div>
            <button className="btn sm" style={{ marginTop: 8 }} onClick={() => api.go('analytics')}>Open analytics</button>
            <div className="g6" style={{ marginTop: 14 }}>
                {MILESTONES.map(item => {
                    const have = item.kind === 'subs' ? api.channel.subscribers : api.channel.totalChannelViews;
                    const earned = unlocked.has(item.id) || have >= item.need;
                    return (
                        <div key={item.id} className="card pad" style={{ opacity: earned ? 1 : 0.55 }}>
                            <div className="gold disp" style={{ fontSize: 28 }}>{item.name}</div>
                            <div className="mono">{formatCompact(Math.min(have, item.need))}/{formatCompact(item.need)}</div>
                            <div className="bar" style={{ height: 5, background: '#000', borderRadius: 5, marginTop: 8 }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, (have / item.need) * 100)}%`, background: 'var(--gold)' }} /></div>
                        </div>
                    );
                })}
            </div>
            <div className="wgrid" style={{ marginTop: 16 }}>
                <div className="card pad">
                    <div className="h2">Ad revenue</div>
                    <div className="kpi"><div className="v">{formatMoney(api.channel.lifetimeEarnings)}</div></div>
                    {Object.entries(COUNTRY_CPM).filter(([code]) => code !== 'UK').slice(0, 5).map(([code, rpm]) => <div key={code} className="between"><span>{code}</span><span className="dim mono">${rpm.toFixed(2)} CPM</span></div>)}
                </div>
                <div className="card pad">
                    <div className="h2">Memberships</div>
                    <div>{formatCompact(api.channel.members)} members · about {formatMoney((api.channel.members || 0) * 4)} / week</div>
                    <button className="btn sm" style={{ marginTop: 8 }} onClick={() => api.apply(enableMemberships(api.player))}>Open memberships</button>
                    <div className="h2" style={{ marginTop: 16 }}>Super chat</div>
                    <div className="mono">{formatMoney(api.channel.superChatLifetime || 0)} lifetime</div>
                    <div className="dim">Tiers ride the next livestream. Forecast follows subscribers and fan mood.</div>
                </div>
            </div>
            <div className="h2" style={{ marginTop: 16 }}>Merch drops</div>
            <div className="g3">
                {(Object.keys(MERCH) as YoutubeMerchTier[]).map(tier => (
                    <button key={tier} className="slot" onClick={() => api.apply(dropMerch(api.player, tier))}>
                        <b>{MERCH[tier].label}</b>
                        <div className="dim">{formatMoney(MERCH[tier].cost)} · trust {MERCH[tier].trustReq}</div>
                    </button>
                ))}
            </div>
            <div className="h2" style={{ marginTop: 16 }}>Sponsorships and collabs</div>
            <div className="grid">
                {api.channel.activeCollabs.map(collab => (
                    <div key={collab.id} className="slot"><b>{collab.creatorName}</b><div>{collab.conceptTitle}</div><button className="btn sm" onClick={() => api.apply(completeCollab(api.player, collab))}>Film it</button></div>
                ))}
                {api.channel.activeBrandDeals.map(deal => (
                    <div key={deal.id} className="slot"><b>{deal.brandName}</b><div>{formatMoney(deal.payout)}</div><button className="btn sm" onClick={() => api.apply(completeBrand(api.player, deal))}>Deliver</button></div>
                ))}
                {api.channel.activeCollabs.length + api.channel.activeBrandDeals.length === 0 && <div className="mu">Offers arrive in Messages once the channel has traction, and from Invite on Trending.</div>}
            </div>
            <div className="card pad" style={{ marginTop: 16 }}>
                <div className="between"><div className="h2">Copyright and strikes</div><b className="mono">{strikes}/3</b></div>
                <div className="bar" style={{ height: 8, background: '#000', borderRadius: 8, marginTop: 8 }}><i style={{ display: 'block', height: '100%', width: `${(strikes / 3) * 100}%`, background: 'var(--red)' }} /></div>
                <div className="dim">One strike freezes uploads for a week. Two also demonetize. Three drops monetization and 30% of subs. Covers and viral bait are the risky uploads.</div>
                {leaks.map(leak => (
                    <div key={leak.id} style={{ marginTop: 12 }}>
                        <b>{leak.title}</b>
                        <div className="dim">{formatCompact(leak.views)} views{leak.spoilsFinal ? ' · spoils the final trailer' : ''}</div>
                        <div className="row" style={{ marginTop: 8 }}>
                            <button className="btn sm" onClick={() => api.apply(resolveLeak(api.player, leak.id, 'TAKEDOWN'))}>Take down</button>
                            <button className="btn sm" onClick={() => api.apply(resolveLeak(api.player, leak.id, 'CLAIM'))}>Claim revenue</button>
                            <button className="btn sm" onClick={() => api.apply(resolveLeak(api.player, leak.id, 'IGNORE'))}>Ignore</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const SubscriptionsScreen: React.FC = () => {
    const api = useYt();
    const houses = api.channel.rivalChannels || [];
    const followed = new Set(api.channel.subscriptions || []);
    const feed = api.videos
        .filter(video => video.rivalChannelId && followed.has(video.rivalChannelId))
        .sort((a, b) => (b.yearUploaded || 0) - (a.yearUploaded || 0) || b.weekUploaded - a.weekUploaded);
    return (
        <div>
            <div className="h1">Subscriptions</div>
            <div className="dim" style={{ margin: '6px 0 14px' }}>Houses you follow. Their new uploads land here.</div>
            {followed.size === 0 && <div className="card pad">You are not following any house yet. Open one below and subscribe.</div>}
            <div className="grid" style={{ marginTop: 12 }}>
                {feed.slice(0, 8).map(video => <Card key={video.id} video={video} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />)}
            </div>
            <div className="h2" style={{ marginTop: 18 }}>Houses</div>
            <div className="slots" style={{ marginTop: 8 }}>
                {houses.map(house => (
                    <button key={house.id} className="slot" onClick={() => api.openRival(house.id)} style={{ textAlign: 'left' }}>
                        <div className="between"><b>{house.name}</b><span className="pill">{followed.has(house.id) ? 'Subscribed' : house.country}</span></div>
                        <div className="dim">{house.handle} · {formatCompact(house.subscribers)} subs · {personalityLabel(house.personality)}</div>
                        <div className="dim">{house.language} · {house.videos.length} uploads</div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export const RivalChannelScreen: React.FC = () => {
    const api = useYt();
    const house = findRivalChannel(api.channel, api.rivalId) || (api.channel.rivalChannels || [])[0];
    if (!house) return <div className="card pad">No rival channels yet. They appear with the studios, platforms, and labels in this world.</div>;
    const subscribed = (api.channel.subscriptions || []).includes(house.id);
    const shown = house.videos;
    return (
        <div>
            <button className="btn sm" onClick={() => api.go('subs')}>All houses</button>
            <div className="chanhead" style={{ marginTop: 12 }}>
                <div className="row">
                    <Av kind="letter" label={house.name} size={72} />
                    <div>
                        <div className="h2">{house.name} <span className="vf">✓</span></div>
                        <div className="dim">{house.handle} · {formatCompact(house.subscribers)} subs · {shown.length} videos</div>
                        <div className="dim">{personalityLabel(house.personality)} · {house.country} · {house.language}</div>
                        <div className="dim">Fatigue {Math.round(house.fatigue)} · Backlash {Math.round(house.backlash)}</div>
                    </div>
                </div>
                <button className={`btn sm${subscribed ? '' : ' white'}`} onClick={() => api.apply(toggleSubscription(api.player, house.id))}>{subscribed ? 'Subscribed' : 'Subscribe'}</button>
            </div>
            <div className="grid" style={{ marginTop: 16 }}>
                {shown.map(video => <Card key={video.id} video={video} onOpen={api.openVideo} age={api.player.age} week={api.player.currentWeek} />)}
            </div>
            {shown.length === 0 && <div className="card pad" style={{ marginTop: 12 }}>{house.name} has not posted in this window. A quiet house stays quiet until a real project is close.</div>}
        </div>
    );
};

export const screenFor = (screen: string) => {
    if (screen === 'watch') return <WatchScreen />;
    if (screen === 'hub') return <HubScreen />;
    if (screen === 'upload') return <UploadScreen />;
    if (screen === 'studio') return <StudioScreen />;
    if (screen === 'channel') return <ChannelScreen />;
    if (screen === 'trending') return <TrendingScreen />;
    if (screen === 'subs') return <SubscriptionsScreen />;
    if (screen === 'rival') return <RivalChannelScreen />;
    if (screen === 'music') return <MusicScreen />;
    if (screen === 'shorts') return <ShortsScreen />;
    if (screen === 'live') return <LiveScreen />;
    if (screen === 'money') return <MoneyScreen />;
    if (screen === 'analytics') return <AnalyticsScreen />;
    return <HomeScreen />;
};
