const STORAGE_KEY = 'klg_game_state_v2';

const DEFAULT_STATE = {
  version: 2,
  player: { name: 'KLG Legend', health: 100, stamina: 100, money: 500, reputation: 0, position: { x: 0, y: 1.25, z: 0 } },
  world: { day: 1, time: 8 * 60, weather: 'clear', district: 'Kimironko' },
  mission: null,
  inventory: [],
  unlockedLocations: ['Kimironko'],
  ai: { phase: 'calm' }
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export class GameState {
  constructor() { this.state = clone(DEFAULT_STATE); this.listeners = new Set(); }
  get() { return this.state; }
  reset() { this.state = clone(DEFAULT_STATE); this.emit(); }
  update(path, value) {
    if (typeof path === 'object') {
      this.state = { ...this.state, ...path, world: { ...this.state.world, ...(path.world || {}) }, player: { ...this.state.player, ...(path.player || {}) }, ai: { ...this.state.ai, ...(path.ai || {}) } };
      this.emit();
      return;
    }
    const parts = path.split('.');
    let target = this.state;
    for (let i = 0; i < parts.length - 1; i += 1) target = target[parts[i]];
    target[parts.at(-1)] = value;
    this.emit();
  }
  save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); return true; }
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try { const saved = JSON.parse(raw); this.state = { ...clone(DEFAULT_STATE), ...saved, world: { ...DEFAULT_STATE.world, ...(saved.world || {}) }, player: { ...DEFAULT_STATE.player, ...(saved.player || {}) }, ai: { ...DEFAULT_STATE.ai, ...(saved.ai || {}) } }; this.emit(); return true; }
    catch { return false; }
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit() { for (const listener of this.listeners) listener(this.state); }
}
