import React, { useId, useState } from 'react';
import { Lock } from 'lucide-react';
import { PlayButtonTier, YoutubeCeremony, YoutubeChannelKind } from '../../../types';
import { PLAY_BUTTONS, dismissCeremony, playButtonLabel } from '../../../services/youtubeAwards';
import {
    AVATAR_PRESETS, BANNER_PRESETS, EXTRA_CHANNEL_UNLOCK_PRICE, THUMB_PRESETS,
    lookFor, presetColors, saveChannelLook, unlockExtraYoutubeChannels,
} from '../../../services/youtubeCustomize';
import { creatorAudience, creatorSeeds } from '../../../services/youtubePeople';
import { findRivalChannel } from '../../../services/youtubeRivals';
import { toggleSubscription } from './actions';
import { Av, formatCompact, formatMoney } from './bits';
import { Confetti, RollNumber, SubscribeTap, useAwardHaptic } from './motion';
import { useYt } from './state';
import './features.css';

const METAL: Record<PlayButtonTier, [string, string, string, string]> = {
    SILVER: ['#f7f9fc', '#c5ced8', '#8e99a8', '#ffffff'],
    GOLD: ['#fff4c8', '#e0b03a', '#8d5e0b', '#fff9e4'],
    DIAMOND: ['#f4fbff', '#b9dcff', '#6aa4dc', '#ffffff'],
    RED_DIAMOND: ['#ffe4e8', '#e23b4c', '#7c1020', '#fff0f2'],
};

export const PlayButtonArt = ({ tier, locked = false, size = 92 }: { tier: PlayButtonTier; locked?: boolean; size?: number }) => {
    const uid = useId().replace(/:/g, '');
    const [hi, mid, deep, gloss] = METAL[tier];
    return (
        <svg className={`pb-art${locked ? ' is-locked' : ''}`} width={size} height={size * 1.18} viewBox="0 0 120 142" aria-hidden>
            <defs>
                <linearGradient id={`${uid}-m`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={gloss} />
                    <stop offset="0.45" stopColor={mid} />
                    <stop offset="1" stopColor={deep} />
                </linearGradient>
                <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                    <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <radialGradient id={`${uid}-g`} cx="30%" cy="20%" r="70%">
                    <stop offset="0" stopColor={hi} />
                    <stop offset="1" stopColor={mid} />
                </radialGradient>
            </defs>
            <rect x="8" y="10" width="104" height="120" rx="16" fill={`url(#${uid}-m)`} />
            <rect x="16" y="18" width="88" height="86" rx="12" fill="#14141b" />
            <path d="M46 40l32 20-32 20z" fill={`url(#${uid}-g)`} />
            <rect x="16" y="18" width="88" height="28" rx="12" fill={`url(#${uid}-s)`} />
            {tier === 'DIAMOND' || tier === 'RED_DIAMOND' ? <path d="M60 28l6 8h-12z" fill={tier === 'RED_DIAMOND' ? '#ff5a6a' : '#d7eeff'} /> : null}
            <text x="60" y="122" textAnchor="middle" fill="#1a1208" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">{playButtonLabel(tier).toUpperCase()}</text>
        </svg>
    );
};

export const TrophyShelf = ({ kind }: { kind?: YoutubeChannelKind }) => {
    const api = useYt();
    const board = kind || api.kind;
    const earned = new Set((api.channel.playButtons?.[board] || []).map(item => item.tier));
    return (
        <div className="pb-shelf" data-yt-trophy={board}>
            {PLAY_BUTTONS.map(row => {
                const have = earned.has(row.tier);
                const award = (api.channel.playButtons?.[board] || []).find(item => item.tier === row.tier);
                return (
                    <div key={row.tier} className={`pb-card${have ? ' on' : ''}`}>
                        <PlayButtonArt tier={row.tier} locked={!have} size={78} />
                        <b>{row.label}</b>
                        <small>{have ? `${formatCompact(award?.subscribers || row.subs)} subs` : `${formatCompact(row.subs)} subs`}</small>
                    </div>
                );
            })}
        </div>
    );
};

export const Ceremony = ({ ceremony, subs, onClose }: { ceremony: YoutubeCeremony; subs: number; onClose: () => void }) => {
    useAwardHaptic();
    return (
        <div className="pb-ceremony" data-yt-ceremony={ceremony.tier} role="dialog" aria-label={`${playButtonLabel(ceremony.tier)} Play Button`}>
            <div className="pb-ceremony-card">
                <Confetti />
                <div className="pb-shine" />
                <div className="lbl">Creator Award</div>
                <PlayButtonArt tier={ceremony.tier} size={148} />
                <h2>{playButtonLabel(ceremony.tier)} Play Button</h2>
                <p>{ceremony.name} crossed <RollNumber value={subs} /> subscribers.</p>
                <button className="btn white" onClick={onClose} data-yt-ceremony-close>Put it on the shelf</button>
            </div>
        </div>
    );
};

export const dismissOpenCeremony = (player: Parameters<typeof dismissCeremony>[0]) => dismissCeremony(player);

const fitImage = (file: File, width: number, height: number) => new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
        reject(new Error('Use an image under 12MB.'));
        return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read that image.'));
            return;
        }
        const scale = Math.max(width / image.width, height / image.height);
        const dw = image.width * scale;
        const dh = image.height * scale;
        ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
        const data = canvas.toDataURL('image/jpeg', 0.72);
        URL.revokeObjectURL(url);
        resolve(data);
    };
    image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read that image.'));
    };
    image.src = url;
});

export const CustomizeSheet = ({ onClose }: { onClose: () => void }) => {
    const api = useYt();
    const current = lookFor(api.channel, api.kind);
    const [name, setName] = useState(current.name || (api.kind === 'personal' ? api.player.name : ''));
    const [avatarPreset, setAvatar] = useState(current.avatarPreset || 'ember');
    const [bannerPreset, setBanner] = useState(current.bannerPreset || 'marquee');
    const [thumbPreset, setThumb] = useState(current.thumbPreset || 'poster-hero');
    const [avatarData, setAvatarData] = useState(current.avatarData);
    const [bannerData, setBannerData] = useState(current.bannerData);
    const [localError, setLocalError] = useState<string | null>(null);

    const save = () => {
        const result = saveChannelLook(api.player, api.kind, { name, avatarPreset, bannerPreset, thumbPreset, avatarData, bannerData });
        if (result.error) {
            setLocalError(result.error);
            return;
        }
        api.update(result.player);
        onClose();
    };

    return (
        <div className="pb-ceremony" data-yt-customize role="dialog" aria-label="Customize channel">
            <div className="pb-ceremony-card wide">
                <div className="between"><div className="h2">Customize</div><button className="btn sm" onClick={onClose}>Close</button></div>
                <label className="dim">Channel name<input className="field" value={name} maxLength={42} onChange={event => setName(event.target.value)} /></label>
                <div className="lbl">Avatar</div>
                <div className="preset-row">
                    {AVATAR_PRESETS.map(preset => (
                        <button key={preset.id} className={avatarPreset === preset.id && !avatarData ? 'on' : ''} onClick={() => { setAvatar(preset.id); setAvatarData(undefined); }} aria-label={preset.label}>
                            <Av kind="letter" label={name || preset.label} size={36} colors={preset.colors} />
                        </button>
                    ))}
                </div>
                <input className="field" type="file" accept="image/*" onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    fitImage(file, 128, 128).then(setAvatarData).catch(error => setLocalError(error.message));
                }} />
                <div className="lbl">Banner</div>
                <div className="preset-row">
                    {BANNER_PRESETS.map(preset => (
                        <button key={preset.id} className={`banner-swatch${bannerPreset === preset.id && !bannerData ? ' on' : ''}`} style={{ background: `linear-gradient(110deg, ${preset.colors.join(',')})` }} onClick={() => { setBanner(preset.id); setBannerData(undefined); }} aria-label={preset.label} />
                    ))}
                </div>
                <input className="field" type="file" accept="image/*" onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    fitImage(file, 640, 200).then(setBannerData).catch(error => setLocalError(error.message));
                }} />
                <div className="lbl">Thumbnail style</div>
                <div className="preset-row">
                    {THUMB_PRESETS.map(preset => (
                        <button key={preset.id} className={`thumb-swatch${thumbPreset === preset.id ? ' on' : ''}`} onClick={() => setThumb(preset.id)}>{preset.label}</button>
                    ))}
                </div>
                <p className="dim">A second rename within 8 weeks confuses search for a bit. It does not stop you.</p>
                {localError && <div className="err">{localError}</div>}
                <button className="btn red" onClick={save} data-yt-customize-save>Save look</button>
            </div>
        </div>
    );
};

export const bannerBackground = (kind: YoutubeChannelKind, lookName?: { bannerPreset?: string; bannerData?: string }) => {
    if (lookName?.bannerData) return `url(${lookName.bannerData})`;
    const colors = presetColors(lookName?.bannerPreset || 'marquee', BANNER_PRESETS) || BANNER_PRESETS[0].colors;
    return `linear-gradient(110deg, ${colors.join(',')})`;
};

export const ChannelExtras = () => {
    const api = useYt();
    const [open, setOpen] = useState(false);
    const look = lookFor(api.channel, api.kind);
    return (
        <div data-yt-channel-extras>
            <div className="between" style={{ marginTop: 16 }}>
                <div className="h2">Play Buttons</div>
                <button className="btn sm" onClick={() => setOpen(true)} data-yt-customize-open>Customize</button>
            </div>
            <TrophyShelf />
            {look.name ? <div className="dim">Showing as {look.name}. The handle stays {api.kind === 'personal' ? api.channel.handle : 'on the channel'}.</div> : null}
            {open && <CustomizeSheet onClose={() => setOpen(false)} />}
        </div>
    );
};

export const UnlockSheet = ({ onClose }: { onClose: () => void }) => {
    const api = useYt();
    const [localError, setLocalError] = useState<string | null>(null);
    const open = () => {
        const result = unlockExtraYoutubeChannels(api.player);
        if (result.error) {
            setLocalError(result.error);
            return;
        }
        api.update(result.player);
        onClose();
    };
    return (
        <div className="pb-ceremony" data-yt-unlock role="dialog" aria-label="Unlock channels">
            <div className="pb-ceremony-card">
                <Lock size={28} />
                <h2>Another channel</h2>
                <p>Personal stays free. {formatMoney(EXTRA_CHANNEL_UNLOCK_PRICE)} opens the studio channel and Empire+. One payment, and it can move to a store purchase later.</p>
                {localError && <div className="err">{localError}</div>}
                <div className="row" style={{ justifyContent: 'center' }}>
                    <button className="btn" onClick={onClose}>Not now</button>
                    <button className="btn red" onClick={open} data-yt-unlock-buy>Unlock for {formatMoney(EXTRA_CHANNEL_UNLOCK_PRICE)}</button>
                </div>
            </div>
        </div>
    );
};

export const SubscribeButton = ({ channelId, name }: { channelId: string; name: string }) => {
    const api = useYt();
    const on = (api.channel.subscriptions || []).includes(channelId);
    return (
        <SubscribeTap className={`btn sm${on ? '' : ' white'}`} subscribeId={channelId} on={on} aria-label={on ? `Subscribed to ${name}` : `Subscribe to ${name}`} onClick={() => api.apply(toggleSubscription(api.player, channelId))}>
            {on ? 'Subscribed' : 'Subscribe'}
        </SubscribeTap>
    );
};

export const PeopleSubs = () => {
    const api = useYt();
    const followed = new Set(api.channel.subscriptions || []);
    const seeds = creatorSeeds(api.player);
    const mine = seeds.filter(creator => followed.has(creator.id));
    const sample = seeds.filter(creator => !followed.has(creator.id)).slice(0, 8);
    const feed = api.videos.filter(video => video.creatorChannelId && followed.has(video.creatorChannelId));
    return (
        <div data-yt-people>
            <div className="h2" style={{ marginTop: 8 }}>People</div>
            <div className="dim">Actors, singers, and creators. Their uploads show up here once you subscribe.</div>
            <div className="grid" style={{ marginTop: 12 }}>
                {feed.slice(0, 4).map(video => (
                    <button key={video.id} className="slot" onClick={() => api.openVideo(video.id)} style={{ textAlign: 'left' }}>
                        <b>{video.title}</b>
                        <div className="dim">{video.authorName}</div>
                    </button>
                ))}
            </div>
            <div className="slots" style={{ marginTop: 8 }}>
                {[...mine, ...sample].map(creator => {
                    const subs = creatorAudience(api.channel, creator.id, creator.followers);
                    return (
                        <button key={creator.id} className="slot" onClick={() => api.openCreator(creator.id)} style={{ textAlign: 'left' }}>
                            <div className="between"><b>{creator.name}</b><span className="pill">{followed.has(creator.id) ? 'Subscribed' : creator.country || 'Creator'}</span></div>
                            <div className="dim">{creator.handle} · {formatCompact(subs)} subs</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export const CreatorScreen = () => {
    const api = useYt();
    const seeds = creatorSeeds(api.player);
    const creator = seeds.find(item => item.id === api.creatorId) || seeds[0];
    if (!creator) return <div className="card pad">No creator channels in this world yet.</div>;
    const subs = creatorAudience(api.channel, creator.id, api.channel.zeroStart ? 0 : creator.followers);
    const buttons = (api.channel.creatorChannels || []).find(item => item.id === creator.id)?.playButtons || [];
    const videos = api.videos.filter(video => video.creatorChannelId === creator.id || video.authorName === creator.name);
    return (
        <div data-yt-creator={creator.id}>
            <button className="btn sm" onClick={() => api.go('subs')}>Subscriptions</button>
            <div className="chanhead" style={{ marginTop: 12 }}>
                <div className="row">
                    <Av kind="letter" label={creator.name} size={72} src={creator.avatar} />
                    <div>
                        <div className="h2">{creator.name}</div>
                        <div className="dim">{creator.handle} · {formatCompact(subs)} subs · {creator.country}</div>
                        {buttons.length > 0 && <div className="dim">{buttons.map(playButtonLabel).join(' · ')} Play Button</div>}
                    </div>
                </div>
                <SubscribeButton channelId={creator.id} name={creator.name} />
            </div>
            <div className="grid" style={{ marginTop: 16 }}>
                {videos.slice(0, 6).map(video => (
                    <button key={video.id} className="slot" onClick={() => api.openVideo(video.id)} style={{ textAlign: 'left' }}>
                        <b>{video.title}</b>
                        <div className="dim">{formatCompact(video.views)} views</div>
                    </button>
                ))}
            </div>
            {videos.length === 0 && <div className="card pad" style={{ marginTop: 12 }}>{creator.name} has not posted in this window. Subscribing still follows the channel.</div>}
        </div>
    );
};

export const CreatorWatchSubscribe = ({ video }: { video: { id: string; rivalChannelId?: string; creatorChannelId?: string; isPlayer?: boolean; channelKind?: string; authorName: string } }) => {
    const api = useYt();
    const rival = video.rivalChannelId ? findRivalChannel(api.channel, video.rivalChannelId) : undefined;
    if (rival) return <SubscribeButton channelId={rival.id} name={rival.name} />;
    if (video.isPlayer || video.channelKind) return <span className="pill">Your channel</span>;
    const creator = video.creatorChannelId ? creatorSeeds(api.player).find(item => item.id === video.creatorChannelId || item.name === video.authorName) : creatorSeeds(api.player).find(item => item.name === video.authorName);
    if (!creator) return null;
    return <SubscribeButton channelId={creator.id} name={creator.name} />;
};
