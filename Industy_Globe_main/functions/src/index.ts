import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import {
    creditVerifiedPack,
    emptyPremiumLedger,
    packById,
    packByStoreId,
    PremiumLedger,
    SkillReceipt,
    spendPremiumPoints,
    SKILL_POINT_PACKS,
} from '../../services/skillPointLedger';

if (!getApps().length) initializeApp();

const db = () => getFirestore();

const walletRef = (uid: string) => db().doc(`players/${uid}/wallet/skillPoints`);

const readLedger = async (uid: string): Promise<PremiumLedger> => {
    const snap = await walletRef(uid).get();
    if (!snap.exists) return emptyPremiumLedger();
    const data = snap.data() || {};
    const receipts = (data.receipts && typeof data.receipts === 'object') ? data.receipts as PremiumLedger['receipts'] : {};
    const spends = (data.spends && typeof data.spends === 'object') ? data.spends as PremiumLedger['spends'] : {};
    return {
        premiumBalance: Math.max(0, Math.floor(Number(data.premiumBalance) || 0)),
        lifetimeCredited: Math.max(0, Math.floor(Number(data.lifetimeCredited) || 0)),
        lifetimeSpent: Math.max(0, Math.floor(Number(data.lifetimeSpent) || 0)),
        characterUnlock: data.characterUnlock === true,
        receipts,
        spends,
    };
};

const writeLedger = async (uid: string, ledger: PremiumLedger) => {
    await walletRef(uid).set({
        premiumBalance: ledger.premiumBalance,
        lifetimeCredited: ledger.lifetimeCredited,
        lifetimeSpent: ledger.lifetimeSpent,
        characterUnlock: ledger.characterUnlock,
        receipts: ledger.receipts,
        spends: ledger.spends,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
};

const publicWallet = (ledger: PremiumLedger, points = 0, alreadyCredited = false, receipt?: SkillReceipt) => ({
    premiumBalance: ledger.premiumBalance,
    characterUnlock: ledger.characterUnlock,
    points,
    alreadyCredited,
    receipt: receipt ? {
        transactionId: receipt.transactionId,
        productId: receipt.productId,
        points: receipt.points,
        platform: receipt.platform,
    } : undefined,
});

const requireUid = (uid?: string) => {
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    return uid;
};

interface RevenuePurchase {
    store_transaction_id?: string;
    id?: string;
}

const verifiedTransaction = async (uid: string, productId: string, transactionId: string): Promise<boolean> => {
    const secret = process.env.REVENUECAT_SECRET_API_KEY;
    if (!secret) throw new HttpsError('failed-precondition', 'RevenueCat is not configured on the server.');
    const pack = packById(productId);
    if (!pack) return false;
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
        headers: { Authorization: `Bearer ${secret}` },
    });
    if (!response.ok) throw new HttpsError('unavailable', 'The store could not be reached to confirm this purchase.');
    const body = await response.json() as { subscriber?: { non_subscriptions?: Record<string, RevenuePurchase[]> } };
    const purchases = body?.subscriber?.non_subscriptions?.[pack.storeProductId] || [];
    return purchases.some(purchase => purchase.store_transaction_id === transactionId || purchase.id === transactionId);
};

export const creditSkillPointPack = onCall(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const productId = String(request.data?.productId || '');
    const transactionId = String(request.data?.transactionId || '');
    const platform = String(request.data?.platform || 'store');
    const devTest = request.data?.devTest === true;
    if (!devTest) {
        const confirmed = await verifiedTransaction(uid, productId, transactionId);
        if (!confirmed) throw new HttpsError('permission-denied', 'The store has not confirmed this purchase.');
    }
    const current = await readLedger(uid);
    const outcome = creditVerifiedPack(current, {
        productId,
        transactionId,
        platform,
        devTest,
        devGrantsEnabled: process.env.SKILL_POINT_DEV_GRANTS === 'true',
    });
    if (!outcome.ok) throw new HttpsError('failed-precondition', outcome.error || 'Purchase was not credited.');
    if (!outcome.alreadyCredited) await writeLedger(uid, outcome.ledger);
    const receipt = outcome.ledger.receipts[transactionId];
    return publicWallet(outcome.ledger, outcome.points, outcome.alreadyCredited, receipt);
});

export const spendPremiumSkillPoints = onCall(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const amount = Number(request.data?.amount);
    const requestId = String(request.data?.requestId || '');
    const current = await readLedger(uid);
    const outcome = spendPremiumPoints(current, amount, requestId);
    if (!outcome.ok) throw new HttpsError('failed-precondition', outcome.error || 'Points were not spent.');
    if (!outcome.alreadySpent) await writeLedger(uid, outcome.ledger);
    return publicWallet(outcome.ledger, outcome.alreadySpent ? current.spends[requestId] || amount : amount, outcome.alreadySpent);
});

export const readSkillPointWallet = onCall(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const ledger = await readLedger(uid);
    return publicWallet(ledger);
});

export const restoreSkillPointPurchases = onCall(async (request) => {
    const uid = requireUid(request.auth?.uid);
    const secret = process.env.REVENUECAT_SECRET_API_KEY;
    if (!secret) throw new HttpsError('failed-precondition', 'RevenueCat is not configured on the server.');
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
        headers: { Authorization: `Bearer ${secret}` },
    });
    if (!response.ok) throw new HttpsError('unavailable', 'The store could not be reached to restore purchases.');
    const body = await response.json() as { subscriber?: { non_subscriptions?: Record<string, RevenuePurchase[]> } };
    const groups = body?.subscriber?.non_subscriptions || {};
    let ledger = await readLedger(uid);
    let added = 0;
    for (const pack of SKILL_POINT_PACKS) {
        const purchases = groups[pack.storeProductId] || [];
        for (const purchase of purchases) {
            const transactionId = purchase.store_transaction_id || purchase.id;
            if (!transactionId) continue;
            const outcome = creditVerifiedPack(ledger, {
                productId: pack.id,
                transactionId,
                platform: 'restore',
                devTest: false,
            });
            if (!outcome.ok) continue;
            if (!outcome.alreadyCredited) added += outcome.points;
            ledger = outcome.ledger;
        }
    }
    await writeLedger(uid, ledger);
    const hinted = Array.isArray(request.data?.productIds) ? request.data.productIds as string[] : [];
    const known = hinted.map(id => packByStoreId(id)).filter(Boolean);
    return {
        ...publicWallet(ledger, added, added === 0),
        restoredPacks: known.map(pack => pack!.id),
        message: added > 0 ? 'Confirmed purchases were added.' : 'No new skill-point purchases were waiting.',
    };
});
