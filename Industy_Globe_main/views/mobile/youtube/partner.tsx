import React, { useEffect, useState } from 'react';
import {
    PARTNER_SUBS, PARTNER_WATCH_HOURS, activePartner, analyticsFor, postCommunity, premiereProject, promoteVideo, quotePromotion,
} from '../../../services/youtubePartner';
import { formatCompact, formatMoney } from './bits';
import { useYt } from './state';

const MARKETS = ['IN', 'US', 'UK', 'AE', 'CA'];

export const PartnerStrip = () => {
    const api = useYt();
    const board = activePartner(api.channel, api.kind);
    const hours = board.hours;
    const ready = board.monetized;
    return (
        <div className="card pad" data-yt-partner style={{ marginTop: 12 }}>
            <div className="between">
                <div>
                    <div className="lbl">YouTube Partner Program</div>
                    <b>{ready ? 'Ads are on' : 'Ads are locked'}</b>
                </div>
                <div className="mono">{formatCompact(hours)} / {formatCompact(PARTNER_WATCH_HOURS)} h</div>
            </div>
            <div className="dim">Needs {PARTNER_SUBS.toLocaleString()} subscribers and {PARTNER_WATCH_HOURS.toLocaleString()} watch hours. Shorts move fast and pay little. Long videos build the hours. CPM follows the country mix.</div>
            <div className="bar" style={{ height: 6, background: '#000', borderRadius: 6, marginTop: 8 }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, (hours / PARTNER_WATCH_HOURS) * 100)}%`, background: 'var(--gold)' }} /></div>
        </div>
    );
};

export const AnalyticsScreen = () => {
    const api = useYt();
    const board = activePartner(api.channel, api.kind);
    const videos = board.videos;
    const stats = analyticsFor({
        ...api.channel,
        subscribers: board.subs,
        lifetimeEarnings: board.revenue,
        videos,
        watchHours: board.hours,
        isMonetized: board.monetized,
    }, videos);
    const [budget, setBudget] = useState(1000);
    const [weeks, setWeeks] = useState(1);
    const [countries, setCountries] = useState<string[]>(['IN']);
    const [videoId, setVideoId] = useState(videos[0]?.id || '');
    const videoKey = videos.map(item => item.id).join('|');
    useEffect(() => {
        if (!videos.some(item => item.id === videoId)) setVideoId(videos[0]?.id || '');
    }, [videoKey]);
    const [text, setText] = useState('');
    const picked = videos.find(video => video.id === videoId);
    const quote = quotePromotion(budget, weeks, countries, picked?.qualityScore || 50);

    return (
        <div data-yt-analytics>
            <div className="h1">Analytics</div>
            <div className="dim">The active channel. Ads pay the {api.kind === 'personal' ? 'personal' : api.kind === 'studio' ? 'studio' : 'Empire+'} wallet.</div>
            <PartnerStrip />
            <div className="g6" style={{ marginTop: 14 }}>
                {[
                    ['CTR', `${(stats.ctr * 100).toFixed(1)}%`],
                    ['Retention', `${Math.round(stats.retention * 100)}%`],
                    ['Watch hours', formatCompact(stats.watchHours)],
                    ['RPM', `$${stats.rpm.toFixed(2)}`],
                    ['Revenue', formatMoney(stats.revenue)],
                    ['Best slot', stats.bestSlot.toLowerCase()],
                ].map(([label, value]) => (
                    <div key={label} className="card pad kpi"><div className="lbl">{label}</div><div className="v">{value}</div></div>
                ))}
            </div>
            <div className="wgrid" style={{ marginTop: 16 }}>
                <div className="card pad">
                    <div className="h2">Audience</div>
                    {stats.countries.map(row => (
                        <div key={row.code} className="between" style={{ marginTop: 6 }}><span>{row.code}</span><span className="mono">{row.share.toFixed(0)}%</span></div>
                    ))}
                </div>
                <div className="card pad">
                    <div className="h2">Upload time</div>
                    <div className="dim">Evening still wins unless your own videos say otherwise. New uploads use the slot you pick.</div>
                    <div className="row" style={{ marginTop: 8 }}>
                        {(['MORNING', 'EVENING', 'LATE'] as const).map(slot => (
                            <button key={slot} className={`btn sm${(api.channel.defaultUploadSlot || 'EVENING') === slot ? ' red' : ''}`} onClick={() => api.update({ ...api.player, youtube: { ...api.channel, defaultUploadSlot: slot } })}>{slot.toLowerCase()}</button>
                        ))}
                    </div>
                    <div className="dim" style={{ marginTop: 8 }}>{Object.entries(stats.slotViews).map(([slot, views]) => `${slot.toLowerCase()} ${formatCompact(views)}`).join(' · ')}</div>
                </div>
            </div>
            <div className="card pad" style={{ marginTop: 16 }} data-yt-promote>
                <div className="h2">Promote</div>
                <div className="dim">{quote.note}</div>
                <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                    <select className="field" value={videoId} onChange={event => setVideoId(event.target.value)}>
                        {videos.slice(0, 12).map(video => <option key={video.id} value={video.id}>{video.title}</option>)}
                    </select>
                    <label className="dim">Budget ${budget}<input className="field" type="number" min={100} step={100} value={budget} onChange={event => setBudget(Number(event.target.value))} /></label>
                    <label className="dim">Weeks {weeks}<input className="field" type="number" min={1} max={8} value={weeks} onChange={event => setWeeks(Number(event.target.value))} /></label>
                </div>
                <div className="chips" style={{ marginTop: 8 }}>
                    {MARKETS.map(code => (
                        <button key={code} className={`chip${countries.includes(code) ? ' on' : ''}`} onClick={() => setCountries(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code])}>{code}</button>
                    ))}
                </div>
                <div className="dim">Forecast {formatCompact(quote.views)} views{quote.fatigued ? ' · ad fatigue' : ''}</div>
                <button className="btn red sm" style={{ marginTop: 8 }} onClick={() => api.apply(promoteVideo(api.player, { videoId, budget, countries, weeks }))}>Buy the views</button>
                {api.error && <div className="err" style={{ marginTop: 8 }}>{api.error}</div>}
                {api.player.logs[0] && <div className="dim" style={{ marginTop: 8 }}>{api.player.logs[0].message}</div>}
            </div>
            <div className="card pad" style={{ marginTop: 16 }} data-yt-community>
                <div className="h2">Community</div>
                <div className="dim">Fan mood {Math.round(api.channel.fanMood ?? 55)}. A hot take can trend. It does not stop you posting.</div>
                <input className="field" value={text} placeholder="Say something to the people who already watch" onChange={event => setText(event.target.value)} />
                <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn sm" onClick={() => api.apply(postCommunity(api.player, text, 'WARM'))}>Warm</button>
                    <button className="btn sm" onClick={() => api.apply(postCommunity(api.player, text, 'NEWS'))}>News</button>
                    <button className="btn sm" onClick={() => api.apply(postCommunity(api.player, text, 'HEAT'))}>Stir it</button>
                    {api.projectId && <button className="btn sm red" data-yt-premiere onClick={() => api.apply(premiereProject(api.player, api.projectId!))}>Premiere</button>}
                </div>
                {(api.channel.communityPosts || []).slice(0, 4).map(post => (
                    <div key={post.id} className="mu" style={{ marginTop: 8 }}>{post.tone === 'HEAT' ? 'Heat · ' : ''}{post.text}</div>
                ))}
            </div>
        </div>
    );
};
