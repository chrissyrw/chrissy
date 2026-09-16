export class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(name, handler) {
    if (!this.events.has(name)) this.events.set(name, new Set());
    this.events.get(name).add(handler);
    return () => this.off(name, handler);
  }

  off(name, handler) {
    this.events.get(name)?.delete(handler);
  }

  emit(name, payload) {
    this.events.get(name)?.forEach(handler => handler(payload));
  }
}
