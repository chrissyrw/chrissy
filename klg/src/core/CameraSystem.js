import * as THREE from 'three';

export class CameraSystem{
  constructor(game){
    this.game=game;this.mode=0;
    this.modes=['CHASE','CLOSE','HOOD','COCKPIT','CINEMATIC','DRONE','TOP','LOW-STREET','ROOF','ORBIT'];
    this.shake=0;this.targetFov=65;this.orbitTime=0;
    addEventListener('keydown',e=>{
      const k=e.key.toLowerCase();
      if(k==='c')this.next();
      const n=Number(k);
      if(n>=1&&n<=9)this.set(n-1);
      if(k==='0')this.set(9);
    });
    game.events.on('vehicle:damage',e=>{if(e.amount>=5)this.shake=Math.min(.45,this.shake+.18);});
  }
  set(mode){
    this.mode=Math.max(0,Math.min(this.modes.length-1,mode));
    this.game.events.emit('camera:changed',{mode:this.modes[this.mode],index:this.mode});
  }
  next(){this.set((this.mode+1)%this.modes.length);}
  update(dt){
    const v=this.game.vehicles.active,target=v?.mesh||this.game.player,moving=v&&Math.abs(v.speed)>1;
    this.orbitTime+=dt;
    const forward=v?.quaternion?new THREE.Vector3(0,0,-1).applyQuaternion(v.quaternion):new THREE.Vector3(0,0,-1);
    const targetPos=target.position.clone();
    let desired,targetLook=targetPos.clone();this.targetFov=65;
    if(this.mode<=4){
      let offset=new THREE.Vector3(0,5.2,9.8);if(v){
        if(this.mode===1)offset.set(0,3.1,6.1);
        if(this.mode===2)offset.set(0,1.55,-.65);
        if(this.mode===3)offset.set(0,1.28,-.05);
        if(this.mode===4){offset.set(0,7.5,12.5);this.targetFov=68;}
        if(this.mode<=1)this.targetFov=65+Math.min(10,Math.abs(v.speed)*.07);
      }
      desired=targetPos.clone().add(offset.applyQuaternion(target.quaternion));
      targetLook.y+=this.mode===3?.65:.8;
      if(this.mode===2)targetLook.add(new THREE.Vector3(0,.2,-4).applyQuaternion(target.quaternion));
      if(this.mode===4&&moving)targetLook.add(new THREE.Vector3(0,0,-4).applyQuaternion(target.quaternion));
    }else if(this.mode===5){
      desired=targetPos.clone().add(forward.clone().multiplyScalar(-12)).add(new THREE.Vector3(0,8,0));targetLook.add(forward.multiplyScalar(8));this.targetFov=72;
    }else if(this.mode===6){
      desired=targetPos.clone().add(new THREE.Vector3(0,32,0));targetLook.y=0;this.targetFov=55;
    }else if(this.mode===7){
      desired=targetPos.clone().add(forward.clone().multiplyScalar(-3)).add(new THREE.Vector3(0,.72,0));targetLook.add(forward.multiplyScalar(12));this.targetFov=78;
    }else if(this.mode===8){
      desired=targetPos.clone().add(new THREE.Vector3(0,9,-2));targetLook.y=0;this.targetFov=62;
    }else{
      const r=15,ang=this.orbitTime*.18;desired=targetPos.clone().add(new THREE.Vector3(Math.sin(ang)*r,8+Math.sin(ang*.7)*2,Math.cos(ang)*r));targetLook.y+=1.2;this.targetFov=66;
    }
    const blend=this.mode>=6?.07:.1;
    this.game.camera.position.lerp(desired,blend);this.game.camera.lookAt(targetLook);
    this.game.camera.fov=THREE.MathUtils.lerp(this.game.camera.fov,this.targetFov,.08);this.game.camera.updateProjectionMatrix();
    this.shake=Math.max(0,this.shake-dt*.65);
    if(this.shake>0){this.game.camera.position.x+=(Math.random()-.5)*this.shake;this.game.camera.position.y+=(Math.random()-.5)*this.shake*.65;}
    const el=document.querySelector('#camera-mode');if(el)el.textContent='CAM: '+this.modes[this.mode]+' · '+(this.mode+1);
  }
}