const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const SPOTS={
 'Market Circle':['Kimironko Market','Market Backroom'],
 'Night Route':['Nyamirambo Night Hub','Night Garage'],
 'Hill Runners':['Rebero Lookout','Hill Workshop'],
 'City Services':['Kacyiru Service Yard','Civic Depot'],
 'Transport Network':['Remera Transit Hub','Moto Stage']
};
export class FactionTerritorySystem{
 constructor(game){this.game=game;this.tick=0;const saved=game.state.get().factionTerritory||{};this.state=saved.factions?{...saved}:this.empty();this.bind();this.sync();}
 empty(){return{factions:{},districts:{},safehouses:{},routes:{},encounters:0,updatedAt:0};}
 bind(){
  this.game.events.on('npc:faction-dynamics',()=>this.refresh());
  this.game.events.on('faction:safe-spot',e=>this.safehouse(e.faction));
  this.game.events.on('faction:mission-generated',e=>this.route(e.faction,e.district));
  this.game.events.on('faction:mission-resolved',e=>this.resolve(e));
  this.game.events.on('world:consequence',e=>this.pressure(e));
 }
 ensure(name){if(!name)return null;if(!this.state.factions[name])this.state.factions[name]={name,influence:0,heat:0,state:'unknown',district:null,safehouses:0,routes:0};return this.state.factions[name];}
 safehouse(name){const f=this.ensure(name);if(!f)return null;const spots=SPOTS[name]||['Faction Safehouse'];const id=`${name}:${f.safehouses}`;this.state.safehouses[id]={id,faction:name,name:spots[f.safehouses%spots.length],district:f.district||'Kigali',security:CLAMP(.55+f.influence*.35-f.heat*.2),active:true};f.safehouses++;this.sync();this.game.events.emit('faction:territory-updated',{faction:name,safehouses:f.safehouses});return this.state.safehouses[id];}
 route(name,district){const f=this.ensure(name);if(!f)return;const key=`${name}:${district||'default'}`;this.state.routes[key]={faction:name,district:district||'default',pressure:CLAMP((f.influence||0)*.7),security:CLAMP(.4+(f.influence||0)*.5-(f.heat||0)*.35),updatedAt:Date.now()};f.routes=Object.keys(this.state.routes).filter(k=>k.startsWith(`${name}:`)).length;}
 refresh(){const source=this.game.npcFactionDynamics?.state?.factions||{};const web=this.game.npcRelationshipWeb?.state?.factions||{};for(const [name,src] of Object.entries(source)){const f=this.ensure(name);const w=web[name]||{};f.influence=CLAMP(Number(src.influence||0));f.heat=CLAMP(Number(src.heat||0));f.state=src.state||'stable';f.district=w.district||src.district||f.district;this.state.districts[f.district||'default']={faction:name,influence:f.influence,heat:f.heat,state:f.state,updatedAt:Date.now()};if(f.influence>.35&&f.safehouses===0)this.safehouse(name);this.route(name,f.district);}}
 resolve(e={}){const f=this.ensure(e.faction);if(!f)return;const success=!!e.success;const key=`${e.faction}:${e.district||f.district||'default'}`;if(this.state.routes[key])this.state.routes[key].pressure=CLAMP(this.state.routes[key].pressure+(success?.06:-.08));if(!success)f.heat=CLAMP(f.heat+.04);this.sync();}
 pressure(e={}){const d=e.district;const zone=this.state.districts[d];if(zone){zone.heat=CLAMP(zone.heat+Number(e.heat||0)*.2);if(zone.heat>.75)zone.state='contested';this.game.events.emit('faction:territory-pressure',{district:d,faction:zone.faction,heat:zone.heat});}}
 update(dt){this.tick+=dt;if(this.tick<5)return;const step=this.tick;this.tick=0;for(const h of Object.values(this.state.safehouses)){h.security=CLAMP(h.security-(h.active?0:.01)*step);if(h.security<.2)h.active=false;}for(const r of Object.values(this.state.routes)){r.pressure*=Math.pow(.96,step);r.security=CLAMP(r.security*.995+(.4-r.security)*.005);}this.state.updatedAt=Date.now();this.sync();}
 profile(name){return this.state.factions[name]?{...this.state.factions[name]}:null;}
 sync(){this.game.state.update({factionTerritory:this.state});}
}
