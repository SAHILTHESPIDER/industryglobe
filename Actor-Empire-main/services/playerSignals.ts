import { NewsItem, Player, TransactionCategory, XPost } from '../types';

const clip = <T,>(items: T[], max: number) => items.slice(0, max);

export const appendNews = (player: Player, item: Omit<NewsItem, 'week' | 'year' | 'impactLevel'> & Partial<Pick<NewsItem, 'week' | 'year' | 'impactLevel'>>): Player => {
    const news: NewsItem = {
        week: player.currentWeek,
        year: player.age,
        impactLevel: 'LOW',
        ...item,
    };
    return {
        ...player,
        news: clip([news, ...(player.news || [])], 80),
    };
};

export const appendLedger = (player: Player, amount: number, category: TransactionCategory, description: string): Player => {
    if (!player.finance) return player;
    const history = Array.isArray(player.finance.history) ? player.finance.history : [];
    return {
        ...player,
        finance: {
            ...player.finance,
            history: clip([{
                id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                week: player.currentWeek,
                year: player.age,
                amount: Math.trunc(amount),
                category,
                description,
            }, ...history], 200),
        },
    };
};

export const appendBuzz = (player: Player, content: string, likes = 4000): Player => {
    if (!player.x) return player;
    const post: XPost = {
        id: `x_signal_${Date.now()}`,
        authorId: 'x_trade_press',
        authorName: 'Industry Desk',
        authorHandle: '@industrydsk',
        authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=IndustryDesk',
        content,
        timestamp: Date.now(),
        likes,
        retweets: Math.round(likes / 8),
        replies: Math.round(likes / 20),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
    };
    return {
        ...player,
        x: {
            ...player.x,
            feed: clip([post, ...(player.x.feed || [])], 50),
        },
    };
};
