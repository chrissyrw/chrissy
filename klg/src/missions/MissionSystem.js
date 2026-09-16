export class MissionSystem {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.missions = [
      { id: 'first-run', title: 'Kimironko Run', description: 'Reach the market district before the timer ends.', reward: 250, reputation: 5 },
      { id: 'night-drive', title: 'Night Drive', description: 'Take the Kigali Runner across the city after sunset.', reward: 450, reputation: 10 },
      { id: 'storm-chase', title: 'Storm Chase', description: 'Complete a drive while the city is under rain.', reward: 700, reputation: 15 }
    ];
  }

  start(id = 'first-run') {
    const mission = this.missions.find(m => m.id === id);
    if (!mission) return;
    this.active = { ...mission, progress: 0, startedAt: performance.now() };
    this.game.state.update({ mission: this.active });
    this.game.events.emit('mission:started', this.active);
  }

  complete() {
    if (!this.active) return;
    const reward = this.active.reward;
    const rep = this.active.reputation;
    this.game.stats.addMoney(reward);
    this.game.stats.addReputation(rep);
    const finished = this.active;
    this.active = null;
    this.game.state.update({ mission: null });
    this.game.events.emit('mission:completed', { ...finished, reward, reputation: rep });
  }

  update() {
    if (!this.active) return;
    this.active.progress = Math.min(100, this.active.progress + 0.02);
    if (this.active.progress >= 100) this.complete();
  }
}
