export class PlayerStats {
  constructor(gameState) {
    this.gameState = gameState;
  }

  get health() { return this.gameState.get().player.health; }
  get stamina() { return this.gameState.get().player.stamina; }
  get money() { return this.gameState.get().player.money; }
  get reputation() { return this.gameState.get().player.reputation; }

  damage(amount) {
    const next = Math.max(0, this.health - Math.max(0, amount));
    this.gameState.update('player.health', next);
    return next;
  }

  heal(amount) {
    const next = Math.min(100, this.health + Math.max(0, amount));
    this.gameState.update('player.health', next);
    return next;
  }

  spendMoney(amount) {
    if (amount < 0 || this.money < amount) return false;
    this.gameState.update('player.money', this.money - amount);
    return true;
  }

  addMoney(amount) {
    this.gameState.update('player.money', Math.max(0, this.money + amount));
  }

  addReputation(amount) {
    this.gameState.update('player.reputation', this.reputation + amount);
  }
}
