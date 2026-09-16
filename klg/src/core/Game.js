import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GameState } from './GameState.js';
import { PlayerController } from '../player/PlayerController.js';
import { PlayerStats } from '../player/PlayerStats.js';

export class Game {
  constructor(container) {
    this.container = container;
    this.events = new EventBus();
    this.state = new GameState();
    this.state.load();
    this.stats = new PlayerStats(this.state);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.setupLighting();
    this.setupPlayer();
  }

  setupLighting() {
    this.scene.background = new THREE.Color(0x8bb7d8);
    this.scene.fog = new THREE.Fog(0x8bb7d8, 45, 180);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x45604b, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    this.scene.add(sun);
  }

  setupPlayer() {
    this.player = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.65, 1.2, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x1d2630 })
    );
    const saved = this.state.get().player.position;
    this.player.position.set(saved.x, saved.y, saved.z);
    this.player.castShadow = true;
    this.scene.add(this.player);
    this.controller = new PlayerController(this.player, this.state, this.events);
  }

  update(dt) {
    this.controller.update(dt);
    const offset = new THREE.Vector3(0, 5.5, 8.5);
    const desired = this.player.position.clone().add(offset);
    this.camera.position.lerp(desired, 0.08);
    this.camera.lookAt(this.player.position.x, this.player.position.y + 0.7, this.player.position.z);
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.update(Math.min(this.clock.getDelta(), 0.05));
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  save() {
    this.state.save();
  }
}
