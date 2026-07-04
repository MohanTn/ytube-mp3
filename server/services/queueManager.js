const stateStore = require('./stateStore');
const eventBus = require('./eventBus');
const downloader = require('./downloader');
const { generateQueueItemId } = require('../utils/idGenerator');
const { validateYoutubeUrl } = require('../utils/validateUrl');
const { getSystemStatus } = require('./startupChecks');
const { NotFoundError, ValidationError } = require('../errors');

const PROGRESS_PERSIST_INTERVAL_MS = 1500;

class QueueManager {
  constructor() {
    this.processing = false;
    this.activeItemId = null;
    this.activeCancel = null;
    this._lastProgressPersist = 0;
  }

  getQueue() {
    return stateStore.getQueue();
  }

  _broadcastQueue() {
    eventBus.broadcast('queue:update', { queue: this.getQueue() });
  }

  _persistAndBroadcast() {
    stateStore.save();
    this._broadcastQueue();
  }

  /**
   * Validates and appends new items to the queue. Returns
   * { added: QueueItem[], rejected: { url, reason }[] }.
   */
  addItems(rawUrls) {
    const settings = stateStore.getSettings();
    const queue = this.getQueue();
    const added = [];
    const rejected = [];

    for (const rawUrl of rawUrls) {
      if (queue.length + added.length >= settings.maxQueueSize) {
        rejected.push({ url: rawUrl, reason: `Queue is full (max ${settings.maxQueueSize})` });
        continue;
      }

      const result = validateYoutubeUrl(rawUrl);
      if (!result.valid) {
        rejected.push({ url: rawUrl, reason: result.reason });
        continue;
      }

      const item = {
        id: generateQueueItemId(),
        url: result.normalizedUrl,
        title: null,
        status: 'queued',
        progress: 0,
        speed: null,
        eta: null,
        outputPath: null,
        error: null,
        addedAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null
      };

      queue.push(item);
      added.push(item);
    }

    if (added.length > 0) {
      this._persistAndBroadcast();
      this.processNext();
    }

    return { added, rejected };
  }

  /**
   * Removes an item by id. If it's the currently active item, the
   * in-flight download is canceled and the queue advances automatically.
   */
  removeItem(id) {
    const queue = this.getQueue();
    const index = queue.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundError(`Queue item ${id} not found`);
    }

    const item = queue[index];
    const isActive = this.activeItemId === id;
    const cancel = this.activeCancel;

    queue.splice(index, 1);
    this._persistAndBroadcast();

    if (isActive && cancel) {
      cancel();
    }

    return item;
  }

  /**
   * Resets an errored item back to 'queued' so it gets retried.
   */
  retryItem(id) {
    const queue = this.getQueue();
    const item = queue.find((q) => q.id === id);
    if (!item) {
      throw new NotFoundError(`Queue item ${id} not found`);
    }
    if (item.status !== 'error') {
      throw new ValidationError('Only errored items can be retried', [
        { field: 'status', message: `Item status is "${item.status}", not "error"` }
      ]);
    }

    item.status = 'queued';
    item.progress = 0;
    item.speed = null;
    item.eta = null;
    item.error = null;
    item.startedAt = null;
    item.finishedAt = null;

    this._persistAndBroadcast();
    this.processNext();
    return item;
  }

  /**
   * Called once at startup. Any item left in 'downloading'/'converting'
   * from a previous run (e.g. the process crashed) is reset to 'queued'
   * and moved to the front of the queue, in original relative order.
   * Leftover partial files in the output directory are best-effort removed.
   */
  async recoverInterruptedItems() {
    const queue = this.getQueue();
    const interrupted = [];
    const rest = [];

    for (const item of queue) {
      if (item.status === 'downloading' || item.status === 'converting') {
        item.status = 'queued';
        item.progress = 0;
        item.speed = null;
        item.eta = null;
        item.startedAt = null;
        interrupted.push(item);
      } else {
        rest.push(item);
      }
    }

    if (interrupted.length === 0) {
      return;
    }

    stateStore.setQueue([...interrupted, ...rest]);

    const settings = stateStore.getSettings();
    await downloader.cleanupPartialFiles(settings.outputDir);
  }

  /**
   * Starts processing the next queued item, if any, unless something is
   * already processing or the system isn't ready (missing binaries / bad
   * output dir).
   */
  processNext() {
    if (this.processing) return;

    const systemStatus = getSystemStatus();
    if (!systemStatus.ytDlpAvailable || !systemStatus.ffmpegAvailable || !systemStatus.outputDirWritable) {
      return;
    }

    const queue = this.getQueue();
    const next = queue.find((item) => item.status === 'queued');
    if (!next) return;

    this.processing = true;
    this.activeItemId = next.id;
    this._runItem(next);
  }

  async _runItem(item) {
    const settings = stateStore.getSettings();

    item.status = 'downloading';
    item.startedAt = new Date().toISOString();
    item.progress = 0;
    item.error = null;
    this._persistAndBroadcast();

    // Best-effort title lookup; doesn't block or fail the download.
    downloader.fetchTitle(item.url).then((title) => {
      if (title && this.getQueue().includes(item)) {
        item.title = title;
        this._persistAndBroadcast();
      }
    });

    const { promise, cancel } = downloader.download(item, settings, (progress) => {
      this._handleProgress(item, progress);
    });
    this.activeCancel = cancel;

    try {
      const { outputPath } = await promise;
      if (this.getQueue().includes(item)) {
        item.status = 'done';
        item.progress = 100;
        item.speed = null;
        item.eta = null;
        item.outputPath = outputPath;
        item.finishedAt = new Date().toISOString();
        this._persistAndBroadcast();
      }
    } catch (err) {
      if (!err.canceled && this.getQueue().includes(item)) {
        item.status = 'error';
        item.error = err.message;
        item.speed = null;
        item.eta = null;
        item.finishedAt = new Date().toISOString();
        this._persistAndBroadcast();
      }
    } finally {
      this.processing = false;
      this.activeItemId = null;
      this.activeCancel = null;
      this.processNext();
    }
  }

  _handleProgress(item, progress) {
    item.status = progress.status;
    item.progress = progress.progress;
    item.speed = progress.speed;
    item.eta = progress.eta;

    eventBus.broadcast('item:progress', {
      id: item.id,
      status: item.status,
      progress: item.progress,
      speed: item.speed,
      eta: item.eta
    });

    const now = Date.now();
    if (now - this._lastProgressPersist > PROGRESS_PERSIST_INTERVAL_MS) {
      this._lastProgressPersist = now;
      stateStore.save();
    }
  }
}

module.exports = new QueueManager();
