const express = require('express');
const eventBus = require('../services/eventBus');
const queueManager = require('../services/queueManager');
const settingsService = require('../services/settingsService');
const { getSystemStatus } = require('../services/startupChecks');

const router = express.Router();

const KEEP_ALIVE_INTERVAL_MS = 25000;

function sendEvent(res, type, data) {
  res.write(`event: ${type}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Initial snapshot so the client can hydrate state immediately.
  sendEvent(res, 'snapshot', {
    queue: queueManager.getQueue(),
    settings: settingsService.getSettings(),
    systemStatus: getSystemStatus()
  });

  const onBroadcast = ({ type, data }) => {
    sendEvent(res, type, data);
  };
  eventBus.on('broadcast', onBroadcast);

  const keepAlive = setInterval(() => {
    res.write(':keep-alive\n\n');
  }, KEEP_ALIVE_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(keepAlive);
    eventBus.off('broadcast', onBroadcast);
  });
});

module.exports = router;
