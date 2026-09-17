import * as THREE from 'three';

export class KigaliWorldSystem {
  constructor(game){
    this.game=game;
    this.districts=[
      {name:'Kimironko',x:0,z:0,r:34,accent:0x66c2a5},
      {name:'Kacyiru',x:-55,z:-38,r:28,accent:0x8bb8ff},
      {name:'Remera',x:58,z:-42,r:30,accent:0xffc857},
      {name:'Nyarutarama',x:58,z:42,r:28,accent:0xd58cff},
      {name:'Nyamirambo',x:-58,z:45,r:30,accent:0xff8066},
      {name:'CBD',x:0,z:-68,r:26,accent:0xffffff}
    ];
    this.shops=[['Kigali Motors',18,-18,'garage'],['Kimironko Market',-16,14,'market'],['Remera Fuel',54,-44,'fuel'],['Kacyiru Cafe',-54,-34,'cafe'],['Nyarutarama Mall',54,42,'mall'],['Nyamirambo Workshop',-56,48,'garage']];
    this.landmarks=[['Kigali Arena',0,-56,0xffb347,7,5],['City Tower',-3,-76,0xd7e5ef,5,18],['Market Plaza',-15,15,0x66d9c0,9,2.5],['Hill View',62,39,0x91d36b,8,4]];
    this.buildRoadNetwork();this.buildDistrictMarkers();this.buildShops();this.buildLandmarks();this.buildStreetLights();
  }
  road(x,z,w,d,rotation=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({color:0x25282c,roughness:.9}));m.rotation.x=-Math.PI/2;m.rotation.z=rotation;m.position.set(x,.025,z);m.receiveShadow=true;this.game.scene.add(m);return m;}
  buildRoadNetwork(){
    const lanes=[-96,-64,-32,0,32,64,96];
    lanes.forEach(v=>{this.road(v,0,9,240);this.road(0,v,240,9);});
    this.road(0,0,12,210,Math.PI/4);
    this.road(0,0,8,180,-Math.PI/4);
    const markMat=new THREE.MeshBasicMaterial({color:0xe7e0c8});
    lanes.forEach(v=>{for(let p=-105;p<=105;p+=16){const a=new THREE.Mesh(new THREE.PlaneGeometry(1.2,5),markMat);a.rotation.x=-Math.PI/2;a.position.set(v-2,.04,p);this.game.scene.add(a);const b=new THREE.Mesh(new THREE.PlaneGeometry(5,1.2),markMat);b.rotation.x=-Math.PI/2;b.position.set(p,.04,v-2);this.game.scene.add(b);}});
    for(let i=-3;i<=3;i++){const z=i*32;for(const side of[-1,1]){const x=i*32+side*5;const curb=new THREE.Mesh(new THREE.BoxGeometry(.35,.16,9),new THREE.MeshStandardMaterial({color:0xb7b1a2,roughness:.8}));curb.position.set(x,.12,z);this.game.scene.add(curb);}}
  }
  buildDistrictMarkers(){this.districts.forEach(d=>{const ring=new THREE.Mesh(new THREE.RingGeometry(d.r-.5,d.r,48),new THREE.MeshBasicMaterial({color:d.accent,transparent:true,opacity:.13,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(d.x,.035,d.z);this.game.scene.add(ring);});}
  buildShops(){this.shops.forEach(([name,x,z,type])=>{const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(5,2.8,4),new THREE.MeshStandardMaterial({color:0xd6c3a5,roughness:.7}));body.position.y=1.4;body.castShadow=true;g.add(body);const sign=new THREE.Mesh(new THREE.BoxGeometry(4.2,.65,.18),new THREE.MeshStandardMaterial({color:0x18232b,emissive:0x102027}));sign.position.set(0,2.65,-2.05);g.add(sign);g.position.set(x,0,z);this.game.scene.add(g);this.game.events.emit('shop:spawned',{name,x,z,type});});}
  buildLandmarks(){this.landmarks.forEach(([name,x,z,color,w,h])=>{const g=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(w,w*.86,1.2,32),new THREE.MeshStandardMaterial({color:color,metalness:.25,roughness:.5}));base.position.y=.6;base.castShadow=true;g.add(base);const tower=new THREE.Mesh(new THREE.BoxGeometry(w*.48,h,w*.48),new THREE.MeshStandardMaterial({color:0x9aa7ad,metalness:.35,roughness:.28}));tower.position.y=1.2+h/2;tower.castShadow=true;g.add(tower);const beacon=new THREE.Mesh(new THREE.SphereGeometry(.32,12,12),new THREE.MeshStandardMaterial({color:0xfff1a8,emissive:0xffc857,emissiveIntensity:1.8}));beacon.position.y=1.2+h+.5;g.add(beacon);g.position.set(x,0,z);g.userData={name,type:'landmark'};this.game.scene.add(g);});}
  buildStreetLights(){const lampMat=new THREE.MeshStandardMaterial({color:0x34383c,metalness:.6,roughness:.4});for(let x=-96;x<=96;x+=32){for(const z of[-4.8,4.8]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,3.6,8),lampMat);pole.position.set(x,1.8,z);this.game.scene.add(pole);const glow=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),new THREE.MeshStandardMaterial({color:0xffedb0,emissive:0xffcc66,emissiveIntensity:1.6}));glow.position.set(x,3.65,z);this.game.scene.add(glow);}}}
  getDistrict(pos){let best=this.districts[0],dist=Infinity;for(const d of this.districts){const dd=Math.hypot(pos.x-d.x,pos.z-d.z);if(dd<dist){dist=dd;best=d;}}return best.name;}
  getNearestShop(pos){let best=null,dist=Infinity;for(const [name,x,z,type] of this.shops){const dd=Math.hypot(pos.x-x,pos.z-z);if(dd<dist){dist=dd;best={name,x,z,type,distance:dist};}}return best;}
  getNearestLandmark(pos){let best=null,dist=Infinity;for(const [name,x,z] of this.landmarks){const dd=Math.hypot(pos.x-x,pos.z-z);if(dd<dist){dist=dd;best={name,x,z,distance:dist};}}return best;}
  update(){const p=this.game.vehicles.active?this.game.vehicles.active.mesh.position:this.game.player.position;const district=this.getDistrict(p);if(district!==this.game.state.get().world.district)this.game.state.update('world.district',district);const nearest=this.getNearestLandmark(p);const e=document.querySelector('#landmark');if(e)e.textContent=nearest?`NEAR: ${nearest.name}`:'';}
}
