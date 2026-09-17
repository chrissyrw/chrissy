import * as THREE from 'three';

export class TrafficDirector {
  constructor(game){
    this.game=game;this.timer=0;this.lastEvent=null;this.congestion=0;this.districtFlow={CBD:1,KIMIRONKO:1,REMERA:1,KACYIRU:1,NYARUTARAMA:.8,NYAMIRAMBO:1.15,KICUKIRO:1,KANOMBE:.8};
    this.zoneCenters={CBD:[0,0],KIMIRONKO:[-32,0],REMERA:[32,0],KACYIRU:[0,32],NYARUTARAMA:[32,32],NYAMIRAMBO:[-32,-32],KICUKIRO:[-32,32],KANOMBE:[64,-32]};
    this.bind();
  }
  bind(){this.game.events.on('population:director',d=>this.onPopulation(d));this.game.events.on('city:event',e=>{this.lastEvent=e;this.timer=0;});}
  onPopulation(d){for(const [zone,data] of Object.entries(d.zones||{}))this.districtFlow[zone]=THREE.MathUtils.clamp(.65+data.pressure*.48,.65,1.8);}
  nearestZone(x,z){let best='CBD',dist=Infinity;for(const [zone,p] of Object.entries(this.zoneCenters)){const d=Math.hypot(x-p[0],z-p[1]);if(d<dist){dist=d;best=zone;}}return best;}
  update(dt){this.timer+=dt;const traffic=this.game.traffic;if(!traffic?.cars?.length)return;
    let total=0,slow=0;
    for(const car of traffic.cars){
      const zone=this.nearestZone(car.mesh.position.x,car.mesh.position.z),flow=this.districtFlow[zone]||1;
      const rush=(()=>{const h=Math.floor(this.game.state.get().world.time/60)%24;return (h>=7&&h<9)||(h>=16&&h<19)?1.18:1;})();
      let target=car.baseSpeed*(1/Math.max(.75,flow))*rush;
      if(car.kind==='bus')target*=.78;if(car.kind==='moto')target*=1.12;
      const event=this.lastEvent;if(event){const d=Math.hypot(car.mesh.position.x-event.x,car.mesh.position.z-event.z);if(d<28){if(event.type==='TRAFFIC SURGE'||event.type==='MARKET BUSY')target*=.62;if(event.type==='ROAD INCIDENT')target*=.38;if(event.type==='CROWD EVENT')target*=.7;}}
      car.directedSpeed=THREE.MathUtils.clamp(target,car.kind==='moto'?3:2,car.baseSpeed*(rush>1?1.2:1.05));
      car.speed=THREE.MathUtils.lerp(car.speed,car.directedSpeed,Math.min(1,dt*2.4));
      total+=car.baseSpeed;if(car.speed<car.baseSpeed*.65)slow++;
    }
    this.congestion=total?Math.round(slow/traffic.cars.length*100):0;
    if(this.timer>1){this.timer=0;const el=document.querySelector('#traffic-ai');if(el)el.textContent=`TRAFFIC AI: ${this.congestion}% CONGESTION · ${Math.round(traffic.cars.length)} VEHICLES`;this.game.events.emit('traffic:director',{congestion:this.congestion,vehicles:traffic.cars.length});}
  }
}
