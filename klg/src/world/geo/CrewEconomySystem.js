const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewEconomySystem{
 constructor(game){this.game=game;this.resolved=new Set();this.state=game.state.get().crewEconomy||{crews:{},updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:formed',e=>this.ensure(e.id||e.crewId,e.district));
  this.game.events.on('crew:progress',e=>this.ensure(e.id||e.crewId,e.district));
  this.game.events.on('crew:safehouse-upgraded',e=>this.invest(e));
  this.game.events.on('mission:crew-resolved',e=>this.resolveMission(e));
  this.game.events.on('faction:economic-order-resolved',e=>this.factionTrade(e));
 }
 ensure(id,district='KigaliCBD'){
  if(!id)return;
  if(!this.state.crews[id])this.state.crews[id]={crewId:id,district,cash:600,treasury:600,income:0,expenses:0,reputation:0,assets:[],orders:0};
 }
 resolveMission(e={}){const key=e.crewMissionId||e.missionId||e.id;if(key&&this.resolved.has(key))return;if(key)this.resolved.add(key);this.ensure(e.crewId);const c=this.state.crews[e.crewId];if(!c)return;c.orders++;if(e.success){c.cash+=Number(e.reward||350);c.income+=Number(e.reward||350);c.reputation=CLAMP(c.reputation+.03);}else{c.cash=Math.max(0,c.cash-80);c.expenses+=80;}this.game.events.emit('crew:economy-update',c);this.sync();}
 invest(e={}){this.ensure(e.crewId);const c=this.state.crews[e.crewId];if(c.cash<150)return;c.cash-=150;c.expenses+=150;c.assets.push({type:'safehouse-upgrade',level:e.level});c.treasury=c.cash;this.sync();}
 factionTrade(e={}){const id=e.crewId;if(!id)return;this.ensure(id);const c=this.state.crews[id];if(e.success){c.cash+=Number(e.reward||0);c.income+=Number(e.reward||0);}this.sync();}
 update(dt){for(const c of Object.values(this.state.crews)){const upkeep=0.5*dt;c.cash=Math.max(0,c.cash-upkeep);c.expenses+=upkeep;c.treasury=c.cash;}this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewEconomy:this.state});}
}