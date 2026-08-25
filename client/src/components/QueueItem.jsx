import React from 'react';
import ProgressBar from './ProgressBar.jsx';
import { useAppState } from '../context/AppStateContext.jsx';

const STATUS_LABELS = {
  queued: 'Queued',
  downloading: 'Downloading',
  converting: 'Converting',
  done: 'Done',
  error: 'Error'
};

export default function QueueItem({ item }) {
  const { removeItem, retryItem } = useAppState();
  const isActive = item.status === 'downloading' || item.status === 'converting';

  const handleRemove = () => removeItem(item.id);
  const handleRetry = () => retryItem(item.id);

  return (
    <li className={`queue-item queue-item--${item.status}`}>
      <div className="queue-item__main">
        <div className="queue-item__title" title={item.url}>
          {item.title || item.url}
        </div>
        <span className={`badge badge--${item.status}`}>{STATUS_LABELS[item.status] || item.status}</span>
      </div>

      {isActive && (
        <div className="queue-item__progress">
          <ProgressBar progress={item.progress} indeterminate={item.status === 'converting'} />
          {(item.speed || item.eta) && (
            <span className="queue-item__meta">
              {item.speed ? `${item.speed}` : ''}
              {item.eta ? ` · ETA ${item.eta}` : ''}
            </span>
          )}
        </div>
      )}

      {item.status === 'error' && item.error && (
        <div className="queue-item__error">{item.error}</div>
      )}

      {item.status === 'done' && !item.fileAvailable && (
        <div className="queue-item__output">
          {item.downloadedAt
            ? `Downloaded${item.filename ? ` as ${item.filename}` : ''}`
            : 'File is no longer on the server — add the URL again to re-download'}
        </div>
      )}

      <div className="queue-item__actions">
        {item.status === 'done' && item.fileAvailable && (
          <a
            className="button button--small button--primary"
            href={`/api/queue/${item.id}/file`}
            download={item.filename || ''}
          >
            Download
          </a>
        )}
        {item.status === 'error' && (
          <button className="button button--small" onClick={handleRetry}>
            Retry
          </button>
        )}
        <button className="button button--small button--danger" onClick={handleRemove}>
          {isActive ? 'Cancel' : 'Remove'}
        </button>
      </div>
    </li>
  );
}
