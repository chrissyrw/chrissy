import * as THREE from 'three';
import { Game } from './core/Game.js';

const container = document.querySelector('#game');
const game = new Game(container);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(240, 240),
  new THREE.MeshStandardMaterial({ color: 0x536b48, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
game.scene.add(ground);

function building(x, z, w, h, d, color = 0xb7a78b) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  game.scene.add(mesh);
}

building(-12, -8, 10, 8, 10, 0xc6b58e);
building(5, -12, 8, 14, 8, 0x9eacb0);
building(15, 4, 12, 7, 10, 0xd1c09b);
building(-18, 12, 9, 11, 12, 0xa98f78);
building(3, 15, 14, 5, 8, 0x8f9f83);

const roadMat = new THREE.MeshStandardMaterial({ color: 0x303337 });
for (const x of [-24, 0, 24]) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 240), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(x, 0.01, 0);
  game.scene.add(road);
}
for (const z of [-24, 0, 24]) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(240, 7), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, z);
  game.scene.add(road);
}

addEventListener('resize', () => game.resize());
addEventListener('beforeunload', () => game.save());
game.start();
