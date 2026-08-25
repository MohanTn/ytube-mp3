const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ytube-mp3-test-'));
process.env.DATA_DIR = TMP_ROOT;
process.env.STAGING_DIR = path.join(TMP_ROOT, 'staging');

const settingsService = require('../server/services/settingsService');
const stateStore = require('../server/services/stateStore');

test.after(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

test('settings no longer carry a server-side output directory', () => {
  stateStore.load();
  assert.equal('outputDir' in stateStore.getSettings(), false);
});

test('validateSettingsUpdate ignores an outputDir sent by an old client', () => {
  assert.deepEqual(settingsService.validateSettingsUpdate({ outputDir: '/tmp/whatever' }), []);
});

test('validateSettingsUpdate flags bad bitrate and queue size', () => {
  const errors = settingsService.validateSettingsUpdate({ audioBitrateKbps: 64, maxQueueSize: 0 });
  assert.deepEqual(errors.map((e) => e.field), ['audioBitrateKbps', 'maxQueueSize']);
});

test('filename template must stay a bare filename', () => {
  assert.match(settingsService.validateFilenameTemplate('../%(title)s.%(ext)s'), /path separators/);
  assert.match(settingsService.validateFilenameTemplate('%(title)s'), /%\(ext\)s/);
  assert.equal(settingsService.validateFilenameTemplate('%(title)s.%(ext)s'), null);
});

test('updateSettings drops unknown keys instead of persisting them', async () => {
  stateStore.load();
  const updated = await settingsService.updateSettings({ audioBitrateKbps: 320, outputDir: '/tmp/nope' });

  assert.equal(updated.audioBitrateKbps, 320);
  assert.equal('outputDir' in updated, false);
});
