import React, { useEffect, useState } from 'react';
import { YoutubeVideo } from '../../../types';
import { loadMediaBlob } from '../../../services/mediaStorage';
import { Thumb } from './bits';
import { badgeFor, stillKeyFor, STILL } from './stills';

const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_HEIGHT = 720;
export const MAX_THUMBNAIL_SOURCE_SIZE = 12 * 1024 * 1024;
export type ThumbnailFitMode = 'cover' | 'contain';

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Could not encode thumbnail.'));
        }, type, quality);
    });

export const createFittedThumbnailBlob = async (
    sourceUrl: string,
    zoom: number,
    offsetX: number,
    offsetY: number,
    fitMode: ThumbnailFitMode,
): Promise<Blob> => {
    const image = await loadImageElement(sourceUrl);
    const canvas = document.createElement('canvas');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable.');
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
    const baseScale = fitMode === 'contain'
        ? Math.min(THUMBNAIL_WIDTH / image.naturalWidth, THUMBNAIL_HEIGHT / image.naturalHeight)
        : Math.max(THUMBNAIL_WIDTH / image.naturalWidth, THUMBNAIL_HEIGHT / image.naturalHeight);
    const finalScale = baseScale * zoom;
    const drawWidth = image.naturalWidth * finalScale;
    const drawHeight = image.naturalHeight * finalScale;
    const maxPanX = Math.max(0, (drawWidth - THUMBNAIL_WIDTH) / 2);
    const maxPanY = Math.max(0, (drawHeight - THUMBNAIL_HEIGHT) / 2);
    const panX = Math.max(-maxPanX, Math.min(maxPanX, offsetX));
    const panY = Math.max(-maxPanY, Math.min(maxPanY, offsetY));
    ctx.drawImage(image, (THUMBNAIL_WIDTH - drawWidth) / 2 + panX, (THUMBNAIL_HEIGHT - drawHeight) / 2 + panY, drawWidth, drawHeight);
    return canvasToBlob(canvas, 'image/webp', 0.78);
};

export const Face: React.FC<{ video: YoutubeVideo; ratio?: string; badge?: string; badgeC?: string; progress?: number; plain?: boolean; big?: string; sub?: string }> = ({ video, ratio = '16/9', badge, badgeC, progress, plain, big, sub }) => {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
        let url: string | null = null;
        let cancelled = false;
        if (!video.thumbnailMediaId) {
            setSrc(null);
            return undefined;
        }
        loadMediaBlob(video.thumbnailMediaId).then(blob => {
            if (!blob || cancelled) return;
            url = URL.createObjectURL(blob);
            setSrc(url);
        }).catch(() => { if (!cancelled) setSrc(null); });
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [video.thumbnailMediaId]);

    const mark = badgeFor(video);
    const shown = progress ?? video.watchProgress;
    const fallback = STILL[stillKeyFor(video)];
    const label = badge ?? (plain ? undefined : mark.label);
    const color = badgeC || mark.color;
    if (src) {
        return (
            <div className="th" style={{ aspectRatio: ratio }}>
                <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="thgrad" />
                {label && <span className={`tb tb-${color}`}>{label}</span>}
                {!plain && big && <div className="thbig">{big}{sub && <small>{sub}</small>}</div>}
                <span className="dur">{video.durationLabel || (video.isShort ? '0:18' : '12:04')}</span>
                {shown ? <div className="thprog"><i style={{ width: `${shown}%` }} /></div> : null}
            </div>
        );
    }
    return (
        <Thumb
            src={fallback}
            ratio={ratio}
            badge={label}
            badgeC={color}
            title={plain ? undefined : big}
            sub={sub}
            dur={video.durationLabel || (video.isShort ? '0:18' : '12:04')}
            progress={shown}
            position={stillKeyFor(video) === 'hero' ? '70% 30%' : stillKeyFor(video) === 'song' ? 'center 30%' : 'center'}
        />
    );
};
