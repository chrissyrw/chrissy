import * as THREE from 'three';

export class PlayerController {
  constructor(player, gameState, eventBus) {
    this.player = player;
    this.gameState = gameState;
    this.eventBus = eventBus;
    this.keys = new Set();
    this.speed = 8;

    this.onKeyDown = event => this.keys.add(event.key.toLowerCase());
    this.onKeyUp = event => this.keys.delete(event.key.toLowerCase());
    addEventListener('keydown', this.onKeyDown);
    addEventListener('keyup', this.onKeyUp);
  }

  update(dt) {
    const forward = this.keys.has('w') || this.keys.has('arrowup');
    const backward = this.keys.has('s') || this.keys.has('arrowdown');
    const left = this.keys.has('a') || this.keys.has('arrowleft');
    const right = this.keys.has('d') || this.keys.has('arrowright');
    const direction = new THREE.Vector3(
      Number(right) - Number(left),
      0,
      Number(backward) - Number(forward)
    );

    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.player.position.addScaledVector(direction, this.speed * dt);
      this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -110, 110);
      this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -110, 110);
      this.player.rotation.y = Math.atan2(direction.x, direction.z);
      this.eventBus.emit('player:moved', this.player.position.clone());
    }

    this.gameState.update('player.position', {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z
    });
  }

  dispose() {
    removeEventListener('keydown', this.onKeyDown);
    removeEventListener('keyup', this.onKeyUp);
  }
}
