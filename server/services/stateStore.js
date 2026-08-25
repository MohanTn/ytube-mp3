const fs = require('fs');
const path = require('path');
const { DATA_DIR, STATE_FILE, DEFAULT_SETTINGS } = require('../config');

const STATE_VERSION = 1;

/**
 * Keeps only known settings keys, so fields dropped in a newer version
 * (e.g. the old `outputDir`) don't linger in state.json.
 */
function mergeSettings(persisted) {
  const merged = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (persisted && persisted[key] !== undefined) {
      merged[key] = persisted[key];
    }
  }
  return merged;
}

function defaultState() {
  return {
    version: STATE_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    queue: []
  };
}

class StateStore {
  constructor() {
    this.state = null;
    this._writeChain = Promise.resolve();
  }

  /**
   * Loads state from disk synchronously at startup. If the file is missing,
   * creates a fresh default state. If corrupted, backs up the bad file and
   * starts fresh.
   */
  load() {
    fs.mkdirSync(DATA_DIR, { recursive: true });

    if (!fs.existsSync(STATE_FILE)) {
      this.state = defaultState();
      this._writeSync(this.state);
      return this.state;
    }

    try {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      this.state = {
        version: STATE_VERSION,
        settings: mergeSettings(parsed.settings),
        queue: Array.isArray(parsed.queue) ? parsed.queue : []
      };
    } catch (err) {
      const backupPath = `${STATE_FILE}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(STATE_FILE, backupPath);
        console.warn(
          `[stateStore] state.json was corrupted (${err.message}). ` +
          `Backed up to ${backupPath} and starting with fresh state.`
        );
      } catch (renameErr) {
        console.warn(`[stateStore] Failed to back up corrupted state.json: ${renameErr.message}`);
      }
      this.state = defaultState();
      this._writeSync(this.state);
    }

    return this.state;
  }

  getState() {
    return this.state;
  }

  getSettings() {
    return this.state.settings;
  }

  getQueue() {
    return this.state.queue;
  }

  /**
   * Replaces settings in-memory and persists.
   */
  setSettings(settings) {
    this.state.settings = settings;
    return this.save();
  }

  /**
   * Replaces the queue array in-memory and persists.
   */
  setQueue(queue) {
    this.state.queue = queue;
    return this.save();
  }

  /**
   * Persists the current in-memory state to disk atomically, serialized
   * through a write chain so only one write is in flight at a time.
   */
  save() {
    const snapshot = this.state;
    this._writeChain = this._writeChain
      .then(() => this._writeAsync(snapshot))
      .catch((err) => {
        console.error('[stateStore] Failed to persist state:', err);
      });
    return this._writeChain;
  }

  _writeSync(state) {
    const tmpPath = `${STATE_FILE}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
    fs.renameSync(tmpPath, STATE_FILE);
  }

  async _writeAsync(state) {
    const tmpPath = `${STATE_FILE}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(state, null, 2));
    await fs.promises.rename(tmpPath, STATE_FILE);
  }
}

module.exports = new StateStore();
