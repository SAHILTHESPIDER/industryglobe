import type { FilmIndustryId, Genre, NPCTier, TalentFeeTier, TalentKind } from '../../types';
import { cartoonAvatarUrl } from '../cartoonAvatar';
import { INDUSTRIES } from '../scriptDesk/catalog';

/**
 * One switch for this roster.
 * true: the game shows the real name.
 * false: the game shows the fictional alias generated beside it.
 * Real photos are never used. Portraits come from the cartoon face set.
 */
export const USE_REAL_NAMES = true;

export interface TalentRosterEntry {
    id: string;
    realName: string;
    fictionalName: string;
    industry: FilmIndustryId;
    country: string;
    gender: 'MALE' | 'FEMALE';
    tier: NPCTier;
    kind: TalentKind;
    genres: Genre[];
    followersM: number;
    netWorthM: number;
    fame: number;
    feeTier: TalentFeeTier;
    /** Neutral. No scandals and no invented personal defects. */
    bio: string;
}

const slug = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

const hash = (value: string) => {
    let out = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        out ^= value.charCodeAt(index);
        out = Math.imul(out, 16777619);
    }
    return out >>> 0;
};

const aliasFor = (realName: string, industry: FilmIndustryId, gender: 'MALE' | 'FEMALE'): string => {
    const profile = INDUSTRIES[industry];
    const roll = hash(realName);
    const firsts = gender === 'FEMALE' ? profile.female : profile.male;
    const first = firsts[roll % firsts.length];
    const last = profile.last[(roll >>> 8) % profile.last.length];
    return `${first} ${last}`;
};

const feeFor = (tier: NPCTier): TalentFeeTier => {
    if (tier === 'ICON') return 'ICON';
    if (tier === 'A_LIST') return 'HIGH';
    if (tier === 'ESTABLISHED') return 'MID';
    return 'LOW';
};

const fameFor = (tier: NPCTier): number => {
    if (tier === 'ICON') return 96;
    if (tier === 'A_LIST') return 88;
    if (tier === 'ESTABLISHED') return 72;
    return 54;
};

const kindLabel = (kind: TalentKind, gender: 'MALE' | 'FEMALE') => {
    if (kind === 'DIRECTOR') return 'director';
    if (kind === 'INFLUENCER') return 'influencer';
    if (kind === 'YOUTUBER') return 'YouTuber';
    if (kind === 'STREAMER') return 'streamer';
    return gender === 'FEMALE' ? 'actress' : 'actor';
};

type Seed = [string, FilmIndustryId, 'MALE' | 'FEMALE', NPCTier, TalentKind, Genre[], number, number, string];

const build = (seed: Seed): TalentRosterEntry => {
    const [realName, industry, gender, tier, kind, genres, followersM, netWorthM, country] = seed;
    return {
        id: `roster_${slug(realName)}`,
        realName,
        fictionalName: aliasFor(realName, industry, gender),
        industry,
        country,
        gender,
        tier,
        kind,
        genres,
        followersM,
        netWorthM,
        fame: fameFor(tier),
        feeTier: feeFor(tier),
        bio: `${country} ${kindLabel(kind, gender)}.`,
    };
};

const A = 'ACTION' as const;
const D = 'DRAMA' as const;
const C = 'COMEDY' as const;
const R = 'ROMANCE' as const;
const T = 'THRILLER' as const;
const H = 'HORROR' as const;
const S = 'SCI_FI' as const;
const V = 'ADVENTURE' as const;
const M = 'MUSICAL' as const;
const B = 'BIOPIC' as const;

const SEEDS: Seed[] = [
    // Korea
    ['Song Kang-ho', 'KOREAN', 'MALE', 'ICON', 'ACTOR', [D, C, T], 2, 40, 'South Korea'],
    ['Ma Dong-seok', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [A, C, T], 4, 25, 'South Korea'],
    ['Lee Byung-hun', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [A, D, T], 6, 35, 'South Korea'],
    ['Hwang Jung-min', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [D, A, C], 2, 20, 'South Korea'],
    ['Choi Min-sik', 'KOREAN', 'MALE', 'ICON', 'ACTOR', [T, D, A], 1, 30, 'South Korea'],
    ['Lee Jung-jae', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [T, D, A], 8, 28, 'South Korea'],
    ['Gong Yoo', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [D, R, T], 12, 22, 'South Korea'],
    ['Hyun Bin', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [R, D, A], 14, 24, 'South Korea'],
    ['Park Seo-joon', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [R, C, A], 18, 18, 'South Korea'],
    ['Kim Soo-hyun', 'KOREAN', 'MALE', 'A_LIST', 'ACTOR', [R, D, C], 20, 20, 'South Korea'],
    ['Zo In-sung', 'KOREAN', 'MALE', 'ESTABLISHED', 'ACTOR', [D, R, A], 5, 16, 'South Korea'],
    ['Jung Hae-in', 'KOREAN', 'MALE', 'ESTABLISHED', 'ACTOR', [R, D], 9, 8, 'South Korea'],
    ['Park Bo-gum', 'KOREAN', 'MALE', 'ESTABLISHED', 'ACTOR', [R, D, M], 10, 8, 'South Korea'],
    ['Bae Doona', 'KOREAN', 'FEMALE', 'A_LIST', 'ACTOR', [S, D, T], 3, 12, 'South Korea'],
    ['Jun Ji-hyun', 'KOREAN', 'FEMALE', 'A_LIST', 'ACTOR', [R, C, A], 11, 30, 'South Korea'],
    ['Son Ye-jin', 'KOREAN', 'FEMALE', 'A_LIST', 'ACTOR', [R, D, C], 15, 22, 'South Korea'],
    ['Kim Hye-soo', 'KOREAN', 'FEMALE', 'A_LIST', 'ACTOR', [D, T, C], 4, 18, 'South Korea'],
    ['Kim Tae-ri', 'KOREAN', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, T, A], 6, 8, 'South Korea'],
    ['Park So-dam', 'KOREAN', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, T, C], 5, 6, 'South Korea'],
    ['Han So-hee', 'KOREAN', 'FEMALE', 'RISING', 'ACTOR', [T, R, D], 12, 5, 'South Korea'],
    ['Kim Go-eun', 'KOREAN', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, R, T], 7, 7, 'South Korea'],
    ['Song Hye-kyo', 'KOREAN', 'FEMALE', 'A_LIST', 'ACTOR', [R, D], 16, 45, 'South Korea'],
    ['Park Chan-wook', 'KOREAN', 'MALE', 'A_LIST', 'DIRECTOR', [T, D, H], 2, 25, 'South Korea'],
    ['Bong Joon-ho', 'KOREAN', 'MALE', 'ICON', 'DIRECTOR', [T, D, C], 3, 40, 'South Korea'],
    ['Lee Chang-dong', 'KOREAN', 'MALE', 'A_LIST', 'DIRECTOR', [D], 1, 10, 'South Korea'],
    ['Kim Jee-woon', 'KOREAN', 'MALE', 'ESTABLISHED', 'DIRECTOR', [A, T, H], 1, 8, 'South Korea'],
    ['Ryoo Seung-wan', 'KOREAN', 'MALE', 'ESTABLISHED', 'DIRECTOR', [A, C], 1, 8, 'South Korea'],
    // Japan
    ['Hiroyuki Sanada', 'JAPANESE', 'MALE', 'A_LIST', 'ACTOR', [A, D, V], 3, 20, 'Japan'],
    ['Ken Watanabe', 'JAPANESE', 'MALE', 'A_LIST', 'ACTOR', [D, A, V], 2, 25, 'Japan'],
    ['Koji Yakusho', 'JAPANESE', 'MALE', 'A_LIST', 'ACTOR', [D, C], 1, 15, 'Japan'],
    ['Tadanobu Asano', 'JAPANESE', 'MALE', 'ESTABLISHED', 'ACTOR', [D, A, T], 2, 10, 'Japan'],
    ['Masaki Suda', 'JAPANESE', 'MALE', 'A_LIST', 'ACTOR', [D, C, M], 8, 12, 'Japan'],
    ['Takuya Kimura', 'JAPANESE', 'MALE', 'ICON', 'ACTOR', [D, R, A], 6, 40, 'Japan'],
    ['Ryunosuke Kamiki', 'JAPANESE', 'MALE', 'ESTABLISHED', 'ACTOR', [D, V], 4, 8, 'Japan'],
    ['Go Ayano', 'JAPANESE', 'MALE', 'ESTABLISHED', 'ACTOR', [A, T, D], 3, 8, 'Japan'],
    ['Rinko Kikuchi', 'JAPANESE', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, S], 2, 8, 'Japan'],
    ['Haruka Ayase', 'JAPANESE', 'FEMALE', 'A_LIST', 'ACTOR', [D, R, C], 7, 15, 'Japan'],
    ['Masami Nagasawa', 'JAPANESE', 'FEMALE', 'A_LIST', 'ACTOR', [D, R, C], 6, 12, 'Japan'],
    ['Yui Aragaki', 'JAPANESE', 'FEMALE', 'A_LIST', 'ACTOR', [R, C, D], 10, 18, 'Japan'],
    ['Satomi Ishihara', 'JAPANESE', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, R], 5, 8, 'Japan'],
    ['Tao Tsuchiya', 'JAPANESE', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, M, A], 4, 6, 'Japan'],
    ['Hirokazu Kore-eda', 'JAPANESE', 'MALE', 'A_LIST', 'DIRECTOR', [D], 1, 12, 'Japan'],
    ['Hayao Miyazaki', 'JAPANESE', 'MALE', 'ICON', 'DIRECTOR', ['ANIMATION', V, D], 4, 50, 'Japan'],
    ['Makoto Shinkai', 'JAPANESE', 'MALE', 'A_LIST', 'DIRECTOR', ['ANIMATION', R, D], 3, 20, 'Japan'],
    ['Ryusuke Hamaguchi', 'JAPANESE', 'MALE', 'ESTABLISHED', 'DIRECTOR', [D], 1, 4, 'Japan'],
    ['Takashi Miike', 'JAPANESE', 'MALE', 'ESTABLISHED', 'DIRECTOR', [A, H, T], 1, 10, 'Japan'],
    // China and Hong Kong
    ['Gong Li', 'CHINESE', 'FEMALE', 'ICON', 'ACTOR', [D, B], 2, 30, 'China'],
    ['Zhang Ziyi', 'CHINESE', 'FEMALE', 'A_LIST', 'ACTOR', [A, D, R], 8, 40, 'China'],
    ['Zhou Xun', 'CHINESE', 'FEMALE', 'A_LIST', 'ACTOR', [D, R], 6, 20, 'China'],
    ['Tang Wei', 'CHINESE', 'FEMALE', 'A_LIST', 'ACTOR', [D, T, R], 4, 15, 'China'],
    ['Liu Yifei', 'CHINESE', 'FEMALE', 'A_LIST', 'ACTOR', [V, R, D], 20, 25, 'China'],
    ['Fan Bingbing', 'CHINESE', 'FEMALE', 'A_LIST', 'ACTOR', [D, A], 12, 40, 'China'],
    ['Yang Mi', 'CHINESE', 'FEMALE', 'ESTABLISHED', 'ACTOR', [R, D], 40, 30, 'China'],
    ['Jackie Chan', 'CHINESE', 'MALE', 'ICON', 'ACTOR', [A, C, V], 15, 400, 'Hong Kong'],
    ['Donnie Yen', 'CHINESE', 'MALE', 'A_LIST', 'ACTOR', [A, V], 8, 50, 'Hong Kong'],
    ['Andy Lau', 'CHINESE', 'MALE', 'ICON', 'ACTOR', [D, A, C], 10, 300, 'Hong Kong'],
    ['Tony Leung Chiu-wai', 'CHINESE', 'MALE', 'ICON', 'ACTOR', [D, R, T], 3, 80, 'Hong Kong'],
    ['Wu Jing', 'CHINESE', 'MALE', 'A_LIST', 'ACTOR', [A, V], 12, 80, 'China'],
    ['Shen Teng', 'CHINESE', 'MALE', 'A_LIST', 'ACTOR', [C, D], 8, 40, 'China'],
    ['Huang Bo', 'CHINESE', 'MALE', 'A_LIST', 'ACTOR', [C, D], 6, 35, 'China'],
    ['Jet Li', 'CHINESE', 'MALE', 'A_LIST', 'ACTOR', [A, V], 4, 250, 'China'],
    ['Zhang Yimou', 'CHINESE', 'MALE', 'ICON', 'DIRECTOR', [D, A, V], 2, 40, 'China'],
    ['Chen Kaige', 'CHINESE', 'MALE', 'A_LIST', 'DIRECTOR', [D, B], 1, 15, 'China'],
    ['Jia Zhangke', 'CHINESE', 'MALE', 'A_LIST', 'DIRECTOR', [D], 1, 8, 'China'],
    ['Stephen Chow', 'CHINESE', 'MALE', 'ICON', 'DIRECTOR', [C, A, V], 5, 200, 'Hong Kong'],
    // Tollywood
    ['Prabhas', 'TOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, V, R], 14, 50, 'India'],
    ['Allu Arjun', 'TOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, C, M], 18, 40, 'India'],
    ['Mahesh Babu', 'TOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, D, R], 14, 45, 'India'],
    ['N. T. Rama Rao Jr.', 'TOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, D], 12, 35, 'India'],
    ['Ram Charan', 'TOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, D], 12, 35, 'India'],
    ['Chiranjeevi', 'TOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [A, C], 8, 60, 'India'],
    ['Pawan Kalyan', 'TOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, C], 10, 30, 'India'],
    ['Nagarjuna', 'TOLLYWOOD', 'MALE', 'ESTABLISHED', 'ACTOR', [D, A, R], 6, 40, 'India'],
    ['Vijay Deverakonda', 'TOLLYWOOD', 'MALE', 'ESTABLISHED', 'ACTOR', [R, D, A], 16, 12, 'India'],
    ['Nani', 'TOLLYWOOD', 'MALE', 'ESTABLISHED', 'ACTOR', [C, D, T], 8, 15, 'India'],
    ['Samantha Ruth Prabhu', 'TOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [R, D, A], 20, 18, 'India'],
    ['Rashmika Mandanna', 'TOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [R, C, A], 28, 12, 'India'],
    ['Sai Pallavi', 'TOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, R], 10, 6, 'India'],
    ['Anushka Shetty', 'TOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [A, D, V], 12, 20, 'India'],
    ['Keerthy Suresh', 'TOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, R, C], 11, 8, 'India'],
    ['Pooja Hegde', 'TOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [R, C, M], 14, 8, 'India'],
    ['S. S. Rajamouli', 'TOLLYWOOD', 'MALE', 'ICON', 'DIRECTOR', [A, V, D], 6, 80, 'India'],
    ['Sukumar', 'TOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [A, T, D], 2, 20, 'India'],
    ['Trivikram Srinivas', 'TOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [C, D, A], 2, 25, 'India'],
    ['Koratala Siva', 'TOLLYWOOD', 'MALE', 'ESTABLISHED', 'DIRECTOR', [A, D], 1, 12, 'India'],
    // Kollywood
    ['Rajinikanth', 'KOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [A, D, C], 10, 100, 'India'],
    ['Kamal Haasan', 'KOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [D, C, T], 6, 70, 'India'],
    ['Vijay', 'KOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, C, D], 14, 80, 'India'],
    ['Ajith Kumar', 'KOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, T], 12, 50, 'India'],
    ['Suriya', 'KOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, D, T], 10, 35, 'India'],
    ['Dhanush', 'KOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [D, A, M], 12, 25, 'India'],
    ['Vikram', 'KOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, D, T], 8, 30, 'India'],
    ['Karthi', 'KOLLYWOOD', 'MALE', 'ESTABLISHED', 'ACTOR', [A, C, D], 7, 18, 'India'],
    ['Sivakarthikeyan', 'KOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [C, D, A], 11, 20, 'India'],
    ['Nayanthara', 'KOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [A, D, T], 18, 22, 'India'],
    ['Trisha Krishnan', 'KOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [R, D, C], 12, 15, 'India'],
    ['Jyothika', 'KOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, T], 8, 20, 'India'],
    ['Tamannaah Bhatia', 'KOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [A, R, M], 16, 12, 'India'],
    ['Mani Ratnam', 'KOLLYWOOD', 'MALE', 'ICON', 'DIRECTOR', [D, R, A], 2, 30, 'India'],
    ['Lokesh Kanagaraj', 'KOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [A, T], 3, 12, 'India'],
    ['S. Shankar', 'KOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [A, D, S], 2, 40, 'India'],
    ['Vetrimaaran', 'KOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [D, T], 1, 10, 'India'],
    ['Mari Selvaraj', 'KOLLYWOOD', 'MALE', 'ESTABLISHED', 'DIRECTOR', [D], 1, 4, 'India'],
    // Mollywood
    ['Mohanlal', 'MOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [D, A, C], 8, 40, 'India'],
    ['Mammootty', 'MOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [D, T, A], 6, 35, 'India'],
    ['Fahadh Faasil', 'MOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [T, D, C], 7, 15, 'India'],
    ['Dulquer Salmaan', 'MOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [R, D, C], 12, 18, 'India'],
    ['Prithviraj Sukumaran', 'MOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, D, T], 6, 16, 'India'],
    ['Tovino Thomas', 'MOLLYWOOD', 'MALE', 'ESTABLISHED', 'ACTOR', [A, T, D], 5, 8, 'India'],
    ['Nivin Pauly', 'MOLLYWOOD', 'MALE', 'ESTABLISHED', 'ACTOR', [C, D], 6, 10, 'India'],
    ['Parvathy Thiruvothu', 'MOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [D], 3, 5, 'India'],
    ['Manju Warrier', 'MOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [D, T], 5, 10, 'India'],
    ['Nazriya Nazim', 'MOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [R, C, D], 10, 8, 'India'],
    ['Kalyani Priyadarshan', 'MOLLYWOOD', 'FEMALE', 'RISING', 'ACTOR', [C, R], 8, 4, 'India'],
    ['Lijo Jose Pellissery', 'MOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [D, T, A], 1, 6, 'India'],
    ['Jeethu Joseph', 'MOLLYWOOD', 'MALE', 'ESTABLISHED', 'DIRECTOR', [T, D], 1, 8, 'India'],
    ['Dileesh Pothan', 'MOLLYWOOD', 'MALE', 'ESTABLISHED', 'DIRECTOR', [D, C], 1, 3, 'India'],
    // Bollywood headliners. Duplicates already in the India pack are skipped at build time.
    ['Amitabh Bachchan', 'BOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [D, A], 35, 400, 'India'],
    ['Shah Rukh Khan', 'BOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [R, A, D], 45, 750, 'India'],
    ['Aamir Khan', 'BOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [D, C], 28, 250, 'India'],
    ['Salman Khan', 'BOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, C], 40, 300, 'India'],
    ['Hrithik Roshan', 'BOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, D, M], 30, 150, 'India'],
    ['Ranbir Kapoor', 'BOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [D, R, C], 25, 80, 'India'],
    ['Ranveer Singh', 'BOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [A, C, D], 40, 80, 'India'],
    ['Deepika Padukone', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [D, R, A], 75, 80, 'India'],
    ['Alia Bhatt', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [D, C, R], 80, 40, 'India'],
    ['Priyanka Chopra Jonas', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [A, D, R], 90, 80, 'India'],
    ['Kareena Kapoor Khan', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [R, C, D], 20, 80, 'India'],
    ['Katrina Kaif', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [A, R, C], 18, 40, 'India'],
    ['Tabu', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [D, T], 4, 20, 'India'],
    ['Nawazuddin Siddiqui', 'BOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [D, T, C], 6, 20, 'India'],
    ['Vicky Kaushal', 'BOLLYWOOD', 'MALE', 'ESTABLISHED', 'ACTOR', [D, A, B], 12, 12, 'India'],
    ['Kiara Advani', 'BOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [R, C], 25, 10, 'India'],
    ['Rajkumar Hirani', 'BOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [C, D], 2, 40, 'India'],
    ['Sanjay Leela Bhansali', 'BOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [D, M, R], 3, 50, 'India'],
    ['Zoya Akhtar', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'DIRECTOR', [D, C, M], 2, 15, 'India'],
    ['Anurag Kashyap', 'BOLLYWOOD', 'MALE', 'ESTABLISHED', 'DIRECTOR', [T, D], 2, 12, 'India'],
    ['Karan Johar', 'BOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [R, D, C], 12, 150, 'India'],
    // Nollywood additions
    ['Genevieve Nnaji', 'NOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [D, R], 4, 8, 'Nigeria'],
    ['Funke Akindele', 'NOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [C, D], 12, 15, 'Nigeria'],
    ['Ramsey Nouah', 'NOLLYWOOD', 'MALE', 'A_LIST', 'ACTOR', [D, R, A], 3, 8, 'Nigeria'],
    ['Richard Mofe-Damijo', 'NOLLYWOOD', 'MALE', 'ICON', 'ACTOR', [D], 2, 12, 'Nigeria'],
    ['Omotola Jalade Ekeinde', 'NOLLYWOOD', 'FEMALE', 'A_LIST', 'ACTOR', [D, R], 4, 8, 'Nigeria'],
    ['Rita Dominic', 'NOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, T], 3, 6, 'Nigeria'],
    ['Mercy Johnson', 'NOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [C, D], 6, 5, 'Nigeria'],
    ['Ini Edo', 'NOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, R], 4, 4, 'Nigeria'],
    ['Kunle Afolayan', 'NOLLYWOOD', 'MALE', 'A_LIST', 'DIRECTOR', [D, T], 2, 10, 'Nigeria'],
    ['Kemi Adetiba', 'NOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'DIRECTOR', [T, D, C], 2, 6, 'Nigeria'],
    // Latin and British gaps that the country packs may not spell the same way
    ['Gael García Bernal', 'LATIN', 'MALE', 'A_LIST', 'ACTOR', [D, C], 4, 15, 'Mexico'],
    ['Diego Luna', 'LATIN', 'MALE', 'A_LIST', 'ACTOR', [D, S, A], 5, 20, 'Mexico'],
    ['Salma Hayek', 'LATIN', 'FEMALE', 'A_LIST', 'ACTOR', [D, C, A], 15, 200, 'Mexico'],
    ['Wagner Moura', 'LATIN', 'MALE', 'A_LIST', 'ACTOR', [D, T, A], 4, 12, 'Brazil'],
    ['Alice Braga', 'LATIN', 'FEMALE', 'ESTABLISHED', 'ACTOR', [D, S, T], 3, 8, 'Brazil'],
    ['Guillermo del Toro', 'LATIN', 'MALE', 'ICON', 'DIRECTOR', ['FANTASY', H, D], 4, 80, 'Mexico'],
    ['Alfonso Cuarón', 'LATIN', 'MALE', 'ICON', 'DIRECTOR', [D, S], 2, 50, 'Mexico'],
    ['Cillian Murphy', 'BRITISH', 'MALE', 'A_LIST', 'ACTOR', [D, T], 4, 30, 'Ireland'],
    ['Saoirse Ronan', 'BRITISH', 'FEMALE', 'A_LIST', 'ACTOR', [D, R], 4, 12, 'Ireland'],
    ['Dev Patel', 'BRITISH', 'MALE', 'A_LIST', 'ACTOR', [D, A], 5, 12, 'United Kingdom'],
    // Creators. Careers only. No personal allegations.
    ['Jimmy Donaldson', 'HOLLYWOOD', 'MALE', 'A_LIST', 'YOUTUBER', [C, V], 300, 500, 'United States'],
    ['Mark Fischbach', 'HOLLYWOOD', 'MALE', 'A_LIST', 'YOUTUBER', [H, C], 35, 30, 'United States'],
    ['Imane Anys', 'HOLLYWOOD', 'FEMALE', 'A_LIST', 'STREAMER', [C], 10, 12, 'United States'],
    ['Kai Cenat', 'HOLLYWOOD', 'MALE', 'A_LIST', 'STREAMER', [C], 15, 15, 'United States'],
    ['Darren Watkins Jr.', 'HOLLYWOOD', 'MALE', 'A_LIST', 'STREAMER', [C, V], 40, 20, 'United States'],
    ['Tyler Blevins', 'HOLLYWOOD', 'MALE', 'ESTABLISHED', 'STREAMER', [C], 20, 20, 'United States'],
    ['Felix Lengyel', 'HOLLYWOOD', 'MALE', 'A_LIST', 'STREAMER', [C], 12, 25, 'Canada'],
    ['Emma Chamberlain', 'HOLLYWOOD', 'FEMALE', 'A_LIST', 'YOUTUBER', [C, D], 15, 20, 'United States'],
    ['Charli D\'Amelio', 'HOLLYWOOD', 'FEMALE', 'A_LIST', 'INFLUENCER', [C, M], 150, 20, 'United States'],
    ['Addison Rae', 'HOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'INFLUENCER', [C, M], 40, 15, 'United States'],
    ['Marques Brownlee', 'HOLLYWOOD', 'MALE', 'A_LIST', 'YOUTUBER', [S, C], 20, 25, 'United States'],
    ['Casey Neistat', 'HOLLYWOOD', 'MALE', 'ESTABLISHED', 'YOUTUBER', [D, C], 12, 20, 'United States'],
    ['Lilly Singh', 'HOLLYWOOD', 'FEMALE', 'ESTABLISHED', 'YOUTUBER', [C], 14, 20, 'Canada'],
    ['Felix Kjellberg', 'BRITISH', 'MALE', 'ICON', 'YOUTUBER', [C], 110, 40, 'Sweden'],
    ['Olajide Olatunji', 'BRITISH', 'MALE', 'A_LIST', 'YOUTUBER', [C, M], 25, 40, 'United Kingdom'],
    ['Daniel Middleton', 'BRITISH', 'MALE', 'ESTABLISHED', 'YOUTUBER', [C], 25, 30, 'United Kingdom'],
    ['Bhuvan Bam', 'BOLLYWOOD', 'MALE', 'A_LIST', 'YOUTUBER', [C, D], 25, 8, 'India'],
    ['Ashish Chanchlani', 'BOLLYWOOD', 'MALE', 'A_LIST', 'YOUTUBER', [C], 30, 8, 'India'],
    ['Prajakta Koli', 'BOLLYWOOD', 'FEMALE', 'A_LIST', 'YOUTUBER', [C, R], 10, 4, 'India'],
    ['Ajey Nagar', 'BOLLYWOOD', 'MALE', 'A_LIST', 'YOUTUBER', [C], 40, 10, 'India'],
    ['Gaurav Chaudhary', 'BOLLYWOOD', 'MALE', 'ESTABLISHED', 'YOUTUBER', [S], 22, 8, 'India'],
    ['Gaurav Taneja', 'BOLLYWOOD', 'MALE', 'ESTABLISHED', 'YOUTUBER', [V, C], 8, 6, 'India'],
    ['Nikhil Sharma', 'BOLLYWOOD', 'MALE', 'ESTABLISHED', 'YOUTUBER', [V], 4, 3, 'India'],
    ['Hikaru Kaihatsu', 'JAPANESE', 'MALE', 'A_LIST', 'YOUTUBER', [C], 12, 20, 'Japan'],
    ['Hajime Syacho', 'JAPANESE', 'MALE', 'A_LIST', 'YOUTUBER', [C], 10, 15, 'Japan'],
    ['Li Ziqi', 'CHINESE', 'FEMALE', 'A_LIST', 'YOUTUBER', [D], 20, 15, 'China'],
    ['Tzuyang', 'KOREAN', 'FEMALE', 'ESTABLISHED', 'YOUTUBER', [C], 8, 4, 'South Korea'],
    ['Lee Sang-hyeok', 'KOREAN', 'MALE', 'A_LIST', 'STREAMER', [C], 8, 30, 'South Korea'],
    ['Ibai Llanos', 'LATIN', 'MALE', 'A_LIST', 'STREAMER', [C], 15, 10, 'Spain'],
    ['Rubén Doblas', 'LATIN', 'MALE', 'A_LIST', 'YOUTUBER', [C], 40, 20, 'Spain'],
    ['Luisito Comunica', 'LATIN', 'MALE', 'A_LIST', 'YOUTUBER', [V, C], 40, 12, 'Mexico'],
    ['Felipe Neto', 'LATIN', 'MALE', 'A_LIST', 'YOUTUBER', [C], 45, 20, 'Brazil'],
    ['Whindersson Nunes', 'LATIN', 'MALE', 'A_LIST', 'YOUTUBER', [C], 40, 15, 'Brazil'],
    ['Khabane Lame', 'BRITISH', 'MALE', 'A_LIST', 'INFLUENCER', [C], 160, 20, 'Italy'],
    ['Lucas Hauchard', 'BRITISH', 'MALE', 'A_LIST', 'YOUTUBER', [C], 18, 15, 'France'],
    ['Mark Angel', 'NOLLYWOOD', 'MALE', 'ESTABLISHED', 'YOUTUBER', [C], 8, 4, 'Nigeria'],
    ['Tunde Ednut', 'NOLLYWOOD', 'MALE', 'ESTABLISHED', 'INFLUENCER', [C, M], 10, 5, 'Nigeria'],
];

export const TALENT_ROSTER: TalentRosterEntry[] = SEEDS.map(build);

const OVERRIDE = new Map(TALENT_ROSTER.map(row => [slug(row.realName), row.industry]));

export const rosterIndustryOverride = (name: string): FilmIndustryId | undefined => OVERRIDE.get(slug(name));

export const talentDisplayName = (entry: Pick<TalentRosterEntry, 'realName' | 'fictionalName'>): string =>
    USE_REAL_NAMES ? entry.realName : entry.fictionalName;

export const talentAvatar = (entry: Pick<TalentRosterEntry, 'realName'>): string =>
    cartoonAvatarUrl(entry.realName);

export const rosterByIndustry = (industry: FilmIndustryId) =>
    TALENT_ROSTER.filter(row => row.industry === industry);
