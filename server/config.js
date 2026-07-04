const path = require('path');
require('dotenv').config();

const ROOT_DIR = path.join(__dirname, '..');

const DATA_DIR = path.resolve(ROOT_DIR, process.env.DATA_DIR || './data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

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
  outputDir: path.join(ROOT_DIR, 'downloads'),
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
  PORT,
  YTDLP_PATH,
  FFMPEG_PATH,
  NODE_ENV,
  DEFAULT_SETTINGS,
  ALLOWED_BITRATES,
  ALLOWED_TEMPLATE_PLACEHOLDERS
};
