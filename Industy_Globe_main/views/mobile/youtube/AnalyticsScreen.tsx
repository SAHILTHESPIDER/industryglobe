import React, { useEffect, useMemo, useState } from 'react';
import { YoutubeDaypart, YoutubePostTone } from '../../../types';
import { DAYPARTS, PROMO_COUNTRIES, YPP_SHORTS_VIEWS, YPP_SUBS, YPP_WATCH_HOURS, collabBoard, collabFit, readAnalytics } from '../../../services/youtubePartner';
import { formatCompact, formatMoney } from './bits';
import { filmWith, pickDaypart, premiereProject, promoteVideo, publishCommunity } from './partnerActions';
import { useYt } from './state';

const hours = (value: number) => value < 100 ? value.toFixed(1) : Math.round(value).toLocaleString();

export const AnalyticsScreen: React.FC = () => {
    const api = useYt();
    const snap = useMemo(() => readAnalytics(api.channel, api.kind, api.absWeek), [api.channel, api.kind, api.absWeek]);
    const board = useMemo(() => collabBoard(api.player).slice(0, 6), [api.player]);
    const ownVideos = (api.kind === 'studio'
        ? api.channel.officialChannels?.studio?.videos || []
        : api.kind === 'empirePlus'
            ? api.channel.officialChannels?.empirePlus?.videos || []
            : api.channel.videos
    ).filter(video => (video.channelKind || api.kind) === api.kind);
    const [post, setPost] = useState('');
    const [budget, setBudget] = useState(2500);
    const [weeks, setWeeks] = useState(2);
    const [countries, setCountries] = useState<string[]>(['US', 'IN']);
    const [videoId, setVideoId] = useState(ownVideos[0]?.id || '');
    const videoKey = ownVideos.map(video => video.id).join('|');
    useEffect(() => {
        if (!ownVideos.some(video => video.id === videoId)) setVideoId(ownVideos[0]?.id || '');
    }, [videoKey, videoId, ownVideos]);
    const selected = ownVideos.find(video => video.id === videoId);
    const payKind = selected?.channelKind || api.kind;
    const wallet = payKind === 'studio' ? 'studio treasury' : payKind === 'empirePlus' ? 'Empire+ treasury' : 'personal cash';
    const project = api.projects.find(item => item.id === api.projectId) || api.projects[0];
    const toggleCountry = (code: string) => setCountries(list => list.includes(code) ? list.filter(item => item !== code) : [...list, code]);

    return (
        <div>
            <div className="h1">Analytics</div>
            <div className="dim">CTR, retention, where the audience sits, and what the ads actually pay. Money lands in {wallet}.</div>
            <div className="g6" style={{ marginTop: 14 }}>
                {[
                    ['CTR', `${(snap.ctr * 100).toFixed(1)}%`],
                    ['Retention', `${Math.round(snap.retention * 100)}%`],
                    ['Watch hours', hours(snap.watchHours)],
                    ['Ad CPM', `$${snap.blendedCpm.toFixed(2)}`],
                    ['Ads this week', formatMoney(snap.adRevenueWeek)],
                    ['Lifetime ads', formatMoney(snap.lifetimeEarnings)],
                ].map(([label, value]) => (
                    <div key={label} className="card pad kpi"><div className="lbl">{label}</div><div className="v">{value}</div></div>
                ))}
            </div>

            <div className="wgrid" style={{ marginTop: 16 }}>
                <div className="card pad">
                    <div className="h2">Partner program</div>
                    <div className="dim">{snap.monetized ? 'Ads are on for this channel.' : `Ads unlock at ${YPP_SUBS.toLocaleString()} subs and ${YPP_WATCH_HOURS.toLocaleString()} watch hours.`} {snap.adsPaused ? 'A strike has ads paused.' : ''}</div>
                    <div className="between" style={{ marginTop: 8 }}><span>Subscribers</span><span className="mono">{formatCompact(snap.subscribers)} / {formatCompact(YPP_SUBS)}</span></div>
                    <div className="bar" style={{ height: 6, background: '#000', borderRadius: 6, marginTop: 4 }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, (snap.subscribers / YPP_SUBS) * 100)}%`, background: 'var(--mint)' }} /></div>
                    <div className="between" style={{ marginTop: 8 }}><span>Watch hours, 52 weeks</span><span className="mono">{hours(snap.watchHours)} / {YPP_WATCH_HOURS.toLocaleString()}</span></div>
                    <div className="bar" style={{ height: 6, background: '#000', borderRadius: 6, marginTop: 4 }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, (snap.watchHours / YPP_WATCH_HOURS) * 100)}%`, background: 'var(--gold)' }} /></div>
                    <div className="dim" style={{ marginTop: 8 }}>Shorts can also unlock it: {formatCompact(snap.shortsViews)} / {formatCompact(YPP_SHORTS_VIEWS)} Shorts views, with the same 1,000 subs. Shorts pay about 4% of long-form CPM and add very few hours.</div>
                    <div className="dim">All-time watch hours {hours(snap.lifetimeHours)}.</div>
                </div>
                <div className="card pad">
                    <div className="h2">Audience</div>
                    {snap.audience.map(row => (
                        <div key={row.code} style={{ marginTop: 8 }}>
                            <div className="between"><span>{row.code}</span><span className="mono dim">{Math.round(row.share * 100)}% · ${row.cpm.toFixed(2)} CPM</span></div>
                            <div className="bar" style={{ height: 6, background: '#000', borderRadius: 6, marginTop: 4 }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, row.share * 100)}%`, background: 'var(--cy)' }} /></div>
                        </div>
                    ))}
                    <div className="dim" style={{ marginTop: 10 }}>{snap.primeNote}</div>
                    <div style={{ marginTop: 8 }}><b>Best upload window</b><div className="mono">{snap.best ? `${snap.best.day} · ${snap.best.daypart.toLowerCase()} · ${formatCompact(snap.best.views)} avg views` : 'Upload a few videos and this fills in.'}</div></div>
                    <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                        {DAYPARTS.map(part => (
                            <button key={part} className={`btn sm${api.channel.partner?.preferredDaypart === part ? ' red' : ''}`} onClick={() => api.apply(pickDaypart(api.player, part as YoutubeDaypart))}>{part.toLowerCase()}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="wgrid" style={{ marginTop: 16 }}>
                <div className="card pad">
                    <div className="h2">Fan mood · {snap.moodLabel}</div>
                    <div className="dim">Mood {Math.round(snap.fanMood)} · trust {Math.round(snap.trust)} · controversy {Math.round(snap.controversy)}</div>
                    <div className="dim">Sponsor fatigue {Math.round(snap.sponsorFatigue)} · ad fatigue {Math.round(snap.adFatigue)}. Neither one blocks the next deal. They just pay worse and convert worse.</div>
                    {(api.channel.partner?.trends || []).slice(0, 3).map(trend => (
                        <div key={trend.id} style={{ marginTop: 10 }}><b>{trend.title}</b><div className="dim">{trend.detail} · {trend.weeksLeft}w left</div></div>
                    ))}
                    <div className="h2" style={{ marginTop: 14 }}>Comments</div>
                    {ownVideos.slice(0, 2).flatMap(video => (video.comments || []).slice(0, 2).map((line, index) => (
                        <div key={`${video.id}-${index}`} style={{ marginTop: 8 }}><b>{video.authorName}</b> <span className="mu">{line}</span></div>
                    )))}
                    {ownVideos.every(video => (video.comments || []).length === 0) && <div className="dim">No comments yet.</div>}
                    {(api.channel.partner?.posts || []).slice(0, 2).map(item => (
                        <div key={item.id} style={{ marginTop: 10 }}><b>{item.tone.toLowerCase()}</b> <span className="mu">{item.text}</span><div className="dim">{formatCompact(item.reach)} reached · mood {item.moodDelta >= 0 ? '+' : ''}{item.moodDelta}</div></div>
                    ))}
                    <textarea value={post} onChange={event => setPost(event.target.value)} placeholder="Community post" style={{ width: '100%', marginTop: 10, minHeight: 64, background: '#000', border: '1px solid var(--line2)', borderRadius: 8, padding: 8 }} />
                    <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                        {(['WARM', 'HYPE', 'APOLOGY', 'CALLOUT'] as YoutubePostTone[]).map(tone => (
                            <button key={tone} className="btn sm" onClick={() => { api.apply(publishCommunity(api.player, post, tone)); setPost(''); }}>{tone.toLowerCase()}</button>
                        ))}
                    </div>
                </div>
                <div className="card pad">
                    <div className="h2">Collab</div>
                    <div className="dim">Both audiences cross over. A bad fit or a controversial partner causes backlash. Nothing here is locked.</div>
                    {board.map(target => {
                        const fit = collabFit(api.player, target);
                        return (
                            <div key={target.id} className="between" style={{ marginTop: 8, gap: 8 }}>
                                <span><b>{target.name}</b><div className="dim">{target.kind === 'STUDIO' ? 'Studio' : target.niche} · fit {fit}{fit < 42 || target.heat >= 66 ? ' · backlash risk' : ''}</div></span>
                                <button className="btn sm" onClick={() => api.apply(filmWith(api.player, target.id))}>Film</button>
                            </div>
                        );
                    })}
                    <div className="h2" style={{ marginTop: 16 }}>Premiere and live</div>
                    <div className="dim">{project ? project.projectDetails?.title || project.name : 'No linked project yet.'} Chat hype moves the campaign, and the campaign moves opening weekend.</div>
                    <div className="row" style={{ marginTop: 8 }}>
                        <button className="btn sm red" disabled={!project} onClick={() => project && api.apply(premiereProject(api.player, project.id, 'PREMIERE'))}>Premiere</button>
                        <button className="btn sm" disabled={!project} onClick={() => project && api.apply(premiereProject(api.player, project.id, 'LIVE'))}>Go live</button>
                    </div>
                </div>
            </div>

            <div className="card pad" style={{ marginTop: 16 }}>
                <div className="h2">Paid promotion</div>
                <div className="dim">Charged to {wallet} up front. A bigger buy returns less per dollar. A weak video converts poorly and tires the audience of ads.</div>
                <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                    <select value={videoId} onChange={event => setVideoId(event.target.value)} style={{ background: '#000', border: '1px solid var(--line2)', borderRadius: 8, padding: '6px 8px' }}>
                        {ownVideos.slice(0, 12).map(video => <option key={video.id} value={video.id}>{video.title}</option>)}
                    </select>
                    {[500, 2500, 10000, 50000].map(amount => (
                        <button key={amount} className={`btn sm${budget === amount ? ' red' : ''}`} onClick={() => setBudget(amount)}>{formatMoney(amount)}</button>
                    ))}
                    <input type="number" min={100} value={budget} onChange={event => setBudget(Number(event.target.value))} style={{ width: 120, background: '#000', border: '1px solid var(--line2)', borderRadius: 8, padding: '6px 8px' }} />
                    {[1, 2, 4].map(span => (
                        <button key={span} className={`btn sm${weeks === span ? ' red' : ''}`} onClick={() => setWeeks(span)}>{span}w</button>
                    ))}
                </div>
                <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                    {PROMO_COUNTRIES.map(code => (
                        <button key={code} className={`btn sm${countries.includes(code) ? ' white' : ''}`} onClick={() => toggleCountry(code)}>{code}</button>
                    ))}
                    <button className="btn sm red" disabled={!selected} onClick={() => selected && api.apply(promoteVideo(api.player, selected.id, budget, countries, weeks))}>Buy ads</button>
                </div>
                {(api.channel.partner?.promotions || []).map(promo => (
                    <div key={promo.id} className="dim" style={{ marginTop: 8 }}>{formatMoney(promo.budget)} across {promo.countries.join(', ')} · {promo.weeksLeft}w left · {Math.round(promo.efficiency * 100)}% efficiency{promo.weak ? ' · weak video, poor conversion' : ''}</div>
                ))}
            </div>
        </div>
    );
};
