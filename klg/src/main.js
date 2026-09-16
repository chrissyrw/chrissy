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
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.05 }));
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  game.scene.add(mesh);
}

const city = [
  [-12, -8, 10, 8, 10, 0xc6b58e], [5, -12, 8, 14, 8, 0x9eacb0], [15, 4, 12, 7, 10, 0xd1c09b],
  [-18, 12, 9, 11, 12, 0xa98f78], [3, 15, 14, 5, 8, 0x8f9f83], [-38, -30, 15, 18, 12, 0xbca789],
  [42, -25, 11, 22, 11, 0x8d9da3], [35, 30, 18, 9, 15, 0xc9b48f], [-42, 35, 13, 16, 13, 0xa3a88c]
];
city.forEach(args => building(...args));

const roadMat = new THREE.MeshStandardMaterial({ color: 0x303337, roughness: 0.95 });
for (const x of [-48, -24, 0, 24, 48]) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 240), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(x, 0.01, 0);
  game.scene.add(road);
}
for (const z of [-48, -24, 0, 24, 48]) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(240, 7), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, z);
  game.scene.add(road);
}

const ui = () => {
  const s = game.state.get();
  const money = document.querySelector('#money');
  const rep = document.querySelector('#rep');
  const clock = document.querySelector('#clock');
  const weather = document.querySelector('#weather');
  if (money) money.textContent = `RWF ${Math.floor(s.player.money).toLocaleString()}`;
  if (rep) rep.textContent = `REP ${s.player.reputation}`;
  if (weather) weather.textContent = s.world.weather.toUpperCase();
  if (clock) clock.textContent = `${String(Math.floor(s.world.time / 60) % 24).padStart(2, '0')}:${String(s.world.time % 60).padStart(2, '0')}`;
};
game.state.subscribe(ui);
setInterval(ui, 250);

game.events.on('mission:completed', e => {
  const el = document.querySelector('#mission');
  if (el) el.textContent = `MISSION COMPLETE +RWF ${e.reward}`;
});

game.events.on('ai:world', e => {
  const el = document.querySelector('#ai');
  if (el) el.textContent = `KLG AI: ${e.phase.toUpperCase()}`;
});

addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r') game.weather.setWeather(game.state.get().world.weather === 'rain' ? 'clear' : 'rain');
  if (e.key.toLowerCase() === 't') game.weather.setWeather(game.state.get().world.weather === 'storm' ? 'clear' : 'storm');
  if (e.key.toLowerCase() === 'm') game.missions.start('night-drive');
});
addEventListener('resize', () => game.resize());
addEventListener('beforeunload', () => game.save());
ui();
game.start();
