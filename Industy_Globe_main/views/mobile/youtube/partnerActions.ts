import { Player, YoutubeDaypart, YoutubePostTone } from '../../../types';
import { spendPlayerEnergy } from '../../../services/premiumLogic';
import {
    buyPromotion, collabBoard, filmCollab, postCommunity, runPremiere, setPreferredDaypart, COLLAB_ENERGY, COMMUNITY_ENERGY, PREMIERE_ENERGY,
} from '../../../services/youtubePartner';
import { ActionResult } from './actions';

const log = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral'): Player => ({
    ...player,
    logs: [{ week: player.currentWeek, year: player.age, message, type }, ...player.logs].slice(0, 50),
});

export const filmWith = (player: Player, targetId: string): ActionResult => {
    if (player.energy.current < COLLAB_ENERGY) return { player, error: 'Not enough energy.' };
    const target = collabBoard(player).find(item => item.id === targetId);
    if (!target) return { player, error: 'That creator is not on YouTube this week.' };
    const filmed = filmCollab(player, target, { title: `${player.name} × ${target.name}`, type: 'Q_AND_A' });
    let next = filmed.player;
    spendPlayerEnergy(next, COLLAB_ENERGY);
    next = log(next, filmed.note, filmed.tone);
    return { player: next };
};

export const premiereProject = (player: Player, projectId: string, mode: 'PREMIERE' | 'LIVE'): ActionResult => {
    if (player.energy.current < PREMIERE_ENERGY) return { player, error: 'Not enough energy.' };
    const ran = runPremiere(player, projectId, mode);
    if (ran.error) return { player, error: ran.error };
    let next = ran.player;
    spendPlayerEnergy(next, PREMIERE_ENERGY);
    next = log(next, ran.note, ran.tone);
    return { player: next, screen: 'analytics' };
};

export const publishCommunity = (player: Player, text: string, tone: YoutubePostTone): ActionResult => {
    if (player.energy.current < COMMUNITY_ENERGY) return { player, error: 'Not enough energy.' };
    const posted = postCommunity(player, text, tone);
    if (posted.error) return { player, error: posted.error };
    let next = posted.player;
    spendPlayerEnergy(next, COMMUNITY_ENERGY);
    next = log(next, posted.note, posted.tone);
    return { player: next };
};

export const promoteVideo = (player: Player, videoId: string, budget: number, countries: string[], weeks: number): ActionResult => {
    const bought = buyPromotion(player, videoId, budget, countries, weeks);
    if (bought.error) return { player, error: bought.error };
    return { player: log(bought.player, bought.note, bought.tone) };
};

export const pickDaypart = (player: Player, daypart: YoutubeDaypart): ActionResult => ({
    player: setPreferredDaypart(player, daypart),
});
