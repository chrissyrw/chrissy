import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { GameState } from './GameState.js';
import { PlayerController } from '../player/PlayerController.js';
import { PlayerStats } from '../player/PlayerStats.js';
import { VehicleSystem } from '../vehicles/VehicleSystem.js';
import { WeatherSystem } from '../world/WeatherSystem.js';
import { MissionSystem } from '../missions/MissionSystem.js';
import { AIDirector } from '../ai/AIDirector.js';

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
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.setupLighting();
    this.setupPlayer();
    this.vehicles = new VehicleSystem(this);
    this.weather = new WeatherSystem(this);
    this.missions = new MissionSystem(this);
    this.ai = new AIDirector(this);
    this.events.on('vehicle:changed', vehicle => {
      const el = document.querySelector('#vehicle');
      if (el) el.textContent = vehicle ? `DRIVING: ${vehicle.name}` : 'ON FOOT';
    });
    this.missions.start('first-run');
  }

  setupLighting() {
    this.scene.background = new THREE.Color(0x8bb7d8);
    this.scene.fog = new THREE.Fog(0x8bb7d8, 45, 180);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x45604b, 2.2));
    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.position.set(30, 50, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun);
  }

  setupPlayer() {
    this.player = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.65, 1.2, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.7 })
    );
    const saved = this.state.get().player.position;
    this.player.position.set(saved.x, saved.y, saved.z);
    this.player.castShadow = true;
    this.scene.add(this.player);
    this.controller = new PlayerController(this.player, this.state, this.events);
  }

  update(dt) {
    this.controller.update(dt);
    this.vehicles.update(dt);
    this.weather.update(dt);
    this.missions.update(dt);
    this.ai.update(dt);
    const target = this.vehicles.active ? this.vehicles.active.mesh : this.player;
    const offset = this.vehicles.active ? new THREE.Vector3(0, 4.2, 8.8) : new THREE.Vector3(0, 5.5, 8.5);
    const desired = target.position.clone().add(offset);
    this.camera.position.lerp(desired, 0.08);
    this.camera.lookAt(target.position.x, target.position.y + 0.7, target.position.z);
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
