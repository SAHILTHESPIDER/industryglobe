import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { bootstrapFirebase, installGlobalTelemetryHandlers } from './services/firebaseService';
import { YoutubeShowcase } from './views/mobile/youtube/showcase';
import { EmpirePreview, PreviewScreen } from './views/ownPlatform/EmpirePreview';
import { PlatformPreview, PlatformPreviewScreen } from './views/ownPlatform/platform/PlatformPreview';
import { LocalizationPreview, LocPreviewScreen } from './views/ownPlatform/localization/LocalizationPreview';
import { LaunchPreview, LaunchPreviewScreen } from './views/marketing/launch/LaunchPreview';
import { RunPreview, RunPreviewScreen } from './views/marketing/run/RunPreview';
import { BrandFoundry } from './views/brand/BrandFoundry';
import { streamFilingFee } from './services/brand/founding';
import { MarketingPreview } from './views/marketing/MarketingPreview';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

void bootstrapFirebase();
installGlobalTelemetryHandlers();

const root = ReactDOM.createRoot(rootElement);
const params = new URLSearchParams(window.location.search);
const yt = params.get('yt');
const empirePreview = params.get('empire');
const previewNames = ['colour', 'team', 'hire', 'ownership', 'papers', 'certificate', 'locked', 'dossier', 'contract', 'renew', 'stake'] as const;
const platformNames = ['plat-tech', 'plat-tech-detail', 'plat-tech-ladder', 'plat-network', 'plat-offer-pre', 'plat-offer-post', 'plat-deals', 'plat-product', 'plat-status'] as const;
const locNames = ['loc-grid', 'loc-detail', 'loc-levels', 'loc-complete'] as const;
const launchNames = ['launch-where', 'launch-how', 'launch-creative', 'launch-budget', 'launch-review', 'launch-drone', 'launch-reveal', 'launch-eiffel', 'launch-light', 'launch-fest', 'launch-stunt', 'launch-results', 'launch-metro', 'launch-bus', 'launch-board', 'launch-feed', 'launch-cinema', 'launch-live', 'launch-stadium', 'launch-airport'] as const;
const runNames = ['run-grid', 'run-scenes', 'run-burj', 'run-board', 'run-drone', 'run-fest', 'run-stunt', 'run-reveal', 'run-airport', 'run-mall', 'run-city', 'opening-ready', 'opening-control', 'opening-go'] as const;
const previewScreen: PreviewScreen | null = (previewNames as readonly string[]).includes(empirePreview || '') ? empirePreview as PreviewScreen : null;
const platformScreen: PlatformPreviewScreen | null = (platformNames as readonly string[]).includes(empirePreview || '') ? empirePreview as PlatformPreviewScreen : null;
const locScreen: LocPreviewScreen | null = (locNames as readonly string[]).includes(empirePreview || '') ? empirePreview as LocPreviewScreen : null;
const launchScreen: LaunchPreviewScreen | null = (launchNames as readonly string[]).includes(empirePreview || '') ? empirePreview as LaunchPreviewScreen : null;
const runScreen: RunPreviewScreen | null = (runNames as readonly string[]).includes(empirePreview || '') ? empirePreview as RunPreviewScreen : null;
root.render(
  <React.StrictMode>
    {empirePreview?.startsWith('brand-') ? (
      <BrandFoundry
        founder="Asha Venn"
        cash={3_750_000_000}
        fee={streamFilingFee({ money: 3_750_000_000 } as never)}
        kind="stream"
        initialName="SHADOW"
        initialStep={Math.max(0, Math.min(6, Number(empirePreview.slice(6)) - 1))}
        hold
        onCancel={() => undefined}
        onFile={() => undefined}
      />
    ) : runScreen ? (
      <RunPreview screen={runScreen} beat={Number(params.get('beat') || 2)} />
    ) : empirePreview?.startsWith('mkt-') ? (
      <MarketingPreview mode={empirePreview.slice(4)} />
    ) : launchScreen ? (
      <LaunchPreview screen={launchScreen} />
    ) : locScreen ? (
      <LocalizationPreview screen={locScreen} />
    ) : platformScreen ? (
      <PlatformPreview screen={platformScreen} />
    ) : previewScreen ? (
      <EmpirePreview screen={previewScreen} />
    ) : yt === 'showcase' || yt === 'fresh' || yt === 'award' ? (
      <YoutubeShowcase initial={params.get('screen')} fresh={yt === 'fresh'} award={yt === 'award'} />
    ) : <App />}
  </React.StrictMode>
);
