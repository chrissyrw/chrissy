export class EventBus {
  constructor() {
    this.events = new Map();
    this.anyHandlers = new Set();
    this.errorHandlers = new Set();
    this.sequence = 0;
    this.history = [];
    this.errors = [];
    this.maxHistory = 256;
    this.maxErrors = 64;
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

  onError(handler) {
    this.errorHandlers.add(handler);
    return () => this.offError(handler);
  }

  off(name, handler) {
    this.events.get(name)?.delete(handler);
  }

  offAny(handler) {
    this.anyHandlers.delete(handler);
  }

  offError(handler) {
    this.errorHandlers.delete(handler);
  }

  emit(name, payload, meta = {}) {
    const envelope = {
      eventId: String(meta.eventId || 'event-' + Date.now().toString(36) + '-' + (++this.sequence).toString(36)),
      name,
      payload,
      priority: Number(meta.priority ?? 50),
      source: meta.source || 'event-bus',
      timestamp: Number(meta.timestamp || Date.now())
    };

    this.history.unshift(envelope);
    if (this.history.length > this.maxHistory) this.history.length = this.maxHistory;

    const handlers = this.events.get(name);
    handlers?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        this.recordError({ eventId: envelope.eventId, name, source: envelope.source, error });
      }
    });

    this.anyHandlers.forEach((handler) => {
      try {
        handler(envelope);
      } catch (error) {
        this.recordError({ eventId: envelope.eventId, name, source: envelope.source, stage: 'observer', error });
      }
    });

    return envelope;
  }

  recordError({ eventId, name, source, stage = 'handler', error } = {}) {
    const record = {
      eventId: eventId || null,
      name: name || 'unknown',
      source: source || 'event-bus',
      stage,
      message: error?.message || String(error || 'unknown error'),
      timestamp: Date.now()
    };
    this.errors.unshift(record);
    if (this.errors.length > this.maxErrors) this.errors.length = this.maxErrors;

    this.errorHandlers.forEach((handler) => {
      try {
        handler(record);
      } catch {
        // Error observers must never destabilize the event bus.
      }
    });
    return record;
  }

  getHistory(limit = this.maxHistory) {
    return this.history.slice(0, Math.max(0, limit));
  }

  getErrors(limit = this.maxErrors) {
    return this.errors.slice(0, Math.max(0, limit));
  }

  clearHistory() {
    this.history.length = 0;
  }

  clearErrors() {
    this.errors.length = 0;
  }
}
