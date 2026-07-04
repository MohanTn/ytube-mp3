import React from 'react';
import QueueItem from './QueueItem.jsx';
import { useAppState } from '../context/AppStateContext.jsx';

export default function QueueList() {
  const { queue } = useAppState();

  if (queue.length === 0) {
    return <p className="queue-empty">Queue is empty — paste a YouTube URL above to get started.</p>;
  }

  return (
    <ul className="queue-list">
      {queue.map((item) => (
        <QueueItem key={item.id} item={item} />
      ))}
    </ul>
  );
}
