import { WorldDirector } from './WorldDirector.js';

export class AIDirector {
  constructor(game) {
    this.game = game;
    this.elapsed = 0;
    this.phase = 'calm';
    this.worldDirector = new WorldDirector(game);
  }

  update(dt) {
    this.elapsed += dt;
    this.worldDirector.update(dt);
    if (this.elapsed < 12) return;
    this.elapsed = 0;
    const hour = this.game.state.get().world.time / 60;
    const weather = this.game.state.get().world.weather;
    if (weather === 'storm') this.phase = 'storm';
    else if (hour >= 18 || hour < 6) this.phase = 'night';
    else if (this.game.stats.reputation >= 20) this.phase = 'hot';
    else this.phase = 'calm';
    this.game.events.emit('ai:world', { phase: this.phase, weather, hour });
  }
}
