const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const GOODS={food:1,parts:1.4,textiles:1.1,fuel:1.2,electronics:1.7,services:1.3,vehicles:2.4,recovery:1.5,supplies:1.3,permits:1.6,delivery:1.1};
export class FactionWarEconomySystem{
 constructor(game){this.game=game;this.tick=0;const saved=game.state.get().factionWarEconomy||{};this.state=saved.factions?{...saved}:this.empty();this.seed();this.bind();this.sync();}
 empty(){return{factions:{},districts:{},routes:{},orders:[],history:[],updatedAt:0};}
 seed(){const source=this.game.factionEconomy?.state?.factions||{};for(const [name,f] of Object.entries(source))this.ensure(name,f.district);}
 ensure(name,district){if(!name)return null;if(!this.state.factions[name])this.state.factions[name]={name,district:district||null,capital:500,supply:1,demand:1,morale:.7,territory:.5,warChest:250,losses:0,gains:0};return this.state.factions[name];}
 bind(){
  this.game.events.on('faction:conflict-simulation',e=>this.conflict(e.conflict||e));
  this.game.events.on('faction:conflict-choice',e=>this.choice(e));
  this.game.events.on('faction:territory-pressure',e=>this.pressure(e));
  this.game.events.on('faction:economic-order-resolved',e=>this.order(e));
  this.game.events.on('faction:economy-purchase',e=>this.purchase(e));
  this.game.events.on('faction:rivalry-activated',e=>this.rivalry(e));
 }
 conflict(c={}){
  const names=[c.a,c.b].filter(Boolean);if(names.length<2)return;
  names.forEach(n=>this.ensure(n,c.district));
  const a=this.state.factions[c.a],b=this.state.factions[c.b],intensity=C(Number(c.intensity||0));
  const drain=intensity*.06;
  a.warChest=Math.max(0,a.warChest-drain*90);b.warChest=Math.max(0,b.warChest-drain*90);
  a.supply=C(a.supply-drain*.8,.15,2);b.supply=C(b.supply-drain*.8,.15,2);
  a.demand=C(a.demand+drain,.4,2);b.demand=C(b.demand+drain,.4,2);
  a.morale=C(a.morale-intensity*.02);b.morale=C(b.morale-intensity*.02);
  if(intensity>.78)this.spawnWarOrder(c);
  this.rebalance(c.district);
  this.sync();
 }
 spawnWarOrder(c){
  const loser=(this.state.factions[c.a].morale<this.state.factions[c.b].morale)?c.a:c.b;
  const f=this.state.factions[loser],good=this.pickGood(loser);
  this.state.orders.unshift({id:'WAR-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),faction:loser,district:c.district||f.district,good,quantity:1,reward:Math.round(90*GOODS[good]),reason:'war-shortage',expires:Date.now()+75000,status:'available'});
  this.state.orders=this.state.orders.slice(0,40);
  this.game.events.emit('faction:war-order',this.state.orders[0]);
 }
 pickGood(name){const src=this.game.factionEconomy?.state?.factions?.[name]?.goods||['food','parts'];return src[Math.floor(Math.random()*src.length)]||'food';}
 choice(e={}){
  const c=e.conflict||{};if(c.a&&c.b){const f=this.state.factions[c.a],g=this.state.factions[c.b];if(e.choice==='joinA')f.morale=C(f.morale+.08);if(e.choice==='joinB')g.morale=C(g.morale+.08);if(e.choice==='mediate'){f.morale=C(f.morale+.04);g.morale=C(g.morale+.04);}}
 }
 pressure(e={}){
  const d=e.district;if(!d)return;const z=this.state.districts[d]||(this.state.districts[d]={district:d,control:null,pressure:0,shortage:0,traffic:0});
  z.pressure=C(z.pressure+Number(e.heat||0)*.35);
  z.shortage=C(z.shortage+Number(e.heat||0)*.25);
  z.traffic=C(z.traffic+Number(e.heat||0)*.2);
  this.rebalance(d);
 }
 order(e={}){
  const f=this.state.factions[e.faction];if(!f)return;
  if(e.success){f.warChest=Math.min(5000,f.warChest+Number(e.reward||0)*.08);f.supply=C(f.supply+.03,.15,2);}else f.morale=C(f.morale-.04);
 }
 purchase(e={}){
  const f=this.state.factions[e.faction];if(f){f.warChest=Math.min(5000,f.warChest+Number(e.total||0)*.04);f.demand=C(f.demand+.02,.4,2);}
 }
 rivalry(e={}){
  const f=this.ensure(e.faction,e.district);if(f)f.morale=C(f.morale-.03);
 }
 rebalance(district){
  const fs=Object.values(this.state.factions).filter(f=>f.district===district);if(!fs.length)return;
  fs.forEach(f=>{f.territory=C(f.territory+(f.morale-.5)*.012);});
  fs.sort((a,b)=>(b.territory+b.morale)-(a.territory+a.morale));
  const winner=fs[0];
  const z=this.state.districts[district]||(this.state.districts[district]={district,pressure:0,shortage:0,traffic:0});
  if(winner)z.control=winner.name;
  fs.forEach(f=>f.gains=f.territory>.6?f.gains+.01:f.gains);
 }
 update(dt){
  this.tick+=dt;if(this.tick<5)return;const step=this.tick;this.tick=0;
  for(const f of Object.values(this.state.factions)){
   const pressure=Object.values(this.state.districts).filter(d=>d.control===f.name).reduce((s,d)=>s+d.pressure,0);
   f.warChest=Math.min(5000,f.warChest+step*(1.2-pressure*.3));
   f.supply=C(f.supply+(1-f.demand)*.01*step,.15,2);
   f.morale=C(f.morale+(f.supply-.7)*.006*step-.002*pressure*step);
  }
  for(const d of Object.values(this.state.districts)){d.pressure*=Math.pow(.96,step);d.shortage*=Math.pow(.94,step);d.traffic*=Math.pow(.95,step);if(d.pressure>.7)this.game.events.emit('ai:world-pressure',{type:'war-economy',district:d.district,intensity:d.pressure});}
  this.state.history.push({at:Date.now(),districts:Object.values(this.state.districts).map(d=>({...d}))});this.state.history=this.state.history.slice(-32);
  this.state.updatedAt=Date.now();this.sync();
 }
 profile(name){return this.state.factions[name]?{...this.state.factions[name]}:null;}
 sync(){this.game.state.update({factionWarEconomy:this.state});}
}