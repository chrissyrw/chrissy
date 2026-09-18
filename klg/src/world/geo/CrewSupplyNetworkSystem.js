const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewSupplyNetworkSystem{
 constructor(game){this.game=game;this.state=game.state.get().crewSupply||{links:[],updatedAt:0};this.bind();this.sync();}
 bind(){this.game.events.on('crew:business-opened',e=>this.link(e));this.game.events.on('crew:business-upgraded',e=>this.link(e));this.game.events.on('crew:rivalry-started',e=>this.disrupt(e));}
 link(e={}){if(!e.crewId||!e.district)return;const id=e.crewId+'@'+e.district;let l=this.state.links.find(x=>x.id===id);if(!l){l={id,crewId:e.crewId,district:e.district,reliability:.72,stock:70};this.state.links.push(l);}else l.stock=CLAMP(l.stock+10,0,100);this.game.events.emit('crew:supply-update',l);this.sync();}
 disrupt(e={}){for(const l of this.state.links.filter(x=>x.district===e.district))l.reliability=Math.max(.2,l.reliability-.18);this.sync();}
 update(dt){for(const l of this.state.links){l.stock=CLAMP(l.stock+dt*.8*l.reliability,0,100);}this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewSupply:this.state});}
}