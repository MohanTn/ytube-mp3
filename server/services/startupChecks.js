const fs = require('fs');
const { execFile } = require('child_process');
const { YTDLP_PATH, FFMPEG_PATH } = require('../config');
const stateStore = require('./stateStore');
const eventBus = require('./eventBus');

/**
 * In-memory snapshot of system health, exposed via /api/system/status
 * and broadcast to SSE clients on change.
 */
const systemStatus = {
  ytDlpAvailable: false,
  ytDlpVersion: null,
  ffmpegAvailable: false,
  outputDirWritable: false,
  outputDir: null
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

function checkOutputDirWritable(outputDir) {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.accessSync(outputDir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs startup checks for yt-dlp, ffmpeg and the configured output
 * directory. Updates the shared systemStatus object and emits
 * 'system:error' over the event bus if anything is missing/broken.
 */
async function runStartupChecks() {
  const settings = stateStore.getSettings();

  const [ytDlp, ffmpeg] = await Promise.all([
    execVersionCheck(YTDLP_PATH, ['--version']),
    execVersionCheck(FFMPEG_PATH, ['-version'])
  ]);

  systemStatus.ytDlpAvailable = ytDlp.available;
  systemStatus.ytDlpVersion = ytDlp.version;
  systemStatus.ffmpegAvailable = ffmpeg.available;
  systemStatus.outputDir = settings.outputDir;
  systemStatus.outputDirWritable = checkOutputDirWritable(settings.outputDir);

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

  if (!systemStatus.outputDirWritable) {
    console.error(`[startupChecks] Output directory "${settings.outputDir}" is not writable.`);
    eventBus.broadcast('system:error', {
      code: 'OUTPUT_DIR_NOT_WRITABLE',
      message: `Output directory "${settings.outputDir}" is not writable.`
    });
  }

  return systemStatus;
}

/**
 * Re-checks output dir writability (called after a settings update) and
 * broadcasts the refreshed status.
 */
function refreshOutputDirStatus(outputDir) {
  systemStatus.outputDir = outputDir;
  systemStatus.outputDirWritable = checkOutputDirWritable(outputDir);
  return systemStatus;
}

function getSystemStatus() {
  return systemStatus;
}

module.exports = {
  runStartupChecks,
  refreshOutputDirStatus,
  getSystemStatus
};
