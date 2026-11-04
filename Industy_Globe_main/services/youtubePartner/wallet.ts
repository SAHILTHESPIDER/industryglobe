import { Player, Transaction, YoutubeChannelKind } from '../../types';
import { addCompanyCash, readCompanyCash } from '../ownPlatform/companyCash';
import { walletLabel } from './constants';
import { ensureYoutubePartner } from './economy';

export interface WalletResult {
    player: Player;
    error?: string;
    held?: boolean;
}

const houseOf = (player: Player) =>
    (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.isActive);

const withPartner = (player: Player): Player => ({ ...player, youtube: ensureYoutubePartner(player.youtube) });

const notePersonal = (player: Player, amount: number, label: string): Player => {
    const history = player.finance?.history || [];
    const entry: Transaction = {
        id: `yt_${player.currentWeek}_${history.length}_${Math.abs(amount)}`,
        week: player.currentWeek,
        year: player.age,
        amount,
        category: amount >= 0 ? 'BUSINESS' : 'EXPENSE',
        description: label,
    };
    return {
        ...player,
        money: (player.money || 0) + amount,
        finance: player.finance ? { ...player.finance, history: [entry, ...history].slice(0, 200) } : player.finance,
    };
};

const noteHeld = (player: Player, kind: YoutubeChannelKind, amount: number): Player => {
    const next = withPartner(player);
    const partner = next.youtube.partner!;
    return {
        ...next,
        youtube: {
            ...next.youtube,
            partner: { ...partner, held: { ...partner.held, [kind]: (partner.held[kind] || 0) + amount } },
        },
    };
};

const bumpWallet = (player: Player, kind: YoutubeChannelKind, amount: number): Player => {
    const next = withPartner(player);
    const partner = next.youtube.partner!;
    return {
        ...next,
        youtube: {
            ...next.youtube,
            partner: {
                ...partner,
                lifetimeByWallet: {
                    ...partner.lifetimeByWallet,
                    [kind]: (partner.lifetimeByWallet[kind] || 0) + Math.max(0, amount),
                },
            },
        },
    };
};

export const creditYoutubeWallet = (player: Player, kind: YoutubeChannelKind, amount: number, label: string): WalletResult => {
    const safe = Math.floor(amount);
    if (!Number.isFinite(safe) || safe === 0) return { player };
    if (safe < 0) return chargeYoutubeWallet(player, kind, -safe, label, { allowDebt: true });
    if (kind === 'personal') return { player: bumpWallet(notePersonal(player, safe, label), kind, safe) };
    if (kind === 'studio') {
        const house = houseOf(player);
        if (!house) return { player: noteHeld(player, kind, safe), held: true };
        const businesses = (player.businesses || []).map(business => {
            if (business.id !== house.id) return business;
            const stats = business.stats ? { ...business.stats, lifetimeRevenue: (business.stats.lifetimeRevenue || 0) + safe } : business.stats;
            const studioState = business.studioState ? {
                ...business.studioState,
                financeLedger: [{
                    id: `yt_in_${player.currentWeek}_${business.studioState.financeLedger?.length || 0}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: safe,
                    type: 'STREAMING_ROYALTY',
                    label,
                }, ...(business.studioState.financeLedger || [])].slice(0, 80),
            } : business.studioState;
            return { ...business, balance: (business.balance || 0) + safe, stats, studioState };
        });
        return { player: bumpWallet({ ...player, businesses }, kind, safe) };
    }
    if (!player.ownPlatform) return { player: noteHeld(player, kind, safe), held: true };
    const next = {
        ...player,
        ownPlatform: {
            ...player.ownPlatform,
            books: player.ownPlatform.books ? {
                ...player.ownPlatform.books,
                lines: [...(player.ownPlatform.books.lines || [])],
                history: [...(player.ownPlatform.books.history || [])],
            } : player.ownPlatform.books,
        },
    };
    addCompanyCash(next, safe, label, 'RECEIPTS');
    return { player: bumpWallet(next, kind, safe) };
};

export const chargeYoutubeWallet = (
    player: Player,
    kind: YoutubeChannelKind,
    amount: number,
    label: string,
    opts?: { allowDebt?: boolean },
): WalletResult => {
    const safe = Math.floor(amount);
    if (!Number.isFinite(safe) || safe <= 0) return { player };
    const where = walletLabel(kind);
    if (kind === 'personal') {
        if (!opts?.allowDebt && (player.money || 0) < safe) {
            return { player, error: `Personal cash is short $${(safe - (player.money || 0)).toLocaleString()}.` };
        }
        return { player: notePersonal(player, -safe, label) };
    }
    if (kind === 'studio') {
        const house = houseOf(player);
        if (!house) return { player, error: 'The studio channel spends from the house treasury. Open a production house first.' };
        if (!opts?.allowDebt && (house.balance || 0) < safe) {
            return { player, error: `The ${where} is short $${(safe - (house.balance || 0)).toLocaleString()}.` };
        }
        const businesses = (player.businesses || []).map(business => {
            if (business.id !== house.id) return business;
            const studioState = business.studioState ? {
                ...business.studioState,
                financeLedger: [{
                    id: `yt_out_${player.currentWeek}_${business.studioState.financeLedger?.length || 0}`,
                    week: player.currentWeek,
                    year: player.age,
                    amount: -safe,
                    type: 'PRODUCTION_SPEND',
                    label,
                }, ...(business.studioState.financeLedger || [])].slice(0, 80),
            } : business.studioState;
            return { ...business, balance: (business.balance || 0) - safe, studioState };
        });
        return { player: { ...player, businesses } };
    }
    if (!player.ownPlatform) return { player, error: 'Empire+ is not on the books yet.' };
    const cash = readCompanyCash(player);
    if (!opts?.allowDebt && cash < safe) {
        return { player, error: `The ${where} is short $${(safe - cash).toLocaleString()}.` };
    }
    const next = {
        ...player,
        ownPlatform: {
            ...player.ownPlatform,
            books: player.ownPlatform.books ? {
                ...player.ownPlatform.books,
                lines: [...(player.ownPlatform.books.lines || [])],
                history: [...(player.ownPlatform.books.history || [])],
            } : player.ownPlatform.books,
        },
    };
    addCompanyCash(next, -safe, label, 'BURN');
    return { player: next };
};

export const activeKind = (player: Player): YoutubeChannelKind => player.youtube?.activeChannel || 'personal';
