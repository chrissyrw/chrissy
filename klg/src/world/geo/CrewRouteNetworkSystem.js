export class CrewRouteNetworkSystem{
 constructor(game){this.game=game;this.state=game.state.get().crewRoutes||{routes:[],updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:territory-controlled',e=>this.connect(e));
  this.game.events.on('crew:safehouse-ready',e=>this.connect(e));
  this.game.events.on('crew:rivalry-started',e=>this.disrupt(e));
 }
 connect(e={}){
  if(!e.crewId||!e.district)return;
  const id=e.crewId+'@'+e.district;
  if(!this.state.routes.some(r=>r.id===id))this.state.routes.push({id,crewId:e.crewId,district:e.district,reliability:.65,traffic:0,active:true});
  this.game.events.emit('crew:route-network',{crewId:e.crewId,district:e.district,reliability:.65});this.sync();
 }
 disrupt(e={}){
  for(const r of this.state.routes.filter(x=>x.district===e.district))r.reliability=Math.max(.15,r.reliability-.15);
  this.sync();
 }
 update(dt){for(const r of this.state.routes)if(r.active)r.traffic=Math.min(1,r.traffic+dt*.001);this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewRoutes:this.state});}
}