const { createApp } = require('./app');
const { PORT } = require('./config');
const stateStore = require('./services/stateStore');
const queueManager = require('./services/queueManager');
const { runStartupChecks } = require('./services/startupChecks');

async function main() {
  stateStore.load();
  await runStartupChecks();
  await queueManager.recoverInterruptedItems();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`ytube-mp3 server listening on http://localhost:${PORT}`);
  });

  queueManager.processNext();
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
