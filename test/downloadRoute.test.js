const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ytube-mp3-test-'));
process.env.DATA_DIR = TMP_ROOT;
process.env.STAGING_DIR = path.join(TMP_ROOT, 'staging');

const { createApp } = require('../server/app');
const stateStore = require('../server/services/stateStore');
const queueManager = require('../server/services/queueManager');
const fileStore = require('../server/services/fileStore');

let server;
let baseUrl;

test.before(async () => {
  stateStore.load();
  fileStore.ensureRoot();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

/** Puts a fake finished item (with a staged file) into the queue. */
function stageFinishedItem(contents = 'fake-mp3-bytes') {
  const { added } = queueManager.addItems(['https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
  const item = added[0];

  const dir = fileStore.createItemDir(item.id);
  fs.writeFileSync(path.join(dir, 'Song.mp3'), contents);

  item.status = 'done';
  item.progress = 100;
  item.filename = 'Song.mp3';
  item.fileAvailable = true;
  return item;
}

test('GET /api/queue/:id/file streams the mp3 as an attachment and then deletes it', async () => {
  const item = stageFinishedItem('fake-mp3-bytes');

  const res = await fetch(`${baseUrl}/api/queue/${item.id}/file`);
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /attachment; filename="Song.mp3"/);
  assert.equal(body, 'fake-mp3-bytes');

  // The delete happens in res.download's callback, just after the last byte.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(fs.existsSync(fileStore.itemDir(item.id)), false);

  const stored = queueManager.getQueue().find((q) => q.id === item.id);
  assert.equal(stored.fileAvailable, false);
  assert.ok(stored.downloadedAt);
});

test('a second download of the same item is refused with 410', async () => {
  const item = stageFinishedItem();
  await fetch(`${baseUrl}/api/queue/${item.id}/file`).then((r) => r.text());
  await new Promise((resolve) => setTimeout(resolve, 100));

  const res = await fetch(`${baseUrl}/api/queue/${item.id}/file`);
  assert.equal(res.status, 410);
});

test('unknown ids are 404 and traversal attempts are 400', async () => {
  const missing = await fetch(`${baseUrl}/api/queue/nope123/file`);
  assert.equal(missing.status, 404);

  const traversal = await fetch(`${baseUrl}/api/queue/${encodeURIComponent('../../etc/passwd')}/file`);
  assert.ok([400, 404].includes(traversal.status));
});

test('removing an item deletes its staged file', async () => {
  const item = stageFinishedItem();
  const dir = fileStore.itemDir(item.id);
  assert.ok(fs.existsSync(dir));

  const res = await fetch(`${baseUrl}/api/queue/${item.id}`, { method: 'DELETE' });
  assert.equal(res.status, 200);

  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(fs.existsSync(dir), false);
});
