import React from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

export default function StatusBanner() {
  const { systemStatus } = useAppState();

  if (!systemStatus) return null;

  const problems = [];
  if (!systemStatus.ytDlpAvailable) {
    problems.push('yt-dlp binary not found — install it and restart the server.');
  }
  if (!systemStatus.ffmpegAvailable) {
    problems.push('ffmpeg binary not found — install it and restart the server.');
  }
  if (!systemStatus.stagingDirWritable) {
    problems.push(`Staging directory "${systemStatus.stagingDir}" is not writable.`);
  }

  if (problems.length === 0) return null;

  return (
    <div className="status-banner">
      {problems.map((p) => (
        <div key={p}>{p}</div>
      ))}
    </div>
  );
}
