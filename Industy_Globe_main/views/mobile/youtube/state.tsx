import { createContext, useContext } from 'react';
import { Commitment, Player, YoutubeChannel, YoutubeChannelKind, YoutubeVideo, YoutubeVideoType } from '../../../types';
import { ActionResult } from './actions';

export type YtScreen = 'home' | 'watch' | 'hub' | 'upload' | 'studio' | 'channel' | 'trending' | 'music' | 'shorts' | 'live' | 'money' | 'subs' | 'rival';

export interface YtApi {
    player: Player;
    channel: YoutubeChannel;
    screen: YtScreen;
    go: (screen: YtScreen) => void;
    watchId: string | null;
    openVideo: (id: string) => void;
    projectId: string | null;
    setProjectId: (id: string) => void;
    presetType: YoutubeVideoType | null;
    armUpload: (type: YoutubeVideoType | null, projectId?: string) => void;
    query: string;
    setQuery: (value: string) => void;
    error: string | null;
    clearError: () => void;
    apply: (result: ActionResult) => void;
    update: (player: Player) => void;
    onBack: () => void;
    videos: YoutubeVideo[];
    projects: Commitment[];
    absWeek: number;
    kind: YoutubeChannelKind;
    rivalId: string | null;
    openRival: (id: string) => void;
}

export const YtContext = createContext<YtApi | null>(null);

export const useYt = () => {
    const value = useContext(YtContext);
    if (!value) throw new Error('YouTube screen rendered outside YoutubeApp');
    return value;
};
