const PLACES=[
 {id:'gikondo-core',name:'Gikondo',type:'district-core',tags:['local-life','industrial','community'],weight:1},
 {id:'gikondo-industrial-belt',name:'Gikondo Industrial Belt',type:'industrial-zone',tags:['workshops','warehouses','logistics'],weight:.95},
 {id:'gikondo-market-edge',name:'Gikondo Market Edge',type:'market-zone',tags:['trading','vendors','footfall'],weight:.9},
 {id:'gikondo-community-courts',name:'Gikondo Community Courts',type:'social-zone',tags:['football','youth','social'],weight:.8},
 {id:'gikondo-hill-links',name:'Gikondo Hill Links',type:'hill-route',tags:['slopes','views','shortcuts'],weight:.75},
 {id:'gikondo-evening-strip',name:'Gikondo Evening Strip',type:'night-zone',tags:['food','music','social'],weight:.7}
];
const BUSINESSES=[
 {id:'gikondo-workshop-row',type:'mechanic-cluster',goods:['repairs','tires','parts'],risk:.18},
 {id:'gikondo-cargo-yard',type:'logistics',goods:['cargo','delivery','storage'],risk:.28},
 {id:'gikondo-food-corner',type:'food',goods:['food','drinks'],risk:.08},
 {id:'gikondo-local-traders',type:'market',goods:['produce','household'],risk:.12},
 {id:'gikondo-mobile-services',type:'services',goods:['phone','repairs','small-services'],risk:.1}
];
const NPC_CULTURE={
 social:1.18,commerce:1.12,mobility:1.08,night:1.05,community:1.3,
 jobs:['mechanic','vendor','driver','courier','worker','student','security'],
 hotspots:['market','workshop','football','food','transport'],
 moods:['proud','busy','social','watchful']
};
const OPPORTUNITIES=[
 {id:'gikondo-cargo-run',type:'logistics',label:'Urgent Cargo Run',reward:850,risk:.32,vehicle:['UTILITY','OFFROAD']},
 {id:'gikondo-repair-call',type:'mechanic',label:'Emergency Repair Call',reward:520,risk:.16,vehicle:['UTILITY','MOTO']},
 {id:'gikondo-market-supply',type:'trade',label:'Market Supply Window',reward:430,risk:.2,vehicle:['UTILITY','MOTO']},
 {id:'gikondo-community-match',type:'social',label:'Community Match Support',reward:260,risk:.06,vehicle:['ANY']},
 {id:'gikondo-night-delivery',type:'night',label:'Night Delivery Shortcut',reward:1100,risk:.42,vehicle:['MOTO','SPECIAL']},
 {id:'gikondo-hill-shortcut',type:'route',label:'Hill Shortcut Discovery',reward:600,risk:.3,vehicle:['RALLY','BUGGY','OFFROAD']},
 {id:'gikondo-rescue-chain',type:'rescue',label:'Neighborhood Rescue Chain',reward:1250,risk:.38,vehicle:['OFFROAD','UTILITY','MOTO']}
];
const STREET_SIGNATURES=[
 {id:'industrial',motifs:['metal-gates','warehouse-fronts','painted-signage','utility-lines']},
 {id:'residential',motifs:['compound-walls','small-shops','greenery','local-signage']},
 {id:'market',motifs:['canopies','vendor-signs','foot-traffic','woven-patterns']},
 {id:'hill',motifs:['retaining-walls','terraces','view-corridors','stone']},
 {id:'night',motifs:['warm-lights','food-stalls','music-spots','sign-glow']}
];
export class GikondoDeepDiveSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().gikondoDeepDive||{active:false,visits:0,places:0,businesses:0,opportunities:0,culture:0.72,memory:0,updatedAt:0};
  this.lastDistrict='';
  this.bind();this.sync();
 }
 bind(){
  const activate=e=>this.onDistrict(e?.district||e?.districtName||'');
  ['world:district-changed','district:normalized-ai','player:district-enter','geo:world-loaded'].forEach(x=>this.game.events.on(x,activate));
  this.game.events.on('player:choice-made',e=>{if(this.state.active)this.state.memory=Math.min(1,this.state.memory+.01);});
  this.game.events.on('mission:completed',e=>{if((e?.district||'')==='Gikondo')this.state.memory=Math.min(1,this.state.memory+.035);});
  this.game.events.on('world:consequence',e=>{if((e?.district||'')==='Gikondo')this.state.memory=Math.min(1,this.state.memory+.02);});
 }
 onDistrict(district){
  if(String(district).toUpperCase()!=='GIKONDO')return;
  if(!this.state.active)this.state.visits++;
  this.state.active=true;this.lastDistrict='Gikondo';this.state.places=PLACES.length;this.state.businesses=BUSINESSES.length;this.state.opportunities=OPPORTUNITIES.length;
  this.state.culture=Math.min(1,.72+Math.min(.2,this.state.visits*.015)+this.state.memory*.08);
  this.game.events.emit('gikondo:deep-dive-active',{district:'Gikondo',places:PLACES,businesses:BUSINESSES,culture:NPC_CULTURE,opportunities:OPPORTUNITIES,streetSignatures:STREET_SIGNATURES});
 }
 districtProfile(){return{district:'Gikondo',identity:{type:'industrial-community',tone:'busy-warm-local'},places:PLACES,businesses:BUSINESSES,npcCulture:NPC_CULTURE,opportunities:OPPORTUNITIES,streetSignatures:STREET_SIGNATURES};}
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({gikondoDeepDive:this.state});}
}
