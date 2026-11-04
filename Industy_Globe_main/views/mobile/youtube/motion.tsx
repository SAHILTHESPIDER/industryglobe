import { BounceButton, CountdownMark, CountUp, Sparkline } from '../../../components/motion';
import { formatCompact, formatMoney } from './bits';

export { Confetti, LiveFeed, ScreenFade, heatClass, tap, useLightHaptic as useAwardHaptic } from '../../../components/motion';

export const RollNumber = ({ value, money = false }: { value: number; money?: boolean }) => (
    <CountUp value={value} format={next => money ? formatMoney(next) : formatCompact(next)} />
);

export const AnimatedSpark = Sparkline;

export const SubscribeTap = ({ on, children, className, onClick, subscribeId, ...label }: { on: boolean; children: React.ReactNode; className?: string; onClick?: () => void; subscribeId?: string; 'aria-label'?: string }) => (
    <BounceButton on={on} className={className} onClick={onClick} subscribeId={subscribeId} label={label['aria-label']}>{children}</BounceButton>
);

export const LikeBurst = ({ on, children, className, onClick }: { on: boolean; children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <BounceButton heart on={on} className={className} onClick={onClick}>{children}</BounceButton>
);

export const PremiereCountdown = ({ weeks }: { weeks: number | null }) => (
    <CountdownMark weeks={weeks} />
);
