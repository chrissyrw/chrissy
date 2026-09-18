export class EventBus {
  constructor() {
    this.events = new Map();
    this.anyHandlers = new Set();
    this.sequence = 0;
    this.history = [];
    this.maxHistory = 256;
  }

  on(name, handler) {
    if (!this.events.has(name)) this.events.set(name, new Set());
    this.events.get(name).add(handler);
    return () => this.off(name, handler);
  }

  onAny(handler) {
    this.anyHandlers.add(handler);
    return () => this.offAny(handler);
  }

  off(name, handler) {
    this.events.get(name)?.delete(handler);
  }

  offAny(handler) {
    this.anyHandlers.delete(handler);
  }

  emit(name, payload, meta = {}) {
    const envelope = {
      eventId: String(meta.eventId || `event-${Date.now().toString(36)}-${(++this.sequence).toString(36)}`),
      name,
      payload,
      priority: Number(meta.priority ?? 50),
      source: meta.source || 'event-bus',
      timestamp: Number(meta.timestamp || Date.now())
    };
    this.history.unshift(envelope);
    if (this.history.length > this.maxHistory) this.history.length = this.maxHistory;
    this.events.get(name)?.forEach(handler => handler(payload));
    this.anyHandlers.forEach(handler => handler(envelope));
    return envelope;
  }

  getHistory(limit = this.maxHistory) {
    return this.history.slice(0, Math.max(0, limit));
  }

  clearHistory() {
    this.history.length = 0;
  }
}
