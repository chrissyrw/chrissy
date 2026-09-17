import * as THREE from 'three';

export class CameraSystem {
  constructor(game){
    this.game=game;this.mode=0;this.modes=['CHASE','CLOSE','HOOD','COCKPIT','CINEMATIC'];this.shake=0;this.baseFov=65;this.targetFov=65;this.keys=new Set();
    addEventListener('keydown',e=>{const k=e.key.toLowerCase();this.keys.add(k);if(k==='c')this.next();if(['1','2','3','4','5'].includes(k))this.set(Number(k)-1);});
    addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    game.events.on('vehicle:damage',e=>{if(e.amount>=5)this.shake=Math.min(.45,this.shake+.18);});
  }
  set(mode){this.mode=Math.max(0,Math.min(this.modes.length-1,mode));this.game.events.emit('camera:changed',{mode:this.modes[this.mode],index:this.mode});}
  next(){this.set((this.mode+1)%this.modes.length);}
  update(dt){
    const v=this.game.vehicles.active;const target=v?.mesh||this.game.player;const moving=v&&Math.abs(v.speed)>1;
    let offset=new THREE.Vector3(0,5.2,9.8);let lookY=.8;this.targetFov=65;
    if(v){
      if(this.mode===1)offset.set(0,3.1,6.1);
      if(this.mode===2)offset.set(0,1.55,-.65);
      if(this.mode===3)offset.set(0,1.28,-.05);
      if(this.mode===4){offset.set(0,7.5,12.5);this.targetFov=68;}
      if(this.mode<=1)this.targetFov=65+Math.min(10,Math.abs(v.speed)*.07);
    }
    const desired=target.position.clone().add(offset.applyQuaternion(target.quaternion));
    const smoothing=this.mode>=4?.045:.1;this.game.camera.position.lerp(desired,smoothing);
    const look=target.position.clone();look.y+=lookY;
    if(this.mode===2)look.add(new THREE.Vector3(0,.2,-4).applyQuaternion(target.quaternion));
    if(this.mode===4&&moving)look.add(new THREE.Vector3(0,0,-4).applyQuaternion(target.quaternion));
    this.game.camera.lookAt(look);
    this.game.camera.fov=THREE.MathUtils.lerp(this.game.camera.fov,this.targetFov,.08);this.game.camera.updateProjectionMatrix();
    this.shake=Math.max(0,this.shake-dt*.65);
    if(this.shake>0){this.game.camera.position.x+=(Math.random()-.5)*this.shake;this.game.camera.position.y+=(Math.random()-.5)*this.shake*.65;}
    const el=document.querySelector('#camera-mode');if(el)el.textContent='CAM: '+this.modes[this.mode];
  }
}
