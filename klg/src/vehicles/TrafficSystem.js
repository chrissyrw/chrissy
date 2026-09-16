import * as THREE from 'three';

export class TrafficSystem {
  constructor(game) {
    this.game = game;
    this.cars = [];
    for (let i = 0; i < 12; i += 1) this.spawn(i);
  }

  spawn(i) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 3.4), new THREE.MeshStandardMaterial({ color: [0xd13a32, 0x2d5fa4, 0xf0c33c, 0xeeeeee][i % 4], metalness: 0.35, roughness: 0.35 }));
    body.position.y = 0.55;
    body.castShadow = true;
    car.add(body);
    car.position.set((i % 2 ? -24 : 24) + (i * 5) % 20, 0, -90 + i * 14);
    car.rotation.y = i % 2 ? 0 : Math.PI / 2;
    this.game.scene.add(car);
    this.cars.push({ mesh: car, speed: 5 + (i % 4) * 1.8, axis: i % 2 ? 'z' : 'x', dir: i % 2 ? 1 : -1 });
  }

  update(dt) {
    for (const car of this.cars) {
      if (car.axis === 'z') car.mesh.position.z += car.speed * car.dir * dt;
      else car.mesh.position.x += car.speed * car.dir * dt;
      if (Math.abs(car.mesh.position.x) > 115) car.mesh.position.x *= -0.9;
      if (Math.abs(car.mesh.position.z) > 115) car.mesh.position.z *= -0.9;
    }
  }
}
