import * as THREE from 'three';
export class EnvironmentSystem {
  constructor(game){this.game=game;this.lights=[];this.trees=[];this.signs=[];this.build();}
  build(){
    for(let x=-105;x<=105;x+=21)for(let z=-105;z<=105;z+=21){if((x+z)%42!==0)continue;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,2.2,7),new THREE.MeshStandardMaterial({color:0x6b4b32}));const crown=new THREE.Mesh(new THREE.SphereGeometry(1.25,8,6),new THREE.MeshStandardMaterial({color:0x3f6f46,roughness:1}));const g=new THREE.Group();trunk.position.y=1.1;crown.position.y=2.7;g.add(trunk,crown);g.position.set(x,0,z);g.userData={type:'tree'};this.game.scene.add(g);this.trees.push(g);}
    for(let x=-96;x<=96;x+=32)for(const z of [-6,6]){const pole=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,4,6),new THREE.MeshStandardMaterial({color:0x30353a,metalness:.6}));const lamp=new THREE.PointLight(0xffdca8,0,18);pole.add(stem);stem.position.y=2;lamp.position.y=4;pole.add(lamp);pole.position.set(x,0,z);pole.userData={lamp};this.game.scene.add(pole);this.lights.push(pole);}
    this.game.scene.fog.near=48;this.game.scene.fog.far=280;
  }
  update(){const s=this.game.state.get();const night=s.world.time>=18*60||s.world.time<6*60;for(const l of this.lights)l.userData.lamp.intensity=night?.8:0;for(const t of this.trees)t.rotation.y+=.0005;}
}
