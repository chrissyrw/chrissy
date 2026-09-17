import * as THREE from 'three';

export class VehicleEffectsSystem {
  constructor(game){
    this.game=game;this.smoke=[];this.lastSpeed=0;this.skidCooldown=0;
  }
  makeParticle(pos){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.08,6,6),new THREE.MeshBasicMaterial({color:0x555555,transparent:true,opacity:.38}));
    m.position.copy(pos);this.game.scene.add(m);this.smoke.push({m,life:.55});
  }
  update(dt){
    const v=this.game.vehicles.active;
    for(let i=this.smoke.length-1;i>=0;i--){const p=this.smoke[i];p.life-=dt;p.m.position.y+=dt*.55;p.m.scale.multiplyScalar(1+dt*1.8);p.m.material.opacity=Math.max(0,p.life*.65);if(p.life<=0){this.game.scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();this.smoke.splice(i,1);}}
    if(!v)return;
    const speed=Math.abs(v.speed);
    const headlights=v.lights?.filter((_,i)=>i%2===0)||[];
    const brakes=v.lights?.filter((_,i)=>i%2===1)||[];
    const night=this.game.state.get().world?.time>=19*60||this.game.state.get().world?.time<6*60;
    headlights.forEach(x=>{x.material.emissiveIntensity=night?2.8:.35;});
    const braking=(this.game.vehicles.keys?.has('s')||this.game.vehicles.keys?.has('arrowdown'))&&v.speed>1;
    brakes.forEach(x=>{x.material.emissiveIntensity=braking?4:.45;});
    if(speed>55&&Math.abs(v.currentSteer||0)>.45&&this.skidCooldown<=0){
      const rear=v.mesh.localToWorld(new THREE.Vector3(0,.08,1.65));this.makeParticle(rear);this.skidCooldown=.08;
    }
    this.skidCooldown=Math.max(0,this.skidCooldown-dt);
    if(v.health<35&&speed>12&&Math.random()<dt*.8){const p=v.mesh.localToWorld(new THREE.Vector3(.45,.8,.4));this.makeParticle(p);}
    const intensity=THREE.MathUtils.clamp((speed-35)/65,0,1);
    this.game.events.emit('vehicle:effects',{speed,boost:intensity,night});
    this.lastSpeed=speed;
  }
}
