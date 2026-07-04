import React, { useState } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext.jsx';
import StatusBanner from './components/StatusBanner.jsx';
import UrlInputForm from './components/UrlInputForm.jsx';
import QueueList from './components/QueueList.jsx';
import SettingsForm from './components/SettingsForm.jsx';
import ToastContainer from './components/Toast.jsx';

function AppContent() {
  const [tab, setTab] = useState('queue');
  const { connectionStatus } = useAppState();

  return (
    <div className="app">
      <header className="app__header">
        <h1>YouTube → MP3</h1>
        <nav className="app__tabs">
          <button
            className={tab === 'queue' ? 'tab tab--active' : 'tab'}
            onClick={() => setTab('queue')}
          >
            Queue
          </button>
          <button
            className={tab === 'settings' ? 'tab tab--active' : 'tab'}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
        </nav>
        {connectionStatus !== 'open' && (
          <span className="app__connection app__connection--warning">
            {connectionStatus === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
          </span>
        )}
      </header>

      <StatusBanner />

      <main className="app__main">
        {tab === 'queue' ? (
          <>
            <UrlInputForm />
            <QueueList />
          </>
        ) : (
          <SettingsForm />
        )}
      </main>

      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}
