import { ChannelLook, Player, YoutubeChannel, YoutubeChannelKind } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

/**
 * Extra YouTube accounts (the studio channel and Empire+) stay locked until this runs.
 * Personal is always free. Swap the body for an in-app purchase later. Callers should not
 * set extraChannelsUnlocked themselves.
 */
export const EXTRA_CHANNEL_UNLOCK_PRICE = 8_000;

/** A second rename inside this window confuses search and regulars. It does not block the change. */
export const RENAME_CONFUSION_WEEKS = 8;

export const AVATAR_PRESETS = [
    { id: 'ember', label: 'Ember', colors: ['#ff7a86', '#8e1024'] },
    { id: 'gold', label: 'Gold', colors: ['#ffe7a8', '#a87412'] },
    { id: 'night', label: 'Night', colors: ['#9aa6ff', '#1c1c44'] },
    { id: 'mint', label: 'Mint', colors: ['#b8ffe0', '#0c6a4a'] },
    { id: 'ink', label: 'Ink', colors: ['#f5f5f8', '#2c2c36'] },
    { id: 'royal', label: 'Royal', colors: ['#f0ddff', '#5c2d91'] },
] as const;

export const BANNER_PRESETS = [
    { id: 'marquee', label: 'Marquee', colors: ['#2a0c14', '#ff2e43', '#1a1208'] },
    { id: 'lot', label: 'Backlot', colors: ['#101018', '#3a2a12', '#c9a36a'] },
    { id: 'neon', label: 'Neon', colors: ['#120818', '#7a2cff', '#ff4d6d'] },
    { id: 'daylight', label: 'Daylight', colors: ['#1a2744', '#7eb6e6', '#f4efe4'] },
    { id: 'stage', label: 'Stage', colors: ['#1a0a0c', '#e23b4a', '#f6c453'] },
    { id: 'quiet', label: 'Quiet', colors: ['#12141a', '#2e3548', '#8d97a6'] },
] as const;

export const THUMB_PRESETS = [
    { id: 'poster-hero', label: 'Hero' },
    { id: 'poster-song', label: 'Song' },
    { id: 'poster-interview', label: 'Talk' },
    { id: 'poster-bts', label: 'Set' },
    { id: 'poster-scifi', label: 'Night' },
    { id: 'poster-series', label: 'Series' },
] as const;

export const channelSwitchAllowed = (channel: Pick<YoutubeChannel, 'extraChannelsUnlocked'> | undefined, kind: YoutubeChannelKind) =>
    kind === 'personal' || !!channel?.extraChannelsUnlocked;

export const lookFor = (channel: YoutubeChannel | undefined, kind: YoutubeChannelKind): ChannelLook =>
    channel?.looks?.[kind] || {};

export const presetColors = (id: string | undefined, bank: readonly { id: string; colors: readonly string[] }[]) =>
    bank.find(item => item.id === id)?.colors;

export const avatarColors = (look: ChannelLook | undefined) =>
    look?.avatarData ? undefined : presetColors(look?.avatarPreset, AVATAR_PRESETS);

const log = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral' = 'neutral'): Player => ({
    ...player,
    logs: [{ week: player.currentWeek, year: player.age, message, type }, ...(player.logs || [])].slice(0, 50),
});

export interface CustomizeResult { player: Player; error?: string }

export const unlockExtraYoutubeChannels = (player: Player): CustomizeResult => {
    if (player.youtube?.extraChannelsUnlocked) return { player };
    if ((player.money || 0) < EXTRA_CHANNEL_UNLOCK_PRICE) {
        return { player, error: `Opening another channel costs $${EXTRA_CHANNEL_UNLOCK_PRICE.toLocaleString()}.` };
    }
    return {
        player: log({
            ...player,
            money: player.money - EXTRA_CHANNEL_UNLOCK_PRICE,
            youtube: { ...player.youtube, extraChannelsUnlocked: true },
        }, `Opened the studio and Empire+ channels for $${EXTRA_CHANNEL_UNLOCK_PRICE.toLocaleString()}.`, 'neutral'),
    };
};

export const saveChannelLook = (player: Player, kind: YoutubeChannelKind, patch: ChannelLook): CustomizeResult => {
    const channel = player.youtube;
    const current = lookFor(channel, kind);
    const nextName = (patch.name ?? current.name ?? '').trim().slice(0, 42);
    const shownName = (current.name || (kind === 'personal' ? player.name : '')).trim();
    const nameChanged = nextName !== shownName && (nextName.length > 0 || !!current.name);
    const abs = getAbsoluteWeek(player.age, player.currentWeek);
    const frequent = nameChanged && (current.renames || 0) >= 1 && abs - (current.renameWeekAbs || -999) < RENAME_CONFUSION_WEEKS;
    const look: ChannelLook = {
        ...current,
        ...patch,
        name: nextName || undefined,
        renames: nameChanged ? (current.renames || 0) + 1 : current.renames,
        renameWeekAbs: nameChanged ? abs : current.renameWeekAbs,
    };
    if (look.avatarData && look.avatarData.length > 120_000) return { player, error: 'That avatar is too heavy for a save. Try a preset.' };
    if (look.bannerData && look.bannerData.length > 180_000) return { player, error: 'That banner is too heavy for a save. Try a preset.' };
    let next: Player = {
        ...player,
        youtube: {
            ...channel,
            looks: { ...(channel.looks || {}), [kind]: look },
            audienceTrust: frequent ? Math.max(0, (channel.audienceTrust ?? 55) - 3) : channel.audienceTrust,
            fanMood: frequent ? Math.max(0, (channel.fanMood ?? 55) - 4) : channel.fanMood,
        },
    };
    if (nameChanged) {
        next = log(next, frequent
            ? `Renamed the channel to ${nextName}. Search still shows the old name, and a few regulars bounced.`
            : `The channel is now called ${nextName}.`, frequent ? 'neutral' : 'positive');
    }
    return { player: next };
};
