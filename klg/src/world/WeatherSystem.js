import * as THREE from 'three';

export class WeatherSystem {
  constructor(game) {
    this.game = game;
    this.time = game.state.get().world.time ?? 480;
    this.weather = game.state.get().world.weather ?? 'clear';
    this.accumulator = 0;
    this.rain = null;
  }

  setWeather(type) {
    this.weather = type;
    this.game.state.update({ world: { weather: type } });
    if (this.rain) {
      this.game.scene.remove(this.rain);
      this.rain.geometry.dispose();
      this.rain.material.dispose();
      this.rain = null;
    }
    if (type === 'rain' || type === 'storm') {
      const count = type === 'storm' ? 1800 : 900;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 180;
        positions[i * 3 + 1] = Math.random() * 55;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 180;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.rain = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xbad7ff, size: 0.11, transparent: true, opacity: 0.7 }));
      this.game.scene.add(this.rain);
    }
  }

  update(dt) {
    this.accumulator += dt;
    this.time = (this.time + dt * 0.55) % 1440;
    if (this.accumulator > 8) {
      this.accumulator = 0;
      this.game.state.update({ world: { time: Math.floor(this.time) } });
    }
    const sun = this.game.sun;
    if (sun) {
      const day = this.time / 1440;
      const angle = day * Math.PI * 2 - Math.PI / 2;
      sun.position.set(Math.cos(angle) * 70, Math.max(8, Math.sin(angle) * 70), 25);
      sun.intensity = Math.max(0.35, Math.sin(angle) * 2.2 + 0.55);
    }
    if (this.rain) {
      const p = this.rain.geometry.attributes.position.array;
      for (let i = 1; i < p.length; i += 3) {
        p[i] -= dt * (this.weather === 'storm' ? 30 : 20);
        if (p[i] < 0) p[i] = 55;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
