const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const MAP={
 respond:{culture:.08,faction:.1,npc:.12,opportunity:.08,legacy:.14},
 protect:{culture:.12,faction:.16,npc:.1,opportunity:.06,legacy:.18},
 exploit:{culture:-.06,faction:-.08,npc:-.04,opportunity:.18,legacy:.08},
 resolve:{culture:.1,faction:.08,npc:.12,opportunity:.1,legacy:.16},
 reroute:{culture:.03,faction:.04,npc:.04,opportunity:.14,legacy:.1},
 commit:{culture:.16,faction:.18,npc:.14,opportunity:.12,legacy:.24}
};
export class CrisisMemoryLegacySystem{
 constructor(game){
  this.game=game;this.tick=0;
  const saved=game.state.get().crisisMemoryLegacy||{};
  this.state=saved.memories?{...saved}:this.empty();
  this.bind();this.sync();
 }
 empty(){return{memories:[],districts:{},factions:{},culture:{},npcs:{},ai:{},legends:[],updatedAt:0};}
 bind(){
  this.game.events.on('crisis:branch-changed',e=>this.record(e));
  this.game.events.on('crisis:legacy-recorded',e=>this.legacy(e));
  this.game.events.on('city:crisis-resolved',e=>this.resolution(e));
 }
 district(name){
  return this.state.districts[name]||(this.state.districts[name]={crises:0,pressure:0,trust:0,identity:0,values:{},branches:{},opportunities:0});
 }
 record(e){
  const d=this.district(e.district),m=MAP[e.option]||{culture:.02,faction:.02,npc:.02,opportunity:.02,legacy:.03};
  d.crises++;d.pressure=C(d.pressure+Math.abs(e.intensity||.1)*.12);
  d.trust=C(d.trust+(m.faction>0?m.faction*.5:-.03),-1,1);
  d.identity+=m.legacy;
  d.branches[e.branch]=(d.branches[e.branch]||0)+1;
  for(const domain of ['culture','faction','npc'])this.state[domain==='npc'?'npcs':domain][e.district]=(this.state[domain==='npc'?'npcs':domain][e.district]||0)+m[domain];
  this.state.ai[e.district]=C((this.state.ai[e.district]||0)+m.opportunity);
  this.state.memories.unshift({id:e.id,district:e.district,option:e.option,branch:e.branch,intensity:e.intensity,at:Date.now()});
  this.state.memories=this.state.memories.slice(0,96);
  this.game.events.emit('crisis:memory-impact',{district:e.district,option:e.option,branch:e.branch,effects:m});
  this.game.events.emit('culture:crisis-memory',{district:e.district,branch:e.branch,value:m.culture});
  this.game.events.emit('faction:crisis-memory',{district:e.district,branch:e.branch,value:m.faction});
  this.game.events.emit('npc:crisis-memory',{district:e.district,branch:e.branch,value:m.npc});
 }
 legacy(e){
  const d=this.district(e.district),score=(MAP[e.branch]?.legacy||.05)+((e.choices?.length||1)*.03);
  const legend={id:'crisis-legend-'+Date.now(),district:e.district,branch:e.branch,outcome:e.outcome,strength:C(score),bornAt:Date.now()};
  this.state.legends.unshift(legend);this.state.legends=this.state.legends.slice(0,32);
  d.identity+=score;
  this.game.events.emit('world:crisis-legend',legend);
 }
 resolution(e){
  const d=this.district(e.district);
  const good=e.outcome==='resolved'||e.outcome==='recovered';
  d.pressure=C(d.pressure+(good?-.18:.12));
  d.opportunities=C(d.opportunities+(good?.08:-.03));
  this.game.events.emit('ai:crisis-memory-update',{district:e.district,outcome:e.outcome,bias:this.state.ai[e.district]||0});
 }
 update(dt){
  this.tick+=dt;if(this.tick<5)return;this.tick=0;
  for(const d of Object.values(this.state.districts)){d.pressure=C(d.pressure*.96);d.identity*=.999;}
  for(const k of Object.keys(this.state.ai))this.state.ai[k]*=.99;
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({crisisMemoryLegacy:this.state});}
}