const { nanoid } = require('nanoid');

function generateQueueItemId() {
  return `q_${nanoid(10)}`;
}

module.exports = { generateQueueItemId };
