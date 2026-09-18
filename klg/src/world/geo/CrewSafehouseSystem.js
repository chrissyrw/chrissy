const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewSafehouseSystem{
 constructor(game){this.game=game;this.state=game.state.get().crewSafehouses||{houses:{},updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:territory-controlled',e=>this.ensure(e));
  this.game.events.on('player:crew-leadership',e=>this.ensure({crewId:e.crewId,district:this.findDistrict(e.crewId)}));
  this.game.events.on('crew:member-recruited',e=>this.usage(e));
 }
 findDistrict(id){const t=this.game.state.get().crewTerritory?.districts||{};return Object.entries(t).find(([,v])=>v.crewId===id)?.[0]||'KigaliCBD';}
 ensure(e={}){
  if(!e.crewId)return;
  if(!this.state.houses[e.crewId])this.state.houses[e.crewId]={crewId:e.crewId,district:e.district||this.findDistrict(e.crewId),level:1,capacity:4,security:.35,storage:100,visits:0};
  this.game.events.emit('crew:safehouse-ready',this.state.houses[e.crewId]);this.sync();
 }
 upgrade(crewId){
  const h=this.state.houses[crewId];if(!h)return false;
  h.level++;h.capacity+=2;h.security=CLAMP(h.security+.1);h.storage+=75;
  this.game.events.emit('crew:safehouse-upgraded',h);this.sync();return true;
 }
 usage(e={}){const h=this.state.houses[e.crewId];if(h)h.visits++;}
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewSafehouses:this.state});}
}