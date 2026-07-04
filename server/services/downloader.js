const fs = require('fs');
const path = require('path');
const readline = require('readline');
const youtubedl = require('yt-dlp-exec');
const { YTDLP_PATH, FFMPEG_PATH } = require('../config');

const ytdlp = youtubedl.create(YTDLP_PATH);

// [download]  45.2% of   3.45MiB at    1.20MiB/s ETA 00:05
const PROGRESS_RE = /\[download\]\s+(\d{1,3}(?:\.\d+)?)%(?:\s+of\s+~?\s*([\d.]+\w+))?(?:\s+at\s+([\d.]+\w+\/s|Unknown speed))?(?:\s+ETA\s+([\d:]+|Unknown))?/;
const POSTPROCESS_RE = /^\[(ExtractAudio|Merger|ffmpeg|Metadata|EmbedThumbnail)\]/;
const DESTINATION_RE = /^\[ExtractAudio\] Destination:\s+(.+)$/;

/**
 * Best-effort lookup of a video's title without downloading it. Returns
 * null on any failure (used purely for display purposes).
 */
async function fetchTitle(url) {
  try {
    const output = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noWarnings: true,
      skipDownload: true
    });
    const info = typeof output === 'string' ? JSON.parse(output) : output;
    return info && info.title ? String(info.title) : null;
  } catch {
    return null;
  }
}

/**
 * Maps raw yt-dlp stderr output to a user-friendly error message.
 */
function mapErrorMessage(stderr) {
  const text = stderr || '';
  if (/Private video/i.test(text)) return 'This video is private';
  if (/Video unavailable/i.test(text)) return 'Video is unavailable';
  if (/age[- ]restrict/i.test(text) || /Sign in to confirm your age/i.test(text)) {
    return 'Video is age-restricted (configure a cookies file in Settings)';
  }
  if (/not available in your country|geo.?restrict/i.test(text)) {
    return 'Video is not available in this region';
  }
  if (/No space left on device/i.test(text)) return 'Disk is full (no space left on device)';
  if (/ffmpeg not found|ffprobe not found/i.test(text)) return 'ffmpeg binary not found';

  const lines = text.trim().split('\n').filter(Boolean);
  const lastLines = lines.slice(-3).join(' ').trim();
  return lastLines || 'yt-dlp exited with an error';
}

function audioQualityFlag(audioBitrateKbps) {
  return `${audioBitrateKbps}K`;
}

function buildFlags(settings, outputTemplate) {
  const flags = {
    extractAudio: true,
    audioFormat: 'mp3',
    audioQuality: audioQualityFlag(settings.audioBitrateKbps),
    output: outputTemplate,
    newline: true,
    noPlaylist: true,
    noWarnings: true,
    trimFilenames: 200
  };

  if (FFMPEG_PATH && FFMPEG_PATH !== 'ffmpeg') {
    flags.ffmpegLocation = FFMPEG_PATH;
  }
  if (settings.cookiesFilePath) {
    flags.cookies = settings.cookiesFilePath;
  }
  if (settings.embedThumbnail) {
    flags.embedThumbnail = true;
  }
  if (settings.embedMetadata) {
    flags.embedMetadata = true;
  }

  return flags;
}

/**
 * Starts a yt-dlp download+mp3-extraction job.
 *
 * @param {object} item - queue item (must have `url`)
 * @param {object} settings - current app settings
 * @param {function} onProgress - called with { status, progress, speed, eta }
 * @returns {{ promise: Promise<{outputPath: string|null}>, cancel: function }}
 */
function download(item, settings, onProgress) {
  const outputTemplate = path.join(settings.outputDir, settings.filenameTemplate);
  const flags = buildFlags(settings, outputTemplate);

  const subprocess = ytdlp.exec(item.url, flags);

  let outputPath = null;
  let canceled = false;

  const handleLine = (line) => {
    const destMatch = line.match(DESTINATION_RE);
    if (destMatch) {
      outputPath = destMatch[1].trim();
    }

    if (POSTPROCESS_RE.test(line)) {
      onProgress({ status: 'converting', progress: 100, speed: null, eta: null });
      return;
    }

    const progressMatch = line.match(PROGRESS_RE);
    if (progressMatch) {
      const [, percent, , speed, eta] = progressMatch;
      onProgress({
        status: 'downloading',
        progress: parseFloat(percent),
        speed: speed || null,
        eta: eta || null
      });
    }
  };

  if (subprocess.stdout) {
    readline.createInterface({ input: subprocess.stdout }).on('line', handleLine);
  }

  let stderrBuffer = '';
  if (subprocess.stderr) {
    subprocess.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });
  }

  const promise = subprocess
    .then(() => ({ outputPath }))
    .catch((err) => {
      if (canceled) {
        const cancelError = new Error('Download canceled');
        cancelError.canceled = true;
        throw cancelError;
      }
      const message = mapErrorMessage(stderrBuffer || err.shortMessage || err.message);
      throw new Error(message);
    });

  const cancel = async () => {
    canceled = true;
    subprocess.kill('SIGTERM');
    await cleanupPartialFiles(settings.outputDir);
  };

  return { promise, cancel };
}

/**
 * Best-effort removal of leftover yt-dlp temp/partial files (.part, .ytdl,
 * .temp.*) in the output directory after a cancellation or crash.
 */
async function cleanupPartialFiles(outputDir) {
  try {
    const entries = await fs.promises.readdir(outputDir);
    await Promise.all(
      entries
        .filter((name) => /\.(part|ytdl)$/i.test(name) || /\.temp\.\w+$/i.test(name))
        .map((name) =>
          fs.promises.unlink(path.join(outputDir, name)).catch(() => {})
        )
    );
  } catch {
    // outputDir may not exist yet or be inaccessible; nothing to clean up.
  }
}

module.exports = {
  download,
  fetchTitle,
  cleanupPartialFiles
};
