const STREET_NETWORK=[
 {id:'gikondo-main-spine',name:'Gikondo Main Spine',class:'arterial',flow:1.25,lanes:2,night:.9},
 {id:'gikondo-industrial-link',name:'Industrial Link',class:'industrial',flow:1.05,lanes:2,night:.75},
 {id:'gikondo-market-link',name:'Market Link',class:'market',flow:1.18,lanes:1,night:.8},
 {id:'gikondo-community-link',name:'Community Link',class:'local',flow:.82,lanes:1,night:1.05},
 {id:'gikondo-hill-link',name:'Hill Link',class:'hill',flow:.68,lanes:1,night:.65}
];
const HOTSPOTS=[
 {id:'gikondo-market-hotspot',type:'market',density:1.35,npc:['vendor','buyer','courier']},
 {id:'gikondo-workshop-hotspot',type:'workshop',density:1.2,npc:['mechanic','worker','driver']},
 {id:'gikondo-community-hotspot',type:'community',density:1.15,npc:['student','football','families']},
 {id:'gikondo-food-hotspot',type:'food',density:1.05,npc:['vendor','social']},
 {id:'gikondo-transport-hotspot',type:'transport',density:1.3,npc:['driver','moto','pedestrian']}
];
const MOBILITY={
 arterial:{traffic:1.28,pedestrian:.95,moto:1.05},
 industrial:{traffic:1.05,pedestrian:.7,moto:.9,cargo:1.4},
 market:{traffic:1.15,pedestrian:1.45,moto:1.25,cargo:1.1},
 local:{traffic:.72,pedestrian:1.15,moto:1.05},
 hill:{traffic:.62,pedestrian:.8,moto:.88,offroad:1.35}
};
export class GikondoPhysicalLayerSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().gikondoPhysical||{active:false,streetCount:0,hotspotCount:0,mobilityPressure:0,nightActivity:0.5,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  ['world:district-changed','district:normalized-ai','player:district-enter','gikondo:deep-dive-active'].forEach(x=>this.game.events.on(x,e=>this.activate(e||{})));
  this.game.events.on('world:time-changed',e=>this.onTime(e));
  this.game.events.on('world:day-changed',e=>this.onTime(e));
  this.game.events.on('traffic:incident',e=>{if(this.state.active)this.state.mobilityPressure=Math.min(1,this.state.mobilityPressure+.06);});
  this.game.events.on('vehicle:ability-used',e=>{if(this.state.active)this.game.events.emit('gikondo:mobility-signal',{district:'Gikondo',vehicle:e.vehicle||'unknown',ability:e.ability||e.action});});
 }
 activate(e){
  const d=e.district||e.districtName||'';
  if(String(d).toUpperCase()!=='GIKONDO')return;
  this.state.active=true;
  this.state.streetCount=STREET_NETWORK.length;
  this.state.hotspotCount=HOTSPOTS.length;
  this.game.events.emit('gikondo:physical-layer',{district:'Gikondo',streets:STREET_NETWORK,hotspots:HOTSPOTS,mobility:MOBILITY});
 }
 onTime(e={}){
  if(!this.state.active)return;
  const minutes=Number(e.time??this.game.state.get().world?.time??720);
  const night=minutes>=18*60||minutes<6*60;
  this.state.nightActivity=night?.92:.48;
  this.game.events.emit('gikondo:time-profile',{district:'Gikondo',night,activity:this.state.nightActivity});
 }
 update(){
  if(this.state.active)this.state.mobilityPressure=Math.max(0,this.state.mobilityPressure-.003);
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({gikondoPhysical:this.state});}
}
