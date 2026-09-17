import { WorldDirector } from './WorldDirector.js';
import { ActivityDirector } from './ActivityDirector.js';
import { ProgressionSystem } from '../player/ProgressionSystem.js';

export class AIDirector {
  constructor(game) {
    this.game = game;
    this.elapsed = 0;
    this.phase = 'calm';
    this.worldDirector = new WorldDirector(game);
    this.activityDirector = new ActivityDirector(game);
    this.progression = new ProgressionSystem(game);
  }

  update(dt) {
    this.elapsed += dt;
    this.worldDirector.update(dt);
    this.activityDirector.update(dt);
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
