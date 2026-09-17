const EDGES=[
 ['Kimironko','Remera',1.15],['Remera','Kacyiru',.9],['Kacyiru','Kimihurura',.8],['Kimihurura','KigaliCBD',1.05],
 ['KigaliCBD','Nyamirambo',1.1],['Nyamirambo','Kimironko',.95],['KigaliCBD','Remera',1.2],['Kacyiru','Kimironko',.85],
 ['Kimihurura','Remera',.9],['Nyamirambo','KigaliCBD',.8]
];
const CLAMP=(v,a=0,b=3)=>Math.max(a,Math.min(b,v));

export class DistrictEcosystemSystem{
 constructor(game,districtAI,districtEvolution){
  this.game=game;this.ai=districtAI;this.evolution=districtEvolution;this.tick=0;this.lastShock=0;
  const saved=game.state.get().districtEcosystem||{};
  this.state=saved.nodes?{...saved}:this.build();
  this.sync();
 }
 profile(name){
  const p=this.ai.resolve(name)||{};const evo=this.evolution?.profile(name)||{};
  return {...p,evolution:evo};
 }
 build(){
  const names=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD'];
  const nodes=Object.fromEntries(names.map(name=>[name,{goodsIn:0,goodsOut:0,peopleIn:0,peopleOut:0,moneyIn:0,moneyOut:0,trafficIn:0,trafficOut:0,informationIn:0,informationOut:0,pressure:0,opportunity:0}]));
  return {nodes,edges:[],networkEnergy:0,activeFlows:0,updatedAt:0};
 }
 flow(edge){
  const [from,to,base]=edge;const a=this.profile(from),b=this.profile(to);
  const aAct=a.activity||1,bAct=b.activity||1,aEco=a.economy||1,bEco=b.economy||1;
  const aSocial=a.social||1,bSocial=b.social||1;
  const aPressure=a.evolution?.pressure||0,bPressure=b.evolution?.pressure||0;
  const aMomentum=a.evolution?.momentum||0,bMomentum=b.evolution?.momentum||0;
  const people=base*Math.sqrt(aAct*bAct)*(1+(aSocial+bSocial-2)*.35);
  const goods=base*Math.sqrt(aEco*bEco)*(1+bPressure*.25);
  const money=goods*(1+(bEco-aEco)*.3);
  const traffic=base*Math.sqrt((a.traffic||1)*(b.traffic||1));
  const information=base*(1+(aSocial+bSocial-2)*.45+aMomentum*.15+bMomentum*.15);
  return {from,to,people,goods,money,traffic,information,total:people+goods+money+traffic+information};
 }
 rebuild(){
  const next=this.build();
  for(const edge of EDGES){
   const f=this.flow(edge);next.edges.push(f);
   const a=next.nodes[f.from],b=next.nodes[f.to];
   a.peopleOut+=f.people;a.goodsOut+=f.goods;a.moneyOut+=f.money;a.trafficOut+=f.traffic;a.informationOut+=f.information;
   b.peopleIn+=f.people;b.goodsIn+=f.goods;b.moneyIn+=f.money;b.trafficIn+=f.traffic;b.informationIn+=f.information;
  }
  for(const [name,n] of Object.entries(next.nodes)){
   const p=this.profile(name);const imbalance=(n.goodsIn-n.goodsOut)*.08+(n.peopleIn-n.peopleOut)*.04;
   n.pressure=CLAMP((p.evolution?.pressure||0)+Math.max(0,-imbalance),0,1);
   n.opportunity=CLAMP(Math.abs(imbalance)*.12+(p.evolution?.momentum||0)*.35,0,1);
  }
  next.activeFlows=next.edges.filter(e=>e.total>3).length;
  next.networkEnergy=next.edges.reduce((s,e)=>s+e.total,0);
  next.updatedAt=Date.now();this.state=next;this.sync();
 }
 detectShocks(){
  for(const [name,n] of Object.entries(this.state.nodes)){if(n.pressure>.72){this.game.events.emit('district:shock',{district:name,pressure:n.pressure,opportunity:n.opportunity});}}
  for(const e of this.state.edges){if(e.goods>3.2||e.information>3.4){this.game.events.emit('district:trade-opportunity',{from:e.from,to:e.to,goods:e.goods,information:e.information});}}
 }
 sync(){this.game.state.update({districtEcosystem:this.state});}
 update(dt){this.tick+=dt;this.lastShock+=dt;if(this.tick<3)return;this.tick=0;this.rebuild();this.game.events.emit('district:network-update',{activeFlows:this.state.activeFlows,networkEnergy:this.state.networkEnergy});if(this.lastShock>8){this.lastShock=0;this.detectShocks();}}
}
