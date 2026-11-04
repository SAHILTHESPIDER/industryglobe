import type { ReactNode } from 'react';

/** Scrolls its children. Reduced motion disables the animation in CSS. */
export const LiveFeed = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={`motion-live-feed ${className}`.trim()}>{children}</div>
);

/** Class for a short shake. Put it on the screen root when controversy spikes. */
export const heatClass = (hot: boolean) => hot ? 'motion-heat' : '';
