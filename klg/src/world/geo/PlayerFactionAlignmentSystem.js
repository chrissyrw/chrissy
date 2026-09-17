const CLAMP=(v,a=-100,b=100)=>Math.max(a,Math.min(b,v));
const DEFAULTS={trust:0,reputation:0,influence:0,heat:0,standing:'neutral'};
const ACTIONS={help:8,rescue:12,mission:6,trade:3,protect:10,sabotage:-10,oppose:-8,betray:-18,avoid:0};
export class PlayerFactionAlignmentSystem{
 constructor(game){this.game=game;const saved=game.state.get().playerFactionAlignment||{};this.state=saved.factions?{...saved}:this.empty();this.bind();this.sync();}
 empty(){return{factions:{},history:[],dominant:null,updatedAt:0};}
 ensure(name){if(!name)return null;if(!this.state.factions[name])this.state.factions[name]={name,...DEFAULTS};return this.state.factions[name];}
 bind(){this.game.events.on('faction:encounter-resolved',e=>this.action(e.faction,e.action||'avoid',e));this.game.events.on('faction:mission-resolved',e=>this.action(e.faction,e.success?'mission':'betray',e));this.game.events.on('faction:territory-pressure',e=>this.pressure(e));this.game.events.on('npc:memory-recorded',e=>{if(e.faction&&e.reputation)this.change(e.faction,e.reputation*.12,'memory');});this.game.events.on('faction:safe-spot',e=>this.touch(e.faction));}
 change(name,amount,reason='world'){const f=this.ensure(name);if(!f)return;f.reputation=CLAMP(f.reputation+amount);f.trust=CLAMP(f.trust+amount*.45);f.influence=CLAMP(f.influence+amount*.12);this.recalculate(f);this.record(name,reason,amount);this.sync();}
 action(name,type='avoid',data={}){if(!name)return;const base=ACTIONS[type]??0;const amount=base*(data.success===false?.6:1);this.change(name,amount,type);}
 pressure(e={}){if(!e.district)return;const web=this.game.npcRelationshipWeb?.state?.factions||{};for(const [name,f] of Object.entries(web))if(f.district===e.district&&Number(e.heat||0)>.4)this.change(name,-Number(e.heat||0)*2,'territory-pressure');}
 touch(name){const f=this.ensure(name);if(f)f.trust=CLAMP(f.trust+.5);this.sync();}
 recalculate(f){if(f.reputation>=55)f.standing='trusted';else if(f.reputation>=25)f.standing='ally';else if(f.reputation>=8)f.standing='friendly';else if(f.reputation<=-55)f.standing='enemy';else if(f.reputation<=-25)f.standing='hostile';else if(f.reputation<=-8)f.standing='cold';else f.standing='neutral';}
 record(name,reason,amount){this.state.history.unshift({faction:name,reason,amount:Number(amount.toFixed(2)),at:Date.now()});this.state.history=this.state.history.slice(0,64);}
 dominant(){const values=Object.values(this.state.factions);return values.sort((a,b)=>b.reputation-a.reputation)[0]||null;}
 update(dt){const values=Object.values(this.state.factions);for(const f of values){f.trust*=Math.pow(.998,dt);f.heat*=Math.pow(.995,dt);f.influence=CLAMP(f.influence+(f.trust/100)*.001*dt);this.recalculate(f);}const d=this.dominant();this.state.dominant=d?.name||null;this.state.updatedAt=Date.now();this.sync();}
 profile(name){const f=this.state.factions[name];return f?{...f}:null;}
 sync(){this.game.state.update({playerFactionAlignment:this.state});this.game.events.emit('faction:player-standing',{factions:{...this.state.factions},dominant:this.state.dominant});}
}
