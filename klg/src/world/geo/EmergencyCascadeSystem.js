import * as THREE from 'three';

const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const TYPES={
 'road-crash':['traffic-jam','npc-evacuation','police-diversion'],
 'stranded-driver':['traffic-slowdown','service-response','assist-opportunity'],
 'medical-call':['medical-route','npc-evacuation','priority-traffic'],
 'blocked-road':['route-diversion','delivery-delay','business-slowdown']
};

export class EmergencyCascadeSystem{
 constructor(game){
  this.game=game;this.tick=0;this.active={};this.history=[];
  this.state=game.state.get().emergencyCascade||{cascades:0,recoveries:0,secondary:0,active:0,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('emergency:incident-created',e=>this.start(e));
  this.game.events.on('emergency:traffic-impact',e=>this.onImpact(e));
  this.game.events.on('emergency:rescue-complete',e=>this.resolve(e,'rescued'));
  this.game.events.on('emergency:reported',e=>this.resolve(e,'reported'));
  this.game.events.on('emergency:ignored',e=>this.resolve(e,'ignored'));
 }
 start(e){
  if(!e?.id)return;
  const stages=(TYPES[e.type]||['traffic-slowdown','social-alert','district-recovery']);
  const c={id:e.id,type:e.type,district:e.district,position:e.position,intensity:C(e.intensity),stage:0,stages,ttl:55,status:'active',createdAt:Date.now(),signals:[]};
  this.active[e.id]=c;this.state.cascades++;this.emitStage(c);
  this.sync();
 }
 emitStage(c){
  const type=c.stages[c.stage];if(!type)return;
  c.signals.push({type,stage:c.stage,at:Date.now()});this.state.secondary++;
  this.game.events.emit('emergency:secondary-event',{id:c.id,source:c.type,type,district:c.district,position:c.position,intensity:c.intensity,stage:c.stage});
  if(type.includes('traffic')||type==='route-diversion'||type==='delivery-delay')this.game.events.emit('traffic:consequence',{district:c.district,pressure:C(c.intensity*.7)});
  if(type.includes('evacuation'))this.game.events.emit('emergency:evacuation-wave',{district:c.district,position:c.position,intensity:c.intensity});
  if(type.includes('business'))this.game.events.emit('economy:consequence',{district:c.district,pressure:C(c.intensity*.35)});
  if(type.includes('opportunity')||type.includes('assist'))this.game.events.emit('ai:world-pressure',{type:'emergency-opportunity',district:c.district,intensity:c.intensity});
  this.game.events.emit('city:cascade-wave',{type:'emergency-'+type,district:c.district,to:c.district,strength:c.intensity});
 }
 onImpact(e){
  const c=Object.values(this.active).find(x=>x.district===e.district&&x.status==='active');
  if(c)c.intensity=C(Math.max(c.intensity,e.panic||0));
 }
 resolve(e,outcome){
  const c=this.active[e?.id];if(!c)return;
  if(outcome==='rescued')c.intensity*=.28;
  else if(outcome==='reported')c.intensity*=.55;
  else c.intensity*=1.18;
  c.stage=Math.min(c.stage+1,c.stages.length-1);
  c.signals.push({type:'response-'+outcome,stage:c.stage,at:Date.now()});
  this.game.events.emit('emergency:recovery-phase',{id:c.id,district:c.district,outcome,intensity:c.intensity});
  if(c.stage<c.stages.length-1&&outcome!=='rescued')this.emitStage(c);
  else if(c.stage>=c.stages.length-1)this.finish(c,outcome);
 }
 finish(c,outcome){
  c.status='recovered';c.outcome=outcome;c.resolvedAt=Date.now();
  this.state.recoveries++;this.history.unshift({...c});this.history=this.history.slice(0,32);
  this.game.events.emit('emergency:city-recovered',{id:c.id,district:c.district,outcome,signals:c.signals.length});
  this.game.events.emit('world:consequence',{type:'safety',district:c.district,intensity:C(c.intensity),source:'emergency-recovery',reward:outcome==='rescued'?180:60,rep:outcome==='rescued'?2:0});
  delete this.active[c.id];
 }
 update(dt){
  this.tick+=dt;if(this.tick<1)return;const step=this.tick;this.tick=0;
  for(const c of Object.values(this.active)){c.ttl-=step;if(c.ttl<=0)this.finish(c,'timeout');}
  this.state.active=Object.keys(this.active).length;this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({emergencyCascade:{...this.state}});}
}