import * as THREE from 'three';

export class NPCSystem {
  constructor(game) {
    this.game = game;
    this.npcs = [];
    const colors = [0x334455, 0x8b4a35, 0x4f6b3d, 0x6b3f72, 0x9a7b4f];
    for (let i = 0; i < 28; i += 1) {
      const npc = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.75, 4, 8), new THREE.MeshStandardMaterial({ color: colors[i % colors.length] }));
      body.position.y = 0.75;
      body.castShadow = true;
      npc.add(body);
      npc.position.set((Math.random() - 0.5) * 180, 0, (Math.random() - 0.5) * 180);
      this.game.scene.add(npc);
      this.npcs.push({ mesh: npc, speed: 0.5 + Math.random() * 1.1, phase: Math.random() * Math.PI * 2 });
    }
  }

  update(dt) {
    const player = this.game.player;
    for (const npc of this.npcs) {
      npc.phase += dt * 0.35;
      const dir = new THREE.Vector3(Math.cos(npc.phase), 0, Math.sin(npc.phase));
      npc.mesh.position.addScaledVector(dir, npc.speed * dt);
      npc.mesh.position.x = THREE.MathUtils.clamp(npc.mesh.position.x, -110, 110);
      npc.mesh.position.z = THREE.MathUtils.clamp(npc.mesh.position.z, -110, 110);
      npc.mesh.lookAt(npc.mesh.position.clone().add(dir));
      if (npc.mesh.position.distanceTo(player.position) < 2.2) npc.phase += Math.PI * 0.5;
    }
  }
}
