const DB_NAME = 'IndustryGlobeMediaDB';
const LEGACY_DB_NAME = 'ActorEmpireMediaDB';
const STORE_NAME = 'media';
const DB_VERSION = 1;

export interface StoredMediaMeta {
    id: string;
    kind: 'youtube_thumbnail' | 'instagram_post' | 'x_post' | 'profile_image' | 'other';
    mimeType: string;
    size: number;
    createdAt: number;
    width?: number;
    height?: number;
}

interface StoredMediaRecord extends StoredMediaMeta {
    blob: Blob;
}

const openMediaDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveMediaBlob = async (
    id: string,
    blob: Blob,
    meta: Omit<StoredMediaMeta, 'id' | 'size' | 'createdAt' | 'mimeType'>
): Promise<StoredMediaMeta> => {
    const db = await openMediaDB();
    const record: StoredMediaRecord = {
        id,
        blob,
        kind: meta.kind,
        width: meta.width,
        height: meta.height,
        mimeType: blob.type || 'application/octet-stream',
        size: blob.size,
        createdAt: Date.now()
    };

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(record);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });

    const { blob: _blob, ...savedMeta } = record;
    return savedMeta;
};

export const loadMediaBlob = async (id: string): Promise<Blob | null> => {
    const current = await readMediaBlob(DB_NAME, id);
    if (current) return current;
    return readMediaBlob(LEGACY_DB_NAME, id);
};

const readMediaBlob = async (name: string, id: string): Promise<Blob | null> => {
    const db = await new Promise<IDBDatabase | null>((resolve) => {
        const request = indexedDB.open(name, DB_VERSION);
        request.onerror = () => resolve(null);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            if (name !== DB_NAME) {
                request.transaction?.abort();
                resolve(null);
                return;
            }
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
    if (!db || !db.objectStoreNames.contains(STORE_NAME)) return null;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as StoredMediaRecord | undefined)?.blob || null);
    });
};

export const deleteMediaBlob = async (id: string): Promise<void> => {
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const pruneMediaStore = async (
    kind: StoredMediaMeta['kind'],
    options: { maxItems?: number; maxBytes?: number }
): Promise<void> => {
    const db = await openMediaDB();
    const records = await new Promise<StoredMediaRecord[]>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as StoredMediaRecord[]).filter(record => record.kind === kind));
    });

    const sorted = records.sort((a, b) => b.createdAt - a.createdAt);
    const maxItems = options.maxItems ?? Number.POSITIVE_INFINITY;
    const maxBytes = options.maxBytes ?? Number.POSITIVE_INFINITY;
    let keptBytes = 0;
    const deleteIds: string[] = [];

    sorted.forEach((record, index) => {
        keptBytes += record.size;
        if (index >= maxItems || keptBytes > maxBytes) {
            deleteIds.push(record.id);
        }
    });

    if (deleteIds.length === 0) return;

    await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        deleteIds.forEach(id => store.delete(id));
        transaction.onerror = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
    });
};
