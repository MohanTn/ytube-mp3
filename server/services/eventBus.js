const EventEmitter = require('events');

/**
 * Shared pub/sub bus. SSE clients subscribe to 'broadcast' events;
 * internal services emit typed events that get forwarded to SSE clients.
 */
class EventBus extends EventEmitter {
  /**
   * Emits a typed event to all SSE subscribers.
   * @param {string} type - e.g. 'queue:update', 'item:progress'
   * @param {object} data
   */
  broadcast(type, data) {
    this.emit('broadcast', { type, data });
  }
}

module.exports = new EventBus();
