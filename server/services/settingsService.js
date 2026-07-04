const fs = require('fs');
const path = require('path');
const stateStore = require('./stateStore');
const eventBus = require('./eventBus');
const { refreshOutputDirStatus, getSystemStatus } = require('./startupChecks');
const { ALLOWED_BITRATES, ALLOWED_TEMPLATE_PLACEHOLDERS } = require('../config');
const { ValidationError } = require('../errors');

const TEMPLATE_PLACEHOLDER_PATTERN = /%\([a-zA-Z_]+\)s/g;

function getSettings() {
  return stateStore.getSettings();
}

/**
 * Validates the filename template: only allow-listed placeholders, and
 * no path separators or '..' (defense against writing outside outputDir).
 */
function validateFilenameTemplate(template) {
  if (typeof template !== 'string' || !template.trim()) {
    return 'Filename template must be a non-empty string';
  }
  if (template.includes('/') || template.includes('\\') || template.includes('..')) {
    return 'Filename template cannot contain path separators or ".."';
  }
  const placeholders = template.match(TEMPLATE_PLACEHOLDER_PATTERN) || [];
  for (const placeholder of placeholders) {
    if (!ALLOWED_TEMPLATE_PLACEHOLDERS.includes(placeholder)) {
      return `Placeholder ${placeholder} is not allowed. Allowed: ${ALLOWED_TEMPLATE_PLACEHOLDERS.join(', ')}`;
    }
  }
  if (!template.includes('%(ext)s')) {
    return 'Filename template must include %(ext)s';
  }
  return null;
}

/**
 * Validates a partial settings update. Returns an array of
 * { field, message } errors (empty if valid).
 */
function validateSettingsUpdate(partial) {
  const errors = [];

  if (partial.outputDir !== undefined) {
    if (typeof partial.outputDir !== 'string' || !path.isAbsolute(partial.outputDir)) {
      errors.push({ field: 'outputDir', message: 'Output directory must be an absolute path' });
    } else {
      try {
        fs.mkdirSync(partial.outputDir, { recursive: true });
        fs.accessSync(partial.outputDir, fs.constants.W_OK);
      } catch (err) {
        errors.push({ field: 'outputDir', message: `Directory is not writable: ${err.message}` });
      }
    }
  }

  if (partial.audioBitrateKbps !== undefined) {
    if (!ALLOWED_BITRATES.includes(partial.audioBitrateKbps)) {
      errors.push({
        field: 'audioBitrateKbps',
        message: `Bitrate must be one of: ${ALLOWED_BITRATES.join(', ')}`
      });
    }
  }

  if (partial.filenameTemplate !== undefined) {
    const error = validateFilenameTemplate(partial.filenameTemplate);
    if (error) {
      errors.push({ field: 'filenameTemplate', message: error });
    }
  }

  if (partial.maxQueueSize !== undefined) {
    if (!Number.isInteger(partial.maxQueueSize) || partial.maxQueueSize < 1) {
      errors.push({ field: 'maxQueueSize', message: 'Max queue size must be a positive integer' });
    }
  }

  if (partial.cookiesFilePath !== undefined && partial.cookiesFilePath !== '') {
    if (typeof partial.cookiesFilePath !== 'string' || !path.isAbsolute(partial.cookiesFilePath)) {
      errors.push({ field: 'cookiesFilePath', message: 'Cookies file path must be an absolute path' });
    } else if (!fs.existsSync(partial.cookiesFilePath)) {
      errors.push({ field: 'cookiesFilePath', message: 'Cookies file does not exist' });
    }
  }

  if (partial.embedThumbnail !== undefined && typeof partial.embedThumbnail !== 'boolean') {
    errors.push({ field: 'embedThumbnail', message: 'Must be a boolean' });
  }

  if (partial.embedMetadata !== undefined && typeof partial.embedMetadata !== 'boolean') {
    errors.push({ field: 'embedMetadata', message: 'Must be a boolean' });
  }

  return errors;
}

/**
 * Merges and persists a partial settings update. Throws ValidationError
 * if any field is invalid.
 */
async function updateSettings(partial) {
  const errors = validateSettingsUpdate(partial);
  if (errors.length > 0) {
    throw new ValidationError('Invalid settings', errors);
  }

  const current = stateStore.getSettings();
  const updated = { ...current, ...partial };
  await stateStore.setSettings(updated);
  eventBus.broadcast('settings:update', updated);

  if (partial.outputDir !== undefined) {
    refreshOutputDirStatus(updated.outputDir);
    eventBus.broadcast('system:status', getSystemStatus());
  }

  return updated;
}

module.exports = {
  getSettings,
  updateSettings,
  validateSettingsUpdate,
  validateFilenameTemplate
};
