import * as THREE from 'three';

export class NPCPopulationDirector {
  constructor(game){
    this.game=game;this.zoneCenters={CBD:[0,0],KIMIRONKO:[-32,0],REMERA:[32,0],KACYIRU:[0,32],NYARUTARAMA:[32,32],NYAMIRAMBO:[-32,-32],KICUKIRO:[-32,32],KANOMBE:[64,-32]};
    this.density={CBD:1.55,KIMIRONKO:1.5,REMERA:1.3,KACYIRU:1.05,NYARUTARAMA:.9,NYAMIRAMBO:1.4,KICUKIRO:1.15,KANOMBE:.8};this.targets=new Map();this.timer=0;this.bind();
  }
  bind(){this.game.events.on('city:event',e=>{this.event=e;this.timer=0;});}
  hour(){return Math.floor(this.game.state.get().world.time/60)%24;}
  pressure(zone){const h=this.hour();let p=this.density[zone]||.7;if(h>=7&&h<9)p*=1.35;if(h>=16&&h<19)p*=1.45;if(h>=22||h<5)p*=.45;if(this.event){const d=Math.hypot((this.zoneCenters[zone]?.[0]||0)-this.event.x,(this.zoneCenters[zone]?.[1]||0)-this.event.z);if(d<38)p*=this.event.type==='CROWD EVENT'?1.65:this.event.type==='MARKET BUSY'?1.5:1.15;}return THREE.MathUtils.clamp(p,.25,2.2);}
  update(dt){this.timer+=dt;if(this.timer<2)return;this.timer=0;for(const zone of Object.keys(this.density))this.targets.set(zone,{pressure:this.pressure(zone),target:Math.round(8*this.pressure(zone))});this.game.events.emit('population:director',{hour:this.hour(),zones:Object.fromEntries(this.targets)});const el=document.querySelector('#population-ai');if(el){const top=[...this.targets.entries()].sort((a,b)=>b[1].pressure-a[1].pressure)[0];el.textContent=top?`POP AI: ${top[0]} · ${Math.round(top[1].pressure*100)}%`:'POP AI: BALANCED';}}
}
