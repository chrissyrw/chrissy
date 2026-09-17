import * as THREE from 'three';
export class VehiclePhysicsSystem {
  constructor(game){this.game=game;this.lastPosition=null;this.skidTimer=0;}
  update(dt){
    const v=this.game.vehicles.active;if(!v)return;
    const speed=Math.abs(v.speed),pos=v.mesh.position;
    if(!this.lastPosition)this.lastPosition=pos.clone();
    const movement=pos.distanceTo(this.lastPosition)/Math.max(dt,.001);
    const lateral=Math.min(1,Math.abs(v.steer||0)*speed/55);
    const gripLoss=Math.max(0,(speed-45)/90)*lateral;
    v.grip=THREE.MathUtils.clamp((v.baseGrip??.92)-gripLoss,.45,.98);
    if(speed>48&&lateral>.35)this.skidTimer=Math.min(1,this.skidTimer+dt*4);else this.skidTimer=Math.max(0,this.skidTimer-dt*3);
    const collision=this.game.traffic.cars.some(c=>c.mesh.position.distanceTo(pos)<2.7&&movement>2);
    if(collision){v.health=Math.max(0,v.health-8);v.engine=THREE.MathUtils.clamp(v.health/100,.25,1);v.speed*=.35;this.game.events.emit('vehicle:damage',{amount:8,health:v.health});this.game.wanted.incident(1);}
    this.lastPosition.copy(pos);
    const el=document.querySelector('#vehicle-physics');if(el)el.textContent=this.skidTimer>.2?'GRIP: SKID':'GRIP: '+Math.round(v.grip*100)+'%';
  }
}
