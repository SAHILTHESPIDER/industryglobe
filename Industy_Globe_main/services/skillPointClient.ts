import { Capacitor, registerPlugin } from '@capacitor/core';
import { PRODUCT_CATEGORY, Purchases } from '@revenuecat/purchases-capacitor';
import { Player, SkillPointReceipt } from '../types';
import { ensureFirebaseUser } from './firebaseService';
import {
    packById,
    packByStoreId,
    SkillPointPack,
    SkillPointProductId,
    SKILL_POINT_PACKS,
} from './skillPointLedger';

interface NativeStoreProduct {
    productId: string;
    title?: string;
    priceLabel?: string;
}

interface PurchasesPlugin {
    getProducts(options: { productIds: string[] }): Promise<{ products?: NativeStoreProduct[] }>;
    purchaseProduct(options: { productId: string }): Promise<{ cancelled?: boolean; pending?: boolean; productId?: string; transactionId?: string }>;
    restorePurchases(): Promise<{ productIds?: string[] }>;
}

const PurchasesPlugin = registerPlugin<PurchasesPlugin>('Purchases');

const revenueCatKey = () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return import.meta.env.VITE_REVENUECAT_IOS_KEY || '';
    if (platform === 'android') return import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';
    return '';
};

let revenueCatConfigured = false;

const ensureRevenueCat = async (): Promise<boolean> => {
    const apiKey = revenueCatKey();
    if (!apiKey || !Capacitor.isNativePlatform()) return false;
    if (revenueCatConfigured) return true;
    const auth = await ensureFirebaseUser();
    await Purchases.configure({ apiKey, appUserID: auth?.localId || null });
    revenueCatConfigured = true;
    return true;
};

export const skillStoreProductIds = () => SKILL_POINT_PACKS.map(pack => pack.storeProductId);

export const isIndiaLocale = (): boolean => {
    try {
        const language = typeof navigator !== 'undefined' ? navigator.language || '' : '';
        if (/(-|_)IN$/i.test(language) || /^hi\b/i.test(language)) return true;
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta';
    } catch {
        return false;
    }
};

export const devSkillPurchasesEnabled = (): boolean => import.meta.env.VITE_SKILL_POINT_IAP_DEV === 'true';

const functionRegion = () => import.meta.env.VITE_SKILL_POINT_FUNCTION_REGION || 'us-central1';

const projectId = 'actor-empire-1ff1d';

const callableUrl = (name: string) =>
    `https://${functionRegion()}-${projectId}.cloudfunctions.net/${name}`;

export interface StorePurchaseResult {
    ok: boolean;
    cancelled?: boolean;
    mobileOnly?: boolean;
    devTest?: boolean;
    productId?: SkillPointProductId;
    transactionId?: string;
    platform?: string;
    message: string;
}

export interface VerifiedCredit {
    ok: boolean;
    premiumBalance: number;
    characterUnlock: boolean;
    points: number;
    alreadyCredited: boolean;
    receipt?: SkillPointReceipt;
    message: string;
}

const legacyStore = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Purchases');

export const loadSkillStorePrices = async (): Promise<Record<string, string>> => {
    try {
        if (await ensureRevenueCat()) {
            const result = await Purchases.getProducts({
                productIdentifiers: skillStoreProductIds(),
                type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
            });
            const prices: Record<string, string> = {};
            (result?.products || []).forEach(product => {
                const pack = packByStoreId(product.identifier);
                if (pack && product.priceString) prices[pack.id] = product.priceString;
            });
            if (Object.keys(prices).length) return prices;
        }
    } catch {
        // Fall through to the existing store plugin.
    }
    if (!legacyStore()) return {};
    try {
        const result = await PurchasesPlugin.getProducts({ productIds: skillStoreProductIds() });
        const prices: Record<string, string> = {};
        (result?.products || []).forEach(product => {
            const pack = packByStoreId(product.productId);
            if (pack && product.priceLabel) prices[pack.id] = product.priceLabel;
        });
        return prices;
    } catch {
        return {};
    }
};

/** Asks the store for a purchase. Does not add skill points. */
export const requestSkillPointPurchase = async (productId: SkillPointProductId): Promise<StorePurchaseResult> => {
    const pack = packById(productId);
    if (!pack) return { ok: false, message: 'That pack is not in the catalog.' };

    if (!Capacitor.isNativePlatform()) {
        if (devSkillPurchasesEnabled()) {
            const auth = await ensureFirebaseUser();
            const nonce = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`;
            return {
                ok: true,
                devTest: true,
                productId,
                transactionId: `dev_${auth?.localId || 'local'}_${productId}_${nonce}`,
                platform: 'dev',
                message: 'Dev purchase is waiting for the server to confirm it.',
            };
        }
        return {
            ok: false,
            mobileOnly: true,
            message: 'Purchases are available in the Industry Globe mobile app.',
        };
    }

    try {
        if (await ensureRevenueCat()) {
            const listed = await Purchases.getProducts({
                productIdentifiers: [pack.storeProductId],
                type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
            });
            const product = listed.products?.find(item => item.identifier === pack.storeProductId);
            if (!product) return { ok: false, message: 'That pack is not available from the store yet.' };
            const bought = await Purchases.purchaseStoreProduct({ product });
            const transactionId = bought.transaction?.transactionIdentifier || '';
            if (!transactionId) return { ok: false, message: 'The store did not return a transaction. Points were not added.' };
            return {
                ok: true,
                productId,
                transactionId,
                platform: Capacitor.getPlatform(),
                message: 'Store purchase received. Waiting for verification.',
            };
        }
    } catch (error: unknown) {
        const cancelled = Boolean((error as { userCancelled?: boolean })?.userCancelled) || /cancel/i.test(error instanceof Error ? error.message : '');
        if (cancelled) return { ok: false, cancelled: true, message: 'Purchase cancelled.' };
        if (revenueCatKey()) {
            return { ok: false, message: error instanceof Error ? error.message : 'Purchase failed.' };
        }
    }

    if (!legacyStore()) {
        return { ok: false, message: 'Purchases are not available in this build yet. Update the app and try again.' };
    }

    try {
        const result = await PurchasesPlugin.purchaseProduct({ productId: pack.storeProductId });
        if (result?.cancelled) return { ok: false, cancelled: true, message: 'Purchase cancelled.' };
        if (result?.pending) return { ok: false, message: 'Purchase is pending approval. Points stay uncredited until the store confirms it.' };
        const transactionId = result?.transactionId || '';
        if (!transactionId) return { ok: false, message: 'The store did not return a transaction. Points were not added.' };
        return {
            ok: true,
            productId,
            transactionId,
            platform: Capacitor.getPlatform(),
            message: 'Store purchase received. Waiting for verification.',
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Purchase failed.';
        const cancelled = /cancel/i.test(message);
        return { ok: false, cancelled, message: cancelled ? 'Purchase cancelled.' : message };
    }
};

const postFunction = async <T,>(name: string, data: Record<string, unknown>): Promise<{ ok: boolean; result?: T; message: string }> => {
    const auth = await ensureFirebaseUser();
    if (!auth?.idToken) {
        return { ok: false, message: 'Sign-in is required before purchased points can be added.' };
    }
    try {
        const response = await fetch(callableUrl(name), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${auth.idToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = payload?.error?.message || payload?.error || `The server did not confirm the purchase (${response.status}).`;
            return { ok: false, message: String(message) };
        }
        return { ok: true, result: (payload?.result || payload) as T, message: 'Confirmed.' };
    } catch (error: unknown) {
        return { ok: false, message: error instanceof Error ? error.message : 'Could not reach the purchase server.' };
    }
};

interface ServerWallet {
    premiumBalance?: number;
    characterUnlock?: boolean;
    points?: number;
    alreadyCredited?: boolean;
    receipt?: { transactionId: string; productId: string; points: number; platform: string };
    message?: string;
}

const toVerified = (wallet: ServerWallet | undefined, fallback: string): VerifiedCredit => {
    if (!wallet || typeof wallet.premiumBalance !== 'number' || !Number.isFinite(wallet.premiumBalance)) {
        return { ok: false, premiumBalance: 0, characterUnlock: false, points: 0, alreadyCredited: false, message: fallback };
    }
    const receipt = wallet.receipt
        ? {
            transactionId: wallet.receipt.transactionId,
            productId: wallet.receipt.productId,
            points: wallet.receipt.points,
            platform: wallet.receipt.platform,
            at: new Date().toISOString(),
        } satisfies SkillPointReceipt
        : undefined;
    return {
        ok: true,
        premiumBalance: wallet.premiumBalance,
        characterUnlock: wallet.characterUnlock === true,
        points: wallet.points || 0,
        alreadyCredited: wallet.alreadyCredited === true,
        receipt,
        message: wallet.alreadyCredited ? 'This purchase was already on the account.' : `+${wallet.points || 0} skill points confirmed.`,
    };
};

/** Credits points only with the balance the server returns. */
export const confirmSkillPointCredit = async (purchase: StorePurchaseResult): Promise<VerifiedCredit> => {
    if (!purchase.ok || !purchase.productId || !purchase.transactionId) {
        return { ok: false, premiumBalance: 0, characterUnlock: false, points: 0, alreadyCredited: false, message: purchase.message };
    }
    const response = await postFunction<ServerWallet>('creditSkillPointPack', {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        platform: purchase.platform || 'store',
        devTest: purchase.devTest === true,
    });
    if (!response.ok) {
        return { ok: false, premiumBalance: 0, characterUnlock: false, points: 0, alreadyCredited: false, message: response.message };
    }
    return toVerified(response.result, 'The server confirmed nothing. Points were not added.');
};

export const restoreSkillPointPurchases = async (): Promise<VerifiedCredit> => {
    if (!Capacitor.isNativePlatform()) {
        return {
            ok: false,
            premiumBalance: 0,
            characterUnlock: false,
            points: 0,
            alreadyCredited: false,
            message: 'Restore is available in the mobile app, after a store purchase.',
        };
    }
    let productIds: string[] = [];
    try {
        if (await ensureRevenueCat()) {
            const restored = await Purchases.restorePurchases();
            productIds = restored.customerInfo?.nonSubscriptionTransactions?.map(item => item.productIdentifier) || [];
        } else if (legacyStore()) {
            const restored = await PurchasesPlugin.restorePurchases();
            productIds = restored?.productIds || [];
        }
    } catch (error: unknown) {
        return {
            ok: false,
            premiumBalance: 0,
            characterUnlock: false,
            points: 0,
            alreadyCredited: false,
            message: error instanceof Error ? error.message : 'Restore failed.',
        };
    }
    const response = await postFunction<ServerWallet>('restoreSkillPointPurchases', { productIds });
    if (!response.ok) {
        return { ok: false, premiumBalance: 0, characterUnlock: false, points: 0, alreadyCredited: false, message: response.message };
    }
    return toVerified(response.result, 'Nothing new was confirmed.');
};

export const readPremiumWallet = async (): Promise<VerifiedCredit | null> => {
    const response = await postFunction<ServerWallet>('readSkillPointWallet', {});
    if (!response.ok) return null;
    const verified = toVerified(response.result, '');
    return verified.ok ? verified : null;
};

export const spendPremiumOnServer = async (amount: number, requestId: string): Promise<VerifiedCredit> => {
    const response = await postFunction<ServerWallet>('spendPremiumSkillPoints', { amount, requestId });
    if (!response.ok) {
        return { ok: false, premiumBalance: 0, characterUnlock: false, points: 0, alreadyCredited: false, message: response.message };
    }
    return toVerified(response.result, 'The server did not spend the points.');
};

export const saveCharacterProfile = async (player: Player): Promise<void> => {
    const { savePlayerCharacterProfile } = await import('./firebaseService');
    const character = player.character;
    if (!character) return;
    await savePlayerCharacterProfile({
        name: player.name,
        gender: player.gender,
        age: player.age,
        birthplace: character.birthplace,
        background: character.background,
        trait: character.trait,
        appearance: character.appearance,
        homeIndustry: player.homeIndustryId || '',
        handle: player.instagram?.handle || '',
        bio: player.youtube?.about || '',
        updatedAt: new Date().toISOString(),
    });
};

export type { SkillPointPack };
