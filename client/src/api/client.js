async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const error = new Error(body?.error || 'Request failed');
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

export function getQueue() {
  return request('/queue');
}

export function addUrls(urls) {
  return request('/queue', {
    method: 'POST',
    body: JSON.stringify({ urls })
  });
}

export function removeQueueItem(id) {
  return request(`/queue/${id}`, { method: 'DELETE' });
}

export function retryQueueItem(id) {
  return request(`/queue/${id}/retry`, { method: 'POST' });
}

export function getSettings() {
  return request('/settings');
}

export function updateSettings(partial) {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(partial)
  });
}

export function getSystemStatus() {
  return request('/system/status');
}
