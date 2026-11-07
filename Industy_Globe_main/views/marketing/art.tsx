import React, { useState } from 'react';
import type { MarketingFeedPost, MarketingPoster } from '../../types';
import { formatCount, themeById } from '../../services/marketing/engine';

const PosterFace: React.FC<{ poster: MarketingPoster; compact?: boolean }> = ({ poster, compact }) => {
    const [failed, setFailed] = useState(false);
    const src = !failed && poster.image && /^(data:image\/|https?:|blob:)/.test(poster.image) ? poster.image : '';
    return (
        <div className={`poster${compact ? ' compact' : ''}`} data-layout={poster.layoutId} style={{ background: poster.gradient, color: poster.ink }}>
            {src ? <img className="art" src={src} alt="" onError={() => setFailed(true)} /> : null}
            <div className="veil" />
            <div className="copy">
                {poster.banner ? <div className="banner" style={{ color: poster.accent }}>{poster.banner}</div> : null}
                <div className="ribbon">{poster.statusLine}</div>
                <h3>{poster.title}</h3>
                {poster.tagline && poster.layoutId !== 'strip' ? <div className="tag">{poster.tagline}</div> : null}
                {poster.castLine ? <div className="cast">{poster.castLine}</div> : null}
                {poster.dateLine ? <div className="date" style={{ color: poster.accent }}>{poster.dateLine}</div> : null}
            </div>
        </div>
    );
};

export const BillboardScene: React.FC<{ poster: MarketingPoster; sizeId: string }> = ({ poster, sizeId }) => (
    <div className="board-scene" data-size={sizeId} data-testid="billboard-preview">
        <div className="board-sky" />
        <div className="board-city" />
        <div className="board-frame">
            <PosterFace poster={poster} />
        </div>
    </div>
);

export const StageScene: React.FC<{ poster: MarketingPoster; themeId: string }> = ({ poster, themeId }) => {
    const theme = themeById(themeId);
    return (
        <div className="stage-scene" data-testid="stage-preview" style={{ background: `radial-gradient(circle at 50% 20%, ${theme.wash}55, transparent 42%), #07060a` }}>
            <div className="curtain left" style={{ background: `linear-gradient(90deg, ${theme.curtain}, transparent)` }} />
            <div className="curtain right" style={{ background: `linear-gradient(270deg, ${theme.curtain}, transparent)` }} />
            <div className="spot" style={{ background: theme.wash }} />
            <div className="stage-card">
                <div className="banner" style={{ color: theme.wash, letterSpacing: '0.16em', fontSize: 11, textTransform: 'uppercase' }}>{poster.banner}</div>
                <div className="ribbon" style={{ display: 'inline-block', marginTop: 8, border: `1px solid ${theme.wash}`, padding: '3px 8px', fontSize: 10, letterSpacing: '0.14em' }}>{poster.statusLine}</div>
                <h3>{poster.title}</h3>
                <div className="tag">{poster.tagline}</div>
                {poster.castLine ? <div style={{ marginTop: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}>{poster.castLine}</div> : null}
                {poster.dateLine ? <div style={{ marginTop: 8, color: theme.wash }}>{poster.dateLine}</div> : null}
            </div>
        </div>
    );
};

export const TourMap: React.FC<{ stops: { id: string; name: string; x: number; y: number; note: string }[] }> = ({ stops }) => (
    <div className="tour-scene" data-testid="tour-preview">
        <div className="tour-map">
            {stops.map(stop => (
                <div key={stop.id + stop.note} className="tour-stop" style={{ left: `${stop.x}%`, top: `${stop.y}%` }}>
                    <i />
                    <b>{stop.name}</b>
                    <span>{stop.note}</span>
                </div>
            ))}
        </div>
    </div>
);

const Avatar: React.FC<{ name: string; hue: number; square?: boolean }> = ({ name, hue, square }) => (
    <div className="avatar" style={{ background: `hsl(${hue} 70% 62%)`, borderRadius: square ? 8 : undefined }}>{(name || '?').slice(0, 1)}</div>
);

export const FrameCard: React.FC<{ post: MarketingFeedPost }> = ({ post }) => (
    <article className="frame-card" data-testid="frame-post">
        <div className="frame-head">
            <Avatar name={post.ownerName} hue={post.avatarHue} />
            <div>
                <strong>{post.ownerName}</strong>
                <div className="handle">{post.handle}{post.rival ? ' · rival desk' : ''}</div>
            </div>
        </div>
        <div className="frame-art" style={{ position: 'relative' }}>
            {post.format === 'REEL' ? <div className="reel-tag">REEL</div> : null}
            <PosterFace poster={post.poster} />
        </div>
        <div className="frame-foot">
            <span>{formatCount(post.likes)} likes</span>
            <span>{formatCount(post.comments)} comments</span>
            <span>{formatCount(post.shares)} shares</span>
        </div>
        <p>{post.caption}</p>
        <div className="comments">{post.commentList.map(line => <div key={line}>{line}</div>)}</div>
    </article>
);

export const WireCard: React.FC<{ post: MarketingFeedPost }> = ({ post }) => (
    <article className="wire-card" data-testid="wire-post">
        <Avatar name={post.ownerName} hue={post.avatarHue} square />
        <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{post.ownerName}</strong> <span className="handle">{post.handle}</span>
            <p style={{ margin: '6px 0' }}>{post.caption}</p>
            <div style={{ borderRadius: 16, overflow: 'hidden', height: 140 }}>
                <PosterFace poster={post.poster} compact />
            </div>
            <div className="wire-stats">
                <span>{formatCount(post.comments)} replies</span>
                <span>{formatCount(post.reposts)} reposts</span>
                <span>{formatCount(post.likes)} likes</span>
            </div>
            <div className="comments">{post.commentList.slice(0, 2).map(line => <div key={line}>{line}</div>)}</div>
        </div>
    </article>
);

export const PosterThumb: React.FC<{ poster: MarketingPoster }> = ({ poster }) => (
    <div className="mini"><PosterFace poster={{ ...poster, tagline: '' }} compact /></div>
);
