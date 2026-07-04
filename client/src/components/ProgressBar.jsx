import React from 'react';

export default function ProgressBar({ progress, indeterminate }) {
  if (indeterminate) {
    return (
      <div className="progress progress--indeterminate">
        <div className="progress__bar progress__bar--indeterminate" />
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, progress || 0));

  return (
    <div className="progress">
      <div className="progress__bar" style={{ width: `${pct}%` }} />
      <span className="progress__label">{pct.toFixed(1)}%</span>
    </div>
  );
}
