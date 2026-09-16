import * as THREE from 'three';

export class VehicleSystem {
  constructor(game) {
    this.game = game;
    this.vehicles = [];
    this.active = null;
    this.keys = new Set();
    addEventListener('keydown', e => this.keys.add(e.key.toLowerCase()));
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    this.spawn('Kigali Runner', 8, 0, 0xc52d2d);
    this.spawn('Moto Taxi', -8, 5, 0xf0c22b);
  }

  spawn(name, x, z, color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 4.4), new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.28 }));
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 1.8), new THREE.MeshStandardMaterial({ color: 0x15202a, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.92 }));
    cabin.position.set(0, 1.2, -0.15);
    group.add(cabin);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 1.08, 0.42, sz * 1.45);
      group.add(wheel);
    }
    group.position.set(x, 0, z);
    this.game.scene.add(group);
    const vehicle = { name, mesh: group, speed: 0, maxSpeed: 18, accel: 12 };
    this.vehicles.push(vehicle);
    return vehicle;
  }

  enterNearest() {
    const player = this.game.player;
    let best = null, dist = Infinity;
    for (const v of this.vehicles) {
      const d = player.position.distanceTo(v.mesh.position);
      if (d < dist) { dist = d; best = v; }
    }
    if (best && dist < 4) {
      this.active = this.active === best ? null : best;
      this.game.events.emit('vehicle:changed', this.active);
    }
  }

  update(dt) {
    if (this.keys.has('e') && !this.eHeld) { this.eHeld = true; this.enterNearest(); }
    if (!this.keys.has('e')) this.eHeld = false;
    if (!this.active) return;
    const v = this.active;
    const forward = this.keys.has('w') || this.keys.has('arrowup');
    const reverse = this.keys.has('s') || this.keys.has('arrowdown');
    const left = this.keys.has('a') || this.keys.has('arrowleft');
    const right = this.keys.has('d') || this.keys.has('arrowright');
    const input = (forward ? 1 : 0) - (reverse ? 1 : 0);
    v.speed += input * v.accel * dt;
    v.speed *= Math.pow(0.82, dt);
    v.speed = THREE.MathUtils.clamp(v.speed, -v.maxSpeed * 0.45, v.maxSpeed);
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    v.mesh.rotation.y += steer * dt * (1.2 + Math.abs(v.speed) * 0.03);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(v.mesh.quaternion);
    v.mesh.position.addScaledVector(dir, v.speed * dt);
    v.mesh.position.x = THREE.MathUtils.clamp(v.mesh.position.x, -110, 110);
    v.mesh.position.z = THREE.MathUtils.clamp(v.mesh.position.z, -110, 110);
    this.game.player.position.lerp(v.mesh.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 0.35);
  }
}
