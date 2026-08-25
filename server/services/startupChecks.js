const { execFile } = require('child_process');
const { YTDLP_PATH, FFMPEG_PATH, STAGING_DIR } = require('../config');
const fileStore = require('./fileStore');
const eventBus = require('./eventBus');

/**
 * In-memory snapshot of system health, exposed via /api/system/status
 * and broadcast to SSE clients on change.
 */
const systemStatus = {
  ytDlpAvailable: false,
  ytDlpVersion: null,
  ffmpegAvailable: false,
  stagingDirWritable: false,
  stagingDir: STAGING_DIR
};

function execVersionCheck(binPath, args) {
  return new Promise((resolve) => {
    execFile(binPath, args, { timeout: 10000 }, (err, stdout) => {
      if (err) {
        resolve({ available: false, version: null });
      } else {
        resolve({ available: true, version: stdout.toString().trim().split('\n')[0] });
      }
    });
  });
}

/**
 * Runs startup checks for yt-dlp, ffmpeg and the staging directory files
 * are held in until the browser downloads them. Updates the shared
 * systemStatus object and emits 'system:error' if anything is broken.
 */
async function runStartupChecks() {
  const [ytDlp, ffmpeg] = await Promise.all([
    execVersionCheck(YTDLP_PATH, ['--version']),
    execVersionCheck(FFMPEG_PATH, ['-version'])
  ]);

  systemStatus.ytDlpAvailable = ytDlp.available;
  systemStatus.ytDlpVersion = ytDlp.version;
  systemStatus.ffmpegAvailable = ffmpeg.available;
  systemStatus.stagingDirWritable = fileStore.isWritable();

  if (!systemStatus.ytDlpAvailable) {
    console.error(
      `[startupChecks] yt-dlp binary not found (looked for "${YTDLP_PATH}"). ` +
      'Install it: https://github.com/yt-dlp/yt-dlp#installation. ' +
      'Configure a custom path via the YTDLP_PATH environment variable.'
    );
    eventBus.broadcast('system:error', {
      code: 'YTDLP_NOT_FOUND',
      message: `yt-dlp binary not found ("${YTDLP_PATH}"). Install yt-dlp and restart the server.`
    });
  }

  if (!systemStatus.ffmpegAvailable) {
    console.error(
      `[startupChecks] ffmpeg binary not found (looked for "${FFMPEG_PATH}"). ` +
      'Install it (e.g. apt install ffmpeg) and restart the server.'
    );
    eventBus.broadcast('system:error', {
      code: 'FFMPEG_NOT_FOUND',
      message: `ffmpeg binary not found ("${FFMPEG_PATH}"). Install ffmpeg and restart the server.`
    });
  }

  if (!systemStatus.stagingDirWritable) {
    console.error(`[startupChecks] Staging directory "${STAGING_DIR}" is not writable.`);
    eventBus.broadcast('system:error', {
      code: 'STAGING_DIR_NOT_WRITABLE',
      message: `Staging directory "${STAGING_DIR}" is not writable.`
    });
  }

  return systemStatus;
}

function getSystemStatus() {
  return systemStatus;
}

module.exports = {
  runStartupChecks,
  getSystemStatus
};
