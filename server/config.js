const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.join(__dirname, '..');

const DATA_DIR = path.resolve(ROOT_DIR, process.env.DATA_DIR || './data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// Finished MP3s are staged here only until the browser downloads them.
const STAGING_DIR = path.resolve(ROOT_DIR, process.env.STAGING_DIR || path.join(DATA_DIR, 'staging'));

// Staged files nobody downloaded are deleted after this long.
const RETENTION_MINUTES = parseInt(process.env.FILE_RETENTION_MINUTES, 10);
const FILE_RETENTION_MS = RETENTION_MINUTES > 0 ? RETENTION_MINUTES * 60 * 1000 : 6 * 60 * 60 * 1000;

const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

const PORT = parseInt(process.env.PORT, 10) || 3010;

/**
 * Resolves a configured binary path. Bare command names (e.g. "yt-dlp")
 * are left as-is so they're resolved via $PATH; paths containing a
 * separator are resolved relative to the project root.
 */
function resolveBinaryPath(value, fallback) {
  const raw = value || fallback;
  if (raw.includes('/') && !path.isAbsolute(raw)) {
    return path.resolve(ROOT_DIR, raw);
  }
  return raw;
}

const YTDLP_PATH = resolveBinaryPath(process.env.YTDLP_PATH, 'yt-dlp');
const FFMPEG_PATH = resolveBinaryPath(process.env.FFMPEG_PATH, 'ffmpeg');
const NODE_ENV = process.env.NODE_ENV || 'development';

const DEFAULT_SETTINGS = {
  audioBitrateKbps: 192,
  filenameTemplate: '%(title)s.%(ext)s',
  maxQueueSize: 100,
  cookiesFilePath: '',
  embedThumbnail: true,
  embedMetadata: true
};

const ALLOWED_BITRATES = [128, 192, 256, 320];

const ALLOWED_TEMPLATE_PLACEHOLDERS = [
  '%(title)s',
  '%(id)s',
  '%(uploader)s',
  '%(upload_date)s',
  '%(ext)s'
];

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  STATE_FILE,
  STAGING_DIR,
  FILE_RETENTION_MS,
  SWEEP_INTERVAL_MS,
  PORT,
  YTDLP_PATH,
  FFMPEG_PATH,
  NODE_ENV,
  DEFAULT_SETTINGS,
  ALLOWED_BITRATES,
  ALLOWED_TEMPLATE_PLACEHOLDERS
};
