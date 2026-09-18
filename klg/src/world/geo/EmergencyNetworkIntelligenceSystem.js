const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];
const LINKS={
 Kimironko:['Remera','Kacyiru','Nyamirambo'],
 Nyamirambo:['KigaliCBD','Kimironko'],
 Kimihurura:['Kacyiru','KigaliCBD','Remera'],
 Kacyiru:['Kimironko','Kimihurura','Remera'],
 Remera:['Kimironko','Kacyiru','Kimihurura','KigaliCBD'],
 KigaliCBD:['Kimihurura','Remera','Nyamirambo','Kacyiru'],
 Rebero:['KigaliCBD','Nyamirambo']
};

export class EmergencyNetworkIntelligenceSystem{
 constructor(game){
  this.game=game;this.tick=0;this.clock=0;this.incidents={};this.resources={service:2,police:2,medical:1};
  const saved=game.state.get().emergencyNetwork||{};
  this.state=saved.nodes?{...saved}:this.empty();
  this.bind();this.sync();
 }
 empty(){return{nodes:{},links:{},networkPressure:0,activeIncidents:0,dispatches:0,overloaded:0,updatedAt:0};}
 bind(){
  this.game.events.on('emergency:incident-created',e=>this.addIncident(e));
  this.game.events.on('ai:emergency-decision',e=>this.onDecision(e));
  this.game.events.on('emergency:secondary-event',e=>this.onSecondary(e));
  this.game.events.on('emergency:city-recovered',e=>this.recover(e));
 }
 ensureDistrict(d){
  if(!this.state.nodes[d])this.state.nodes[d]={pressure:0,incidents:0,traffic:0,panic:0,recovery:0,history:[]};
  if(!this.state.links[d])this.state.links[d]={};
  for(const n of (LINKS[d]||[]))this.state.links[d][n]=C((this.state.links[d][n]||0));
  return this.state.nodes[d];
 }
 addIncident(e){
  const n=this.ensureDistrict(e.district||'Kigali');this.incidents[e.id]={...e,startedAt:Date.now()};
  n.incidents++;n.pressure=C(n.pressure+e.intensity*.7);n.panic=C(n.panic+e.intensity*.35);
  for(const neighbor of (LINKS[e.district]||[])){
   const x=this.ensureDistrict(neighbor);x.pressure=C(x.pressure+e.intensity*.12);this.state.links[e.district][neighbor]=C((this.state.links[e.district][neighbor]||0)+e.intensity*.1);
  }
  this.recompute();
  this.game.events.emit('emergency:network-impact',{district:e.district,pressure:n.pressure,active:this.state.activeIncidents,spillover:(LINKS[e.district]||[]).length});
 }
 onDecision(e){
  if(!e?.id)return;
  const n=this.ensureDistrict(e.district);
  if(e.action==='dispatch'){this.state.dispatches++;n.pressure=C(n.pressure-.08);}
  if(e.action==='reroute')n.traffic=C(n.traffic+e.priority*.45);
  if(e.action==='reinforce')n.panic=C(n.panic-e.priority*.18);
  if(e.action==='spawn-assist')n.pressure=C(n.pressure+e.priority*.08);
  this.recompute();
 }
 onSecondary(e){
  const n=this.ensureDistrict(e.district);n.pressure=C(n.pressure+e.intensity*.18);
  if(e.type==='traffic-jam'||e.type==='traffic-slowdown')n.traffic=C(n.traffic+e.intensity*.3);
  if(e.type==='npc-evacuation')n.panic=C(n.panic+e.intensity*.25);
  const neighbors=LINKS[e.district]||[];
  for(const d of neighbors)this.ensureDistrict(d).pressure=C(this.ensureDistrict(d).pressure+e.intensity*.045);
  this.recompute();
  this.game.events.emit('emergency:network-wave',{district:e.district,type:e.type,pressure:n.pressure,spillover:neighbors.length});
 }
 recover(e){
  const n=this.ensureDistrict(e.district);n.recovery=C(n.recovery+.25);n.pressure=C(n.pressure*.45);n.panic=C(n.panic*.55);n.traffic=C(n.traffic*.65);
  if(e.id)delete this.incidents[e.id];
  for(const d of (LINKS[e.district]||[])){const x=this.ensureDistrict(d);x.pressure=C(x.pressure*.96);}
  this.recompute();
  this.game.events.emit('emergency:network-recovery',{district:e.district,pressure:n.pressure,recovery:n.recovery});
 }
 allocate(){
  const active=Object.values(this.incidents);
  if(!active.length)return;
  const ranked=active.map(i=>{
   const n=this.ensureDistrict(i.district);
   const forecast=this.game.state.get().worldSimulationIntelligence?.forecasts?.find(f=>f.horizon===10);
   const hot=forecast?.hot?.find(x=>x.district===i.district);
   return {...i,priority:C(i.intensity*.55+n.pressure*.3+n.panic*.15+(hot?.risk||0)*.15)};
  }).sort((a,b)=>b.priority-a.priority);
  const top=ranked[0];
  const need=top.type==='medical-call'?'medical':top.type==='road-crash'?'police':'service';
  const units=this.resources[need]||0;
  this.game.events.emit('emergency:resource-allocation',{id:top.id,district:top.district,priority:top.priority,unitType:need,available:units,queue:ranked.length});
  if(ranked.length>1)this.game.events.emit('emergency:network-overload',{active:ranked.length,highest:top.district,pressure:this.state.networkPressure});
 }
 recompute(){
  const nodes=Object.values(this.state.nodes);this.state.activeIncidents=Object.keys(this.incidents).length;
  this.state.networkPressure=nodes.length?C(nodes.reduce((s,n)=>s+n.pressure+n.panic*.35+n.traffic*.2,0)/(nodes.length*1.55)):0;
  this.state.overloaded=Object.keys(this.incidents).length>this.resources.service+this.resources.police+this.resources.medical?1:0;
 }
 update(dt){
  this.tick+=dt;this.clock+=dt;if(this.tick<1)return;this.tick=0;
  for(const n of Object.values(this.state.nodes)){n.pressure=C(n.pressure*.992);n.panic=C(n.panic*.989);n.traffic=C(n.traffic*.991);n.recovery=C(n.recovery*.995);}
  this.recompute();
  if(this.clock>=3){this.clock=0;this.allocate();}
  this.state.updatedAt=Date.now();this.sync();
  if(this.state.networkPressure>.62)this.game.events.emit('emergency:network-pressure', {pressure:this.state.networkPressure,active:this.state.activeIncidents});
 }
 sync(){this.game.state.update({emergencyNetwork:this.state});}
}