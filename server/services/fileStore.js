const fs = require('fs');
const path = require('path');
const { STAGING_DIR, FILE_RETENTION_MS } = require('../config');

/**
 * Owns the staging area: every queue item gets its own directory under
 * STAGING_DIR, so a finished MP3 lives on the host only until the browser
 * has downloaded it (or until the TTL sweep removes it).
 */

const ID_RE = /^[A-Za-z0-9_-]+$/;

function ensureRoot() {
  fs.mkdirSync(STAGING_DIR, { recursive: true });
}

function isWritable() {
  try {
    ensureRoot();
    fs.accessSync(STAGING_DIR, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Absolute path of an item's staging directory. Ids come from nanoid, but
 * they also arrive from HTTP, so reject anything that isn't a plain id.
 */
function itemDir(id) {
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw new Error(`Invalid queue item id: ${id}`);
  }
  return path.join(STAGING_DIR, id);
}

function createItemDir(id) {
  const dir = itemDir(id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Best-effort removal of an item's staged files. */
async function removeItemDir(id) {
  try {
    await fs.promises.rm(itemDir(id), { recursive: true, force: true });
  } catch {
    // Nothing staged, or already gone.
  }
}

/**
 * Deletes staging directories that are older than the retention window or
 * that no longer belong to a queue item. Returns the removed ids.
 */
async function sweep(liveIds = [], now = Date.now()) {
  const live = new Set(liveIds);
  const removed = [];

  let entries;
  try {
    entries = await fs.promises.readdir(STAGING_DIR, { withFileTypes: true });
  } catch {
    return removed;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(STAGING_DIR, entry.name);

    let expired = !live.has(entry.name);
    if (!expired) {
      try {
        const stats = await fs.promises.stat(dir);
        expired = now - stats.mtimeMs > FILE_RETENTION_MS;
      } catch {
        expired = true;
      }
    }

    if (expired) {
      await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
      removed.push(entry.name);
    }
  }

  return removed;
}

module.exports = {
  ensureRoot,
  isWritable,
  itemDir,
  createItemDir,
  removeItemDir,
  sweep
};
