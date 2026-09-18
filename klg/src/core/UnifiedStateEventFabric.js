const DEFAULT_PRIORITY = 50;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class UnifiedStateEventFabric {
  constructor(game, { maxRecent = 128, dedupeWindowMs = 5000 } = {}) {
    this.game = game;
    this.maxRecent = maxRecent;
    this.dedupeWindowMs = dedupeWindowMs;
    this.sequence = 0;
    this.stateRevision = 0;
    this.accepted = 0;
    this.rejected = 0;
    this.duplicates = 0;
    this.eventCounts = Object.create(null);
    this.recent = [];
    this.seen = new Map();
    this.destroyed = false;

    this.offAny = game.events.onAny((envelope) => this.observe(envelope));
    this.offState = game.state.subscribe((state, meta) => {
      this.stateRevision = Number(meta?.revision || this.stateRevision + 1);
    });
  }

  nextId(name) {
    this.sequence += 1;
    return `klg-${Date.now().toString(36)}-${this.sequence.toString(36)}-${name}`;
  }

  publish(name, payload = {}, options = {}) {
    if (this.destroyed || typeof name !== 'string' || !name.trim()) {
      this.rejected++;
      return { accepted: false, reason: 'invalid-event' };
    }

    const eventId = String(options.eventId || payload?.eventId || this.nextId(name));
    this.pruneSeen();
    if (this.seen.has(eventId)) {
      this.duplicates++;
      return { accepted: false, duplicate: true, eventId };
    }

    const priority = clamp(Number(options.priority ?? DEFAULT_PRIORITY), 0, 100);
    const envelope = {
      eventId,
      name,
      payload: payload && typeof payload === 'object' ? payload : { value: payload },
      priority,
      source: options.source || 'unified-fabric',
      timestamp: Date.now()
    };
    this.seen.set(eventId, envelope.timestamp);
    this.accepted++;
    this.game.events.emit(name, envelope.payload, envelope);
    return { accepted: true, eventId, priority };
  }

  patchState(patch, options = {}) {
    if (!patch || typeof patch !== 'object') {
      this.rejected++;
      return { accepted: false, reason: 'invalid-state-patch' };
    }
    this.game.state.update(patch, options.source || 'unified-fabric');
    return this.publish('state:patched', {
      source: options.source || 'unified-fabric',
      keys: Object.keys(patch)
    }, { source: options.source || 'unified-fabric', priority: options.priority ?? 60 });
  }

  snapshot() {
    return {
      stateRevision: this.stateRevision,
      accepted: this.accepted,
      rejected: this.rejected,
      duplicates: this.duplicates,
      eventCounts: { ...this.eventCounts },
      recent: this.recent.slice(),
      healthy: this.rejected === 0 || this.accepted >= this.rejected
    };
  }

  observe(envelope) {
    if (!envelope?.name) return;
    this.eventCounts[envelope.name] = (this.eventCounts[envelope.name] || 0) + 1;
    this.recent.unshift({
      eventId: envelope.eventId,
      name: envelope.name,
      priority: envelope.priority,
      source: envelope.source,
      timestamp: envelope.timestamp
    });
    if (this.recent.length > this.maxRecent) this.recent.length = this.maxRecent;
  }

  pruneSeen(now = Date.now()) {
    for (const [id, timestamp] of this.seen) {
      if (now - timestamp > this.dedupeWindowMs) this.seen.delete(id);
    }
  }

  update() {
    this.pruneSeen();
  }

  dispose() {
    this.destroyed = true;
    this.offAny?.();
    this.offState?.();
    this.seen.clear();
    this.recent.length = 0;
  }
}
