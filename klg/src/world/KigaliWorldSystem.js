import * as THREE from 'three';

export class KigaliWorldSystem {
  constructor(game) {
    this.game = game;
    this.districts = [
      { name: 'Kimironko', x: 0, z: 0, r: 34 }, { name: 'Kacyiru', x: -55, z: -38, r: 28 },
      { name: 'Remera', x: 58, z: -42, r: 30 }, { name: 'Nyarutarama', x: 58, z: 42, r: 28 },
      { name: 'Nyamirambo', x: -58, z: 45, r: 30 }, { name: 'CBD', x: 0, z: -68, r: 26 }
    ];
    this.shops = [
      ['Kigali Motors', 18, -18, 'garage'], ['Kimironko Market', -16, 14, 'market'], ['Remera Fuel', 54, -44, 'fuel'],
      ['Kacyiru Cafe', -54, -34, 'cafe'], ['Nyarutarama Mall', 54, 42, 'mall'], ['Nyamirambo Workshop', -56, 48, 'garage']
    ];
    this.buildRoadNetwork(); this.buildDistrictMarkers(); this.buildShops();
  }
  road(x, z, w, d) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x25282c, roughness: .9 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .025, z); m.receiveShadow = true; this.game.scene.add(m); return m;
  }
  buildRoadNetwork() {
    const lanes = [-96, -64, -32, 0, 32, 64, 96];
    lanes.forEach(v => { this.road(v, 0, 9, 240); this.road(0, v, 240, 9); });
    const diag = new THREE.Mesh(new THREE.PlaneGeometry(9, 170), new THREE.MeshStandardMaterial({ color: 0x292c30, roughness: .92 }));
    diag.rotation.x = -Math.PI / 2; diag.rotation.z = Math.PI / 4; diag.position.y = .03; this.game.scene.add(diag);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xe7e0c8 });
    lanes.forEach(v => { for (let p = -105; p <= 105; p += 16) {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5), markMat); a.rotation.x = -Math.PI / 2; a.position.set(v - 2, .04, p); this.game.scene.add(a);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.2), markMat); b.rotation.x = -Math.PI / 2; b.position.set(p, .04, v - 2); this.game.scene.add(b);
    }});
  }
  buildDistrictMarkers() {
    this.districts.forEach(d => { const ring = new THREE.Mesh(new THREE.RingGeometry(d.r - .5, d.r, 32), new THREE.MeshBasicMaterial({ color: 0x66c2a5, transparent: true, opacity: .16, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(d.x, .035, d.z); this.game.scene.add(ring); });
  }
  buildShops() {
    this.shops.forEach(([name,x,z,type]) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 4), new THREE.MeshStandardMaterial({ color: 0xd6c3a5, roughness: .7 })); body.position.y = 1.4; body.castShadow = true; g.add(body);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(4.2, .65, .18), new THREE.MeshStandardMaterial({ color: 0x18232b, emissive: 0x102027 })); sign.position.set(0, 2.65, -2.05); g.add(sign);
      g.position.set(x,0,z); this.game.scene.add(g); this.game.events.emit('shop:spawned',{name,x,z,type});
    });
  }
  getDistrict(pos) { let best = this.districts[0], dist = Infinity; for (const d of this.districts) { const dd = Math.hypot(pos.x-d.x,pos.z-d.z); if(dd<dist){dist=dd;best=d;} } return best.name; }
  getNearestShop(pos) { let best=null,dist=Infinity; for(const [name,x,z,type] of this.shops){const dd=Math.hypot(pos.x-x,pos.z-z);if(dd<dist){dist=dd;best={name,x,z,type,distance:dist};}} return best; }
  update() { const p=this.game.vehicles.active?this.game.vehicles.active.mesh.position:this.game.player.position; const district=this.getDistrict(p); if(district!==this.game.state.get().world.district)this.game.state.update('world.district',district); }
}
