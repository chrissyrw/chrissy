const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const FACTION_BY_BRANCH={alliance:'faction',legacy:'faction',opportunist:'market',mobility:'transport',stabilize:'civic',recovery:'civic'};
export class PersistentRivalrySystem{
 constructor(game){
  this.game=game;this.tick=0;
  const saved=game.state.get().persistentRivalry||{};
  this.state=saved.rivalries?{...saved}:this.empty();
  this.bind();this.sync();
 }
 empty(){return{rivalries:{},active:[],history:[],updatedAt:0};}
 bind(){
  this.game.events.on('crisis:memory-impact',e=>this.observe(e));
  this.game.events.on('crisis:legacy-recorded',e=>this.resolve(e));
  this.game.events.on('faction:crisis-memory',e=>this.factionMemory(e));
  this.game.events.on('faction:recurring-pressure',e=>this.pressure(e));
 }
 key(d,f){return d+'::'+f;}
 observe(e){
  const faction=FACTION_BY_BRANCH[e.branch]||'social';
  const key=this.key(e.district,faction);
  const r=this.ensure(key,e.district,faction);
  r.memories++;r.tension=C(r.tension+(e.option==='exploit'?.1:.035));
  r.grudge=C(r.grudge+(e.option==='exploit'?.08:e.option==='protect'?-.03:.02),0,1);
  r.trust=C(r.trust+(e.effects?.faction||0)*.2,-1,1);
  if(r.tension>.58)this.activate(r,'memory');
 }
 factionMemory(e){
  const faction=e.branch==='alliance'?'faction':e.branch==='opportunist'?'market':'social';
  const r=this.ensure(this.key(e.district,faction),e.district,faction);
  r.tension=C(r.tension+(e.value<0?.07:.02));
  r.grudge=C(r.grudge+(e.value<0?.06:-.015));
 }
 pressure(e){
  const r=Object.values(this.state.rivalries).find(x=>x.district===e.district);
  if(r){r.tension=C(r.tension+.08);if(r.tension>.6)this.activate(r,'recurring-threat');}
 }
 ensure(key,district,faction){
  return this.state.rivalries[key]||(this.state.rivalries[key]={key,district,faction,tension:0,grudge:0,trust:0,memories:0,encounters:0,level:1,lastActive:0});
 }
 activate(r,source){
  if(Date.now()-r.lastActive<45000)return;
  r.level=Math.min(5,1+Math.floor(r.memories/3));r.encounters++;r.lastActive=Date.now();
  const event={id:'RIVAL-'+Date.now().toString(36),district:r.district,faction:r.faction,tension:r.tension,grudge:r.grudge,level:r.level,source,ttl:45};
  this.state.active.unshift(event);this.state.active=this.state.active.slice(0,8);
  this.state.history.unshift(event);this.state.history=this.state.history.slice(0,48);
  this.game.events.emit('faction:rivalry-activated',event);
  this.game.events.emit('ai:world-pressure',{type:'persistent-rivalry',district:r.district,intensity:C(r.tension+.15)});
 }
 resolve(e){
  for(const r of Object.values(this.state.rivalries))if(r.district===e.district){
   const good=e.outcome==='resolved'||e.outcome==='recovered';
   r.tension=C(r.tension+(good?-.12:.08));r.grudge=C(r.grudge+(good?-.04:.06));
  }
 }
 update(dt){
  this.tick+=dt;if(this.tick<1)return;const step=this.tick;this.tick=0;
  for(const r of Object.values(this.state.rivalries)){r.tension=C(r.tension*.997);r.grudge=C(r.grudge*.999);}
  for(const e of this.state.active)e.ttl-=step;
  this.state.active=this.state.active.filter(e=>e.ttl>0);
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({persistentRivalry:this.state});}
}