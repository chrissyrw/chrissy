const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const STANDING={neutral:0,friendly:1,ally:2,trusted:3,cold:-1,hostile:-2,enemy:-3};
export class FactionAccessSystem{
 constructor(game){this.game=game;this.tick=0;const saved=game.state.get().factionAccess||{};this.state=saved.factions?{...saved}:this.empty();this.bind();this.sync();}
 empty(){return{factions:{},accessEvents:[],updatedAt:0};}
 bind(){this.game.events.on('faction:player-standing',e=>this.refresh(e.factions));this.game.events.on('faction:mission-generated',e=>this.missionGate(e));this.game.events.on('faction:mission-accepted',e=>this.missionGate(e));this.game.events.on('faction:safe-spot',e=>this.safehouseGate(e));this.game.events.on('faction:conflict-event',e=>this.conflictGate(e));}
 ensure(name){if(!name)return null;if(!this.state.factions[name])this.state.factions[name]={name,level:0,missionAccess:true,safehouseAccess:false,discount:0,protection:0,routeAccess:false};return this.state.factions[name];}
 refresh(factions={}){for(const [name,src] of Object.entries(factions)){const f=this.ensure(name),level=STANDING[src.standing]??0;f.level=level;f.missionAccess=level>=-1;f.safehouseAccess=level>=2;f.routeAccess=level>=1;f.discount=CLAMP(level>=2?.15:level>=1?.07:level<0?-.08:0);f.protection=CLAMP(level>=3?1:level>=2?.65:level>=1?.25:0);}this.sync();}
 missionGate(e={}){const f=this.state.factions[e.faction];if(!f||f.missionAccess)return;if(e.status==='available')e.status='locked';this.record('mission-locked',e.faction);}
 safehouseGate(e={}){const f=this.state.factions[e.faction];if(!f)return;if(!f.safehouseAccess){this.record('safehouse-locked',e.faction);this.game.events.emit('faction:safehouse-locked',{faction:e.faction});}}
 conflictGate(e={}){const names=[e.conflict?.a,e.conflict?.b].filter(Boolean);for(const name of names){const f=this.state.factions[name];if(f?.protection>.5)this.game.events.emit('faction:player-protection',{faction:name,district:e.district,strength:f.protection});}}
 record(type,faction){this.state.accessEvents.unshift({type,faction,at:Date.now()});this.state.accessEvents=this.state.accessEvents.slice(0,48);}
 canAccess(name,resource='mission'){const f=this.state.factions[name];if(!f)return false;return resource==='safehouse'?f.safehouseAccess:resource==='route'?f.routeAccess:f.missionAccess;}
 modifier(name){const f=this.state.factions[name];return f?{discount:f.discount,protection:f.protection,routeAccess:f.routeAccess}:null;}
 update(dt){this.tick+=dt;if(this.tick<4)return;this.tick=0;this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({factionAccess:this.state});}
}
