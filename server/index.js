const { createApp } = require('./app');
const { PORT, SWEEP_INTERVAL_MS } = require('./config');
const stateStore = require('./services/stateStore');
const queueManager = require('./services/queueManager');
const fileStore = require('./services/fileStore');
const { runStartupChecks } = require('./services/startupChecks');

async function main() {
  stateStore.load();
  fileStore.ensureRoot();
  await runStartupChecks();
  await queueManager.recoverInterruptedItems();
  await queueManager.sweepStagedFiles();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`ytube-mp3 server listening on http://localhost:${PORT}`);
  });

  // Drop staged files nobody downloaded, so the host stays clean.
  const sweeper = setInterval(() => {
    queueManager.sweepStagedFiles().catch((err) => {
      console.error('[sweep] Failed to clean staged files:', err);
    });
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

  queueManager.processNext();
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
