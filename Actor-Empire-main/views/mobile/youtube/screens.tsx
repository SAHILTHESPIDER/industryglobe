import React, { useEffect, useMemo, useState } from 'react';
import { YoutubeCreatorIdentity, YoutubeMerchTier, YoutubeUploadPlan, YoutubeVideo, YoutubeVideoType } from '../../../types';
import { saveMediaBlob } from '../../../services/mediaStorage';
import { aiContent, aiOffline } from '../../../src/services/aiContent';
import { liveCreators, PUBLIC_CREATORS, reactionTitle, streamers } from '../../../services/youtubeCreators';
import { calculateYoutubeCreatorScore, getYoutubePublicImageLabel, YOUTUBE_MONETIZATION_SUBS, YOUTUBE_MONETIZATION_VIEWS } from '../../../services/youtubeLogic';
import {
    carry, COUNTRY_RPM, ctrFor, dropCost, dropEnergy, ensureCampaign, FLAT_RPM, isMarketingType,
    MARKETING_TYPES, musicOpeningBonus, openingMultiplier, PERSONAL_TYPES, readPhase,
    SHORTS_RPM, slotUnlocked, trailerWarShare, typeLabel,
} from '../../../services/youtubeMarketing';
import {
    changeIdentity, completeBrand, completeCollab, dropMerch, enableMemberships, goLive, identityTuning,
    MERCH, PERSONAL_COSTS, personalCollab, publishUpload, raidStreamer, reactToVideo, resolveLeak,
    strikeCount, toggleSave, UPLOAD_PLANS,
} from './actions';
import { Av, formatCompact, formatMoney, Gauge, Spark, Thumb } from './bits';
import { useYt } from './state';
import { createFittedThumbnailBlob, Face, MAX_THUMBNAIL_SOURCE_SIZE, ThumbnailFitMode } from './thumb';

const MUSIC_TYPES: YoutubeVideoType[] = ['MUSIC_VIDEO', 'JUKEBOX', 'LYRIC_VIDEO'];
const LIVE_TYPES: YoutubeVideoType[] = ['PREMIERE_LIVE'];
const PROJECT_TYPES = MARKETING_TYPES.filter(type => !MUSIC_TYPES.includes(type) && !LIVE_TYPES.includes(type));
const IDENTITIES: YoutubeCreatorIdentity[] = ['ACTOR_VLOGGER', 'CHAOS_CREATOR', 'PRESTIGE_FILMMAKER', 'LIFESTYLE_ICON', 'CONTROVERSY_MAGNET'];
const PLANS: YoutubeUploadPlan[] = ['SAFE', 'VIRAL_BAIT', 'BTS', 'PROJECT_PROMO', 'SPONSOR_HEAVY'];
const LANGS = ['Hindi', 'English', 'Tamil', 'Telugu', 'Spanish', 'Arabic'];

const Card: React.FC<{ video: YoutubeVideo; onOpen: (id: string) => void }> = ({ video, onOpen }) => (
    <button type="button" className="vc" onClick={() => onOpen(video.id)} data-yt-video={video.id}>
        <Face video={video} badge={video.isPlayer ? 'YOURS' : undefined} />
        <div className="vmeta">
            <Av kind={video.isPlayer ? 'me' : 'letter'} label={video.authorName} size={36} />
            <div>
                <div className="t">{video.title}</div>
                <div className="s">{video.authorName} · {formatCompact(video.views)} views</div>
            </div>
        </div>
    </button>
);

const projectTitle = (api: ReturnType<typeof useYt>, id?: string) =>
    api.projects.find(item => item.id === id)?.projectDetails?.title || api.projects[0]?.projectDetails?.title || '';

export const HomeScreen: React.FC = () => {
    const api = useYt();
    const [chip, setChip] = useState('All');
    const q = api.query.trim().toLowerCase();
    const pool = api.videos.filter(video => !q || `${video.title} ${video.authorName}`.toLowerCase().includes(q));
    const filtered = pool.filter(video => {
        if (chip === 'Trailers') return /TRAILER|TEASER|POSTER/.test(video.type);
        if (chip === 'Music') return MUSIC_TYPES.includes(video.type) || video.type === 'COVER';
        if (chip === 'From set') return !!video.projectId || video.isPlayer;
        if (chip === 'Live') return video.type === 'PREMIERE_LIVE';
        return true;
    });
    const hero = filtered[0] || pool[0];
    const project = api.projects[0];
    const phase = project ? readPhase(api.player, project) : null;
    const campaign = project ? ensureCampaign(api.channel, project.id) : null;
    const weeks = phase?.releaseWeekAbs != null ? Math.max(0, phase.releaseWeekAbs - api.absWeek) : null;
    const done = campaign?.drops.filter(drop => drop.status === 'RELEASED').length || 0;
    const rivals = api.videos.filter(video => !video.isPlayer).slice(0, 3);
    const share = trailerWarShare(hero?.views || 1, rivals.map(video => video.views));
    const shorts = api.videos.filter(video => video.isShort || video.type === 'SHORT').slice(0, 6);
    const live = liveCreators(api.absWeek, 36).filter(creator => creator.country === 'India').slice(0, 4);

    return (
        <div>
            <div className="chips">
                {['All', 'Trailers', 'Music', 'From set', 'Live'].map(item => (
                    <button key={item} className={`chip${chip === item ? ' on' : ''}`} onClick={() => setChip(item)}>{item}</button>
                ))}
            </div>
            {hero && (
                <div className="hero">
                    <button type="button" className="bill" onClick={() => api.openVideo(hero.id)} style={{ textAlign: 'left', color: 'inherit' }}>
                        <div className={`bg ${hero.thumbnailColor || 'poster-hero'}`} style={{ position: 'absolute', inset: 0 }} />
                        <div className="thgrad" />
                        <div className="stats">
                            <span className="pill red">TRENDING</span>
                            <span className="glass mono">{formatCompact(hero.views)} views</span>
                            {hero.dubCount ? <span className="glass">{hero.dubCount} dubs</span> : null}
                        </div>
                        <div className="in">
                            <span className="pill gold">{typeLabel(hero.type)}</span>
                            <div className="ttl">{hero.title}<span>{hero.authorName}</span></div>
                            <div className="row" style={{ marginTop: 14 }}>
                                <span className="btn red">Watch</span>
                                <span className="btn ghost">Save</span>
                            </div>
                        </div>
                    </button>
                    <div className="card pad">
                        <div className="lbl">Release radar</div>
                        <div className="h2" style={{ marginTop: 8 }}>{project?.projectDetails?.title || 'No film in production'}</div>
                        <div className="cd">
                            <div><b className="mono">{weeks ?? '—'}</b><small>WEEKS</small></div>
                            <div><b className="mono">{done}/18</b><small>DROPS</small></div>
                            <div><b className="mono">{campaign ? openingMultiplier(campaign.campaignHype).toFixed(2) : '1.00'}×</b><small>OPENING</small></div>
                            <div><b className="mono">{Math.round(share * 100)}%</b><small>YT SHARE</small></div>
                        </div>
                        <div className="lbl" style={{ marginTop: 16 }}>Competing this week</div>
                        {rivals.map(video => (
                            <button key={video.id} className="between" style={{ width: '100%', marginTop: 8 }} onClick={() => api.openVideo(video.id)}>
                                <span style={{ textAlign: 'left' }}>{video.title}</span>
                                <span className="dim mono">{formatCompact(video.views)}</span>
                            </button>
                        ))}
                        {live.length > 0 && <div className="mu" style={{ marginTop: 12 }}>{live.length} Indian streamers are live and can raid this trailer.</div>}
                    </div>
                </div>
            )}
            <section className="sect">
                <div className="between"><div className="h2">From your projects</div><button className="btn sm" onClick={() => api.go('hub')}>Hub</button></div>
                <div className="g4" style={{ marginTop: 12 }}>
                    {(api.videos.filter(video => video.isPlayer || video.projectId).slice(0, 4)).map(video => (
                        <Card key={video.id} video={video} onOpen={api.openVideo} />
                    ))}
                    {api.videos.filter(video => video.isPlayer || video.projectId).length === 0 && (
                        <div className="card pad mu">The channel starts at 0 subscribers. Create a vlog or open the Marketing Hub once a film is greenlit.</div>
                    )}
                </div>
            </section>
            <section className="sect">
                <div className="between"><div className="h2">Shorts</div><button className="btn sm" onClick={() => api.go('shorts')}>Open</button></div>
                <div className="g6" style={{ marginTop: 12 }}>
                    {(shorts.length ? shorts : api.videos.slice(0, 4)).map(video => (
                        <button key={video.id} className="shortc" onClick={() => api.openVideo(video.id)}>
                            <Thumb tone={video.thumbnailColor || 'poster-short'} ratio="9/15" badge="SHORT" />
                            <div className="tt">{video.title}</div>
                        </button>
                    ))}
                </div>
            </section>
            <section className="sect">
                <div className="h2">Recommended</div>
                <div className="g4" style={{ marginTop: 12 }}>
                    {filtered.slice(1, 9).map(video => <Card key={video.id} video={video} onOpen={api.openVideo} />)}
                </div>
            </section>
        </div>
    );
};

export const WatchScreen: React.FC = () => {
    const api = useYt();
    const video = api.videos.find(item => item.id === api.watchId) || api.videos[0];
    const [filter, setFilter] = useState('All');
    const [comments, setComments] = useState<string[]>([]);
    const [playing, setPlaying] = useState(true);
    const reaction = (api.player.flags?.youtubeVideoReactions || {})[video?.id || ''] as string | undefined;
    const project = video?.projectId ? api.projects.find(item => item.id === video.projectId) : api.projects[0];
    const campaign = project ? ensureCampaign(api.channel, project.id) : null;
    const hype = video?.hype ?? campaign?.campaignHype ?? 50;
    const sentiment = video?.sentiment || [62, 24, 14];
    const upNext = api.videos.filter(item => item.id !== video?.id && (filter === 'All' || (filter === 'Rivals' ? !item.isPlayer : item.projectId === project?.id))).slice(0, 6);

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
    const likes = video.likes + (reaction === 'LIKE' ? 1 : 0);
    const dislikes = Math.floor(video.views * 0.006) + (reaction === 'DISLIKE' ? 1 : 0);

    return (
        <div className="wgrid">
            <div>
                <button className="backfloat show-m" onClick={() => api.go('home')}>Back</button>
                <div className="player" onClick={() => setPlaying(value => !value)}>
                    <Face video={video} badge={playing ? 'PLAYING' : 'PAUSED'} />
                    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
                        <div className="between"><span className="pill">CC</span><span className="pill">1080p</span><span className="pill">{video.dubCount || 1} dub</span></div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                            {[8, 22, 41, 63, 88].map(tick => <i key={tick} style={{ flex: 1, height: 4, borderRadius: 4, background: tick < 41 ? 'var(--red)' : 'rgba(255,255,255,.3)' }} />)}
                        </div>
                    </div>
                </div>
                <h1 className="h2" style={{ fontSize: 22, marginTop: 14 }}>{video.title}</h1>
                <div className="between" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                    <div className="row">
                        <Av kind={video.channelKind === 'empirePlus' ? 'eplus' : video.channelKind === 'studio' ? 'studio' : video.isPlayer ? 'me' : 'letter'} label={video.authorName} />
                        <div><b>{video.authorName}</b><div className="dim">{formatCompact(api.channel.subscribers)} subs</div></div>
                        <button className="btn white sm">Subscribe</button>
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
                    {upNext.map(item => <Card key={item.id} video={item} onOpen={api.openVideo} />)}
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
            <div className="between">
                <div>
                    <div className="lbl">Marketing hub</div>
                    <div className="h1">{project.projectDetails.title}</div>
                </div>
                <div className="row">
                    <Gauge value={campaign.campaignHype} label="HYPE" />
                    <div><div className="lbl">Views</div><b className="mono">{formatCompact(views)}</b><div className="lbl">Opening {openingMultiplier(campaign.campaignHype).toFixed(2)}×</div></div>
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
                <div className="card pad"><div className="lbl">Gaps</div><div className="h2">{slots.filter(type => !campaign.drops.some(drop => drop.type === type) && slotUnlocked(type, phase)).length} open</div><div className="mu">Phase {phase.gate}.</div></div>
                <div className="card pad"><div className="lbl">Rival clash</div><div className="h2">Watch Trending</div><div className="mu">Trailer war uses hype^1.5.</div></div>
            </div>
            <div className="slots" style={{ marginTop: 16 }}>
                {slots.map(type => {
                    const drop = campaign.drops.find(item => item.type === type);
                    const open = slotUnlocked(type, phase);
                    const status = drop?.status || (open ? 'READY' : 'LOCKED');
                    return (
                        <button key={type} className={`slot${open ? '' : ' lock'}`} disabled={!open || !!drop} onClick={() => api.armUpload(type, project.id)}>
                            <div className="between"><b>{typeLabel(type)}</b><span className={`pill ${status === 'RELEASED' ? 'mint' : status === 'SCHEDULED' ? 'amb' : status === 'LOCKED' ? '' : 'red'}`}>{status}</span></div>
                            <div className="dim" style={{ marginTop: 6 }}>{formatMoney(dropCost(type, project.projectDetails?.estimatedBudget || 0))} · {dropEnergy(type)}E</div>
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
                <div>
                    <div className="seg">
                        {(['Personal', 'Project', 'Music', 'Live'] as const).map(item => <button key={item} className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>)}
                    </div>
                    <div className="slots" style={{ marginTop: 14 }}>
                        {types.map(item => {
                            const locked = project && phase ? !slotUnlocked(item, phase) && isMarketingType(item) && item !== 'SHORT' : false;
                            return (
                                <button key={item} className={`slot${type === item ? '' : ''}${locked ? ' lock' : ''}`} onClick={() => { if (!locked) setType(item); }} style={type === item ? { borderColor: 'var(--red)' } : undefined}>
                                    <b>{typeLabel(item)}</b>
                                    <div className="dim">{locked ? `Locked until ${phase?.gate}` : `${formatMoney(isMarketingType(item) ? dropCost(item, project?.projectDetails?.estimatedBudget || 0) : (PERSONAL_COSTS[item]?.cost || 0))} · ${isMarketingType(item) ? dropEnergy(item) : (PERSONAL_COSTS[item]?.energy || 12)}E`}</div>
                                </button>
                            );
                        })}
                    </div>
                    {tab === 'Live' && <button className="btn" style={{ marginTop: 12 }} onClick={() => api.go('live')}>Open the live desk</button>}
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
                        <div>Hype weight on this slot · cost {formatMoney(cost)} · {energy} energy</div>
                        <div className="mu">24h views settle on the next week tick. Ads stay at a flat ${FLAT_RPM.toFixed(2)} RPM.</div>
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
                    <div className="dim">Ads use the flat ${FLAT_RPM.toFixed(2)} RPM. Members, super chat, merch, and sponsors stack on top.</div>
                </div>
                <div className="card pad">
                    <div className="h2">Audience</div>
                    {Object.entries(COUNTRY_RPM).map(([code, rpm]) => (
                        <div key={code} className="between" style={{ marginTop: 6 }}><span>{code}</span><span className="mono dim">${rpm.toFixed(2)} table · pay ${FLAT_RPM.toFixed(2)}</span></div>
                    ))}
                </div>
            </div>
            <div className="between" style={{ marginTop: 16 }}>
                <div className="h2">Top content</div>
                <div className="seg">{['Videos', 'Shorts', 'Live'].map(item => <button key={item} className={content === item ? 'on' : ''} onClick={() => setContent(item)}>{item}</button>)}</div>
            </div>
            <div className="g4" style={{ marginTop: 12 }}>{videos.slice(0, 4).map(video => <Card key={video.id} video={video} onOpen={api.openVideo} />)}</div>
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
            <div className="bill" style={{ height: 180 }}>
                <div className="bg poster-hero" style={{ position: 'absolute', inset: 0 }} />
            </div>
            <div className="between" style={{ marginTop: -28, position: 'relative' }}>
                <div className="row">
                    <Av kind={api.kind === 'empirePlus' ? 'eplus' : api.kind === 'studio' ? 'studio' : 'me'} label={api.player.name} size={72} />
                    <div>
                        <div className="h2">{api.kind === 'personal' ? api.player.name : handle}</div>
                        <div className="dim">{handle} · {formatCompact(subs)} subs · {videos.length} videos · {formatCompact(api.channel.members)} members</div>
                    </div>
                </div>
                <div className="row">
                    <span className="pill gold">{playTier(subs, official ? official.totalViews : api.channel.totalChannelViews)}</span>
                    <button className="btn white sm">Subscribe</button>
                    <button className="btn sm" onClick={() => api.go('money')}>Join</button>
                    <button className="btn sm" onClick={() => setTab('Store')}>Store</button>
                </div>
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
                <div className="wgrid" style={{ marginTop: 16 }}>
                    <Card video={featured} onOpen={api.openVideo} />
                    <div className="grid">{shown.slice(1, 5).map(video => <Card key={video.id} video={video} onOpen={api.openVideo} />)}</div>
                </div>
            )}
            {tab === 'Community' && <div className="card pad" style={{ marginTop: 16 }}>{api.player.logs.slice(0, 5).map(log => <div key={log.message} className="mu" style={{ marginTop: 6 }}>{log.message}</div>)}</div>}
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
        const rows = api.videos.filter(video => {
            if (tab === 'Trailers') return /TRAILER|TEASER/.test(video.type);
            if (tab === 'Music') return MUSIC_TYPES.includes(video.type) || video.type === 'COVER';
            if (tab === 'Films & Series') return !!video.projectId || /TRAILER|CLIP|REVIEW/.test(video.type);
            if (tab === 'Gaming') return /game|raid|react/i.test(`${video.title} ${video.type}`);
            return true;
        });
        return [...rows].sort((a, b) => b.views - a.views).slice(0, 10);
    }, [api.videos, tab]);
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
        const phase = project ? readPhase(api.player, project) : null;
        if (project && phase && slotUnlocked('REACTION_COLLAB', phase)) {
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
                        <div style={{ flex: 1 }}><b>{video.title}</b><div className="dim">{video.authorName} · {video.isPlayer ? 'Your project' : 'Rival'}</div></div>
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
    const song = songs.find(item => item.id === current) || songs[0];
    const bonus = musicOpeningBonus(campaign?.songStreams || song?.plays || 0);

    return (
        <div>
            <div className="wgrid">
                <div className="card" style={{ overflow: 'hidden' }}>
                    <Thumb tone="poster-song" ratio="1/1" title={song?.title} sub="JUKEBOX" />
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
                            <Thumb tone="poster-song" ratio="1/1" />
                            <div style={{ flex: 1, textAlign: 'left' }}><b>{item.title}</b><div className="dim">{item.singer} · {item.status} · {item.duration}</div></div>
                            <span className="mono">{formatCompact(item.plays)}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="h2" style={{ marginTop: 18 }}>Top songs</div>
            <div className="chips" style={{ marginTop: 8 }}><span className="chip on">India</span><span className="chip">Global</span><span className="chip">US</span></div>
            <div className="card pad" style={{ marginTop: 10 }}>
                {api.videos.filter(video => MUSIC_TYPES.includes(video.type) || video.type === 'COVER').slice(0, 6).map((video, index) => (
                    <button key={video.id} className="between" style={{ width: '100%', marginTop: 8 }} onClick={() => api.openVideo(video.id)}>
                        <span>{index + 1}. {video.title}</span><span className="dim">{video.authorName}</span>
                    </button>
                ))}
                {api.videos.filter(video => MUSIC_TYPES.includes(video.type) || video.type === 'COVER').length === 0 && <div className="mu">Chart fills when a music video, lyric video, or cover is out.</div>}
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

    return (
        <div className="wgrid">
            <div className="card pad show-m" style={{ display: undefined }}>
                <div className="lbl">This Short</div>
                <div className="mono">{formatCompact(video.views)} views</div>
                <div className="dim">Viewed vs swiped 71% · subs +{Math.floor(video.views / 240)} · RPM ${SHORTS_RPM.toFixed(2)}</div>
                <Spark values={video.weeklyHistory?.length ? video.weeklyHistory : [4, 8, 6, 12, 9, 14, 11]} />
                <div className="mint">Remixes drive the title track +{formatCompact(remixes * 40)} streams.</div>
            </div>
            <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative' }}>
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
                <div className="card pad hide-m">
                    <div className="lbl">This Short</div>
                    <div className="mono">{formatCompact(video.views)} views</div>
                    <div className="dim">Viewed vs swiped 71% · subs +{Math.floor(video.views / 240)} · RPM ${SHORTS_RPM.toFixed(2)}</div>
                    <Spark values={video.weeklyHistory?.length ? video.weeklyHistory : [4, 8, 6, 12, 9, 14, 11]} />
                    <div className="mint">Remixes drive the title track +{formatCompact(remixes * 40)} streams.</div>
                </div>
                <div className="card pad" style={{ marginTop: 12 }}>
                    <div className="h2">Sound usage</div>
                    <div>{formatCompact(remixes)} remixes</div>
                    <button className="btn sm" style={{ marginTop: 8 }} onClick={() => api.armUpload('SHORT', video.projectId)}>Use this sound</button>
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
                    <Thumb tone="poster-live" badge="LIVE" badgeC="red" title={current?.name || api.player.name} sub={ended ? 'ENDED' : 'ON AIR'} ratio="16/9" />
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
                    {chat.map((line, index) => <div key={line} style={{ marginTop: 8 }}><b className={index === 0 ? 'gold' : ''}>{index === 0 ? 'Member' : `chat${index}`}</b> <span className="mu">{line}</span></div>)}
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
    const monetized = api.channel.isMonetized || (api.channel.subscribers >= YOUTUBE_MONETIZATION_SUBS && api.channel.totalChannelViews >= YOUTUBE_MONETIZATION_VIEWS);

    return (
        <div>
            <div className="h1">Earn</div>
            <div className="dim">Monetization at {YOUTUBE_MONETIZATION_SUBS.toLocaleString()} subs and {YOUTUBE_MONETIZATION_VIEWS.toLocaleString()} views. Ads pay a flat ${FLAT_RPM.toFixed(2)} RPM. {monetized ? 'This channel is monetized.' : 'Not monetized yet.'}</div>
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
                    {Object.entries(COUNTRY_RPM).slice(0, 5).map(([code, rpm]) => <div key={code} className="between"><span>{code}</span><span className="dim mono">table ${rpm.toFixed(2)}</span></div>)}
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

export const screenFor = (screen: string) => {
    if (screen === 'watch') return <WatchScreen />;
    if (screen === 'hub') return <HubScreen />;
    if (screen === 'upload') return <UploadScreen />;
    if (screen === 'studio') return <StudioScreen />;
    if (screen === 'channel') return <ChannelScreen />;
    if (screen === 'trending') return <TrendingScreen />;
    if (screen === 'music') return <MusicScreen />;
    if (screen === 'shorts') return <ShortsScreen />;
    if (screen === 'live') return <LiveScreen />;
    if (screen === 'money') return <MoneyScreen />;
    return <HomeScreen />;
};
