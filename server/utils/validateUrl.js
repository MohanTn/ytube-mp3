const YOUTUBE_HOST_PATTERN = /^(www\.|m\.|music\.)?youtube\.com$|^youtu\.be$/i;

/**
 * Validates that a string is a plausible YouTube video URL.
 * Returns { valid: true, normalizedUrl } or { valid: false, reason }.
 */
function validateYoutubeUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, reason: 'URL is empty' };
  }

  const trimmed = rawUrl.trim();

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Not a valid URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'URL must use http or https' };
  }

  if (!YOUTUBE_HOST_PATTERN.test(parsed.hostname)) {
    return { valid: false, reason: 'Not a recognized YouTube URL' };
  }

  const isYoutuBe = /^youtu\.be$/i.test(parsed.hostname);
  const isWatch = parsed.pathname === '/watch' && parsed.searchParams.has('v');
  const isShorts = /^\/shorts\/[^/]+/.test(parsed.pathname);
  const isShortLink = isYoutuBe && parsed.pathname.length > 1;
  const isEmbed = /^\/embed\/[^/]+/.test(parsed.pathname);

  if (!isWatch && !isShorts && !isShortLink && !isEmbed) {
    return { valid: false, reason: 'URL does not point to a single video' };
  }

  return { valid: true, normalizedUrl: trimmed };
}

module.exports = { validateYoutubeUrl };
