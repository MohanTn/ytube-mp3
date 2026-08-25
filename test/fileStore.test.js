const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ytube-mp3-test-'));
process.env.DATA_DIR = TMP_ROOT;
process.env.STAGING_DIR = path.join(TMP_ROOT, 'staging');

const fileStore = require('../server/services/fileStore');

test.after(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

test('itemDir rejects ids that could escape the staging root', () => {
  assert.throws(() => fileStore.itemDir('../../etc'), /Invalid queue item id/);
  assert.throws(() => fileStore.itemDir('a/b'), /Invalid queue item id/);
  assert.throws(() => fileStore.itemDir(''), /Invalid queue item id/);
});

test('createItemDir then removeItemDir leaves nothing behind', async () => {
  const dir = fileStore.createItemDir('item-one');
  fs.writeFileSync(path.join(dir, 'song.mp3'), 'audio');
  assert.ok(fs.existsSync(dir));

  await fileStore.removeItemDir('item-one');
  assert.equal(fs.existsSync(dir), false);
});

test('sweep removes orphaned directories and keeps live ones', async () => {
  fileStore.createItemDir('live-item');
  fileStore.createItemDir('orphan-item');

  const removed = await fileStore.sweep(['live-item']);

  assert.deepEqual(removed, ['orphan-item']);
  assert.ok(fs.existsSync(fileStore.itemDir('live-item')));
  assert.equal(fs.existsSync(fileStore.itemDir('orphan-item')), false);

  await fileStore.removeItemDir('live-item');
});

test('sweep removes live directories once they outlive the retention window', async () => {
  fileStore.createItemDir('stale-item');
  const wayLater = Date.now() + 365 * 24 * 60 * 60 * 1000;

  const removed = await fileStore.sweep(['stale-item'], wayLater);

  assert.deepEqual(removed, ['stale-item']);
  assert.equal(fs.existsSync(fileStore.itemDir('stale-item')), false);
});

test('removeItemDir on a missing directory is a no-op', async () => {
  await fileStore.removeItemDir('never-created');
});
