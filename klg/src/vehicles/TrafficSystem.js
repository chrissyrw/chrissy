import * as THREE from 'three';
export class TrafficSystem {
  constructor(game){this.game=game;this.cars=[];for(let i=0;i<16;i+=1)this.spawn(i);}
  spawn(i){const car=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(1.7,.5,3.4),new THREE.MeshStandardMaterial({color:[0xd13a32,0x2d5fa4,0xf0c33c,0xeeeeee][i%4],metalness:.35,roughness:.35}));body.position.y=.55;body.castShadow=true;car.add(body);const lane=i%4;car.position.set(lane<2?(lane?28:-28):(i%2?-70:70),0,lane<2?(-100+i*13):(i%2?-40:40));car.rotation.y=lane<2?(lane?0:Math.PI):(i%2?Math.PI/2:-Math.PI/2);this.game.scene.add(car);this.cars.push({mesh:car,speed:5+(i%5)*1.7,baseSpeed:5+(i%5)*1.7,axis:lane<2?'z':'x',dir:lane<2?(lane?1:-1):(i%2?1:-1),lane});}
  update(dt){for(const car of this.cars){if(car.axis==='z')car.mesh.position.z+=car.speed*car.dir*dt;else car.mesh.position.x+=car.speed*car.dir*dt;if(car.mesh.position.x>112)car.mesh.position.x=-112;if(car.mesh.position.x<-112)car.mesh.position.x=112;if(car.mesh.position.z>112)car.mesh.position.z=-112;if(car.mesh.position.z<-112)car.mesh.position.z=112;}}
}
