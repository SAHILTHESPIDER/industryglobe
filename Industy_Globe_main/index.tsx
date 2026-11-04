import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { bootstrapFirebase, installGlobalTelemetryHandlers } from './services/firebaseService';
import { YoutubeShowcase } from './views/mobile/youtube/showcase';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

void bootstrapFirebase();
installGlobalTelemetryHandlers();

const root = ReactDOM.createRoot(rootElement);
const params = new URLSearchParams(window.location.search);
const yt = params.get('yt');
root.render(
  <React.StrictMode>
    {yt === 'showcase' || yt === 'fresh' || yt === 'award' ? (
      <YoutubeShowcase initial={params.get('screen')} fresh={yt === 'fresh'} award={yt === 'award'} />
    ) : <App />}
  </React.StrictMode>
);
