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
const showcase = new URLSearchParams(window.location.search).get('yt') === 'showcase';
root.render(
  <React.StrictMode>
    {showcase ? <YoutubeShowcase initial={new URLSearchParams(window.location.search).get('screen')} /> : <App />}
  </React.StrictMode>
);
