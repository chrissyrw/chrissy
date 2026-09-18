const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewBusinessNetworkSystem{
 constructor(game){this.game=game;this.state=game.state.get().crewBusinesses||{businesses:[],updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:territory-controlled',e=>this.create(e));
  this.game.events.on('crew:safehouse-upgraded',e=>this.create({crewId:e.crewId,district:e.district}));
  this.game.events.on('crew:economy-update',e=>this.scale(e));
 }
 create(e={}){
  if(!e.crewId||!e.district)return;
  const id=e.crewId+'-'+e.district;
  if(this.state.businesses.some(b=>b.id===id))return;
  const names=['Crew Garage','Local Delivery Hub','Market Stall','Night Café'];
  const b={id,crewId:e.crewId,district:e.district,name:names[this.state.businesses.length%names.length],level:1,demand:.5,revenue:0,risk:.2,open:true};
  this.state.businesses.push(b);this.game.events.emit('crew:business-opened',b);this.sync();
 }
 scale(e={}){for(const b of this.state.businesses.filter(x=>x.crewId===e.crewId)){b.demand=CLAMP(b.demand+(e.income>e.expenses?.015:-.008));b.revenue+=Math.max(0,e.income||0)*.03;}this.sync();}
 upgrade(id){const b=this.state.businesses.find(x=>x.id===id);if(!b)return false;b.level++;b.demand=CLAMP(b.demand+.08);this.game.events.emit('crew:business-upgraded',b);this.sync();return true;}
 update(dt){for(const b of this.state.businesses){if(b.open)b.revenue+=b.demand*dt*2;}this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewBusinesses:this.state});}
}