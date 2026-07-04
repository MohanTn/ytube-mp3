import React from 'react';
import { useAppState } from '../context/AppStateContext.jsx';

export default function ToastContainer() {
  const { toasts } = useAppState();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
