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
