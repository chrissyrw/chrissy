const STORAGE_KEY = 'klg_game_state_v1';

const DEFAULT_STATE = {
  version: 1,
  player: {
    name: 'KLG Legend',
    health: 100,
    stamina: 100,
    money: 500,
    reputation: 0,
    position: { x: 0, y: 1.25, z: 0 }
  },
  world: {
    day: 1,
    time: 8 * 60,
    weather: 'clear',
    district: 'Kimironko'
  },
  mission: null,
  inventory: [],
  unlockedLocations: ['Kimironko']
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class GameState {
  constructor() {
    this.state = clone(DEFAULT_STATE);
    this.listeners = new Set();
  }

  get() {
    return this.state;
  }

  reset() {
    this.state = clone(DEFAULT_STATE);
    this.emit();
  }

  update(path, value) {
    const parts = path.split('.');
    let target = this.state;
    for (let i = 0; i < parts.length - 1; i += 1) {
      target = target[parts[i]];
    }
    target[parts.at(-1)] = value;
    this.emit();
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    return true;
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      this.state = { ...clone(DEFAULT_STATE), ...JSON.parse(raw) };
      this.emit();
      return true;
    } catch {
      return false;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    for (const listener of this.listeners) listener(this.state);
  }
}
