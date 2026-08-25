const fs = require('fs');
const express = require('express');
const queueManager = require('../services/queueManager');
const { getSystemStatus } = require('../services/startupChecks');
const { NotFoundError, ValidationError } = require('../errors');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    queue: queueManager.getQueue(),
    systemStatus: getSystemStatus()
  });
});

router.post('/', (req, res) => {
  const body = req.body || {};
  let urls = body.urls;

  if (urls === undefined && typeof body.url === 'string') {
    urls = [body.url];
  }

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: '"urls" must be a non-empty array of strings' });
  }

  const { added, rejected } = queueManager.addItems(urls);
  res.status(201).json({ added, rejected });
});

/**
 * Streams a finished MP3 to the browser as an attachment, then deletes the
 * staged copy so nothing is left on the host.
 */
router.get('/:id/file', (req, res, next) => {
  let staged;
  try {
    staged = queueManager.getStagedFile(req.params.id);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(400).json({ error: 'Invalid queue item id' });
  }

  const { item, filePath } = staged;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(410).json({ error: 'File is no longer available on the server' });
  }

  res.download(filePath, item.filename, (err) => {
    if (err) {
      // Client aborted or the socket died: keep the file so it can be retried.
      if (!res.headersSent) next(err);
      return;
    }
    queueManager.markDownloaded(item.id);
  });
});

router.delete('/:id', (req, res, next) => {
  try {
    const removed = queueManager.removeItem(req.params.id);
    res.json({ removed: true, id: removed.id });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/:id/retry', (req, res, next) => {
  try {
    const item = queueManager.retryItem(req.params.id);
    res.json(item);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ValidationError) {
      return res.status(400).json({ errors: err.fieldErrors });
    }
    next(err);
  }
});

module.exports = router;
