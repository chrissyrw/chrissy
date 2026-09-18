const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewTerritorySystem{
 constructor(game){this.game=game;this.state=game.state.get().crewTerritory||{districts:{},updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:formed',e=>this.claim(e));
  this.game.events.on('crew:progress',e=>this.updateInfluence(e));
  this.game.events.on('crew:rivalry-started',e=>this.pressure(e));
  this.game.events.on('crew:safehouse-upgraded',e=>this.pressure(e));
 }
 claim(e={}){
  if(!e.id)return;
  const d=e.district||'KigaliCBD';
  const current=this.state.districts[d];
  if(!current)this.state.districts[d]={crewId:e.id,influence:.12,control:.08,heat:0,contested:false};
  else if(current.crewId!==e.id){current.contested=true;current.heat=CLAMP(current.heat+.08);}
  this.game.events.emit('crew:territory-update',{district:d,...this.state.districts[d]});this.sync();
 }
 updateInfluence(e={}){
  const c=Object.values(this.state.districts).find(x=>x.crewId===e.id);if(!c)return;
  c.influence=CLAMP(c.influence+(e.influence||0)*.15);c.control=CLAMP(c.control+(e.cohesion>.65?.012:-.006));
  if(c.control>.65&&!c.contested)this.game.events.emit('crew:territory-controlled',{crewId:e.id,district:e.district,control:c.control});
  this.sync();
 }
 pressure(e={}){if(!e.district)return;const c=this.state.districts[e.district];if(c)c.heat=CLAMP(c.heat+.05);}
 update(dt){for(const c of Object.values(this.state.districts)){c.heat=CLAMP(c.heat-.002);if(c.heat<.2)c.contested=false;}this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewTerritory:this.state});}
}