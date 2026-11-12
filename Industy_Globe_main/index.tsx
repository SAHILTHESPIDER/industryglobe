import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { bootstrapFirebase, installGlobalTelemetryHandlers } from './services/firebaseService';
import { YoutubeShowcase } from './views/mobile/youtube/showcase';
import { EmpirePreview, PreviewScreen } from './views/ownPlatform/EmpirePreview';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

void bootstrapFirebase();
installGlobalTelemetryHandlers();

const root = ReactDOM.createRoot(rootElement);
const params = new URLSearchParams(window.location.search);
const yt = params.get('yt');
const empirePreview = params.get('empire');
const previewScreen: PreviewScreen | null = empirePreview === 'colour' || empirePreview === 'team' || empirePreview === 'hire' || empirePreview === 'ownership' || empirePreview === 'papers' || empirePreview === 'certificate' || empirePreview === 'locked' ? empirePreview : null;
root.render(
  <React.StrictMode>
    {previewScreen ? (
      <EmpirePreview screen={previewScreen} />
    ) : yt === 'showcase' || yt === 'fresh' || yt === 'award' ? (
      <YoutubeShowcase initial={params.get('screen')} fresh={yt === 'fresh'} award={yt === 'award'} />
    ) : <App />}
  </React.StrictMode>
);
