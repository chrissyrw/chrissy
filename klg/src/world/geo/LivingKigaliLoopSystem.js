const VEHICLE_FIT={logistics:['UTILITY','OFFROAD','MOTO'],rescue:['OFFROAD','UTILITY','MOTO'],mobility:['MOTO','SPORT','GT'],discovery:['RALLY','BUGGY','OFFROAD'],commerce:['UTILITY','MOTO','LUXURY'],social:['LUXURY','GT','SPORT'],faction:['SPECIAL','SPORT','MOTO']};
export class LivingKigaliLoopSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().livingKigali||{accepted:0,completed:0,failed:0,choices:0,cascades:0,memoryCommits:0,updatedAt:0};
  this.active=new Map();this.bind();this.sync();
 }
 bind(){
  this.game.events.on('gameplay:opportunity',e=>this.onOpportunity(e||{}));
  this.game.events.on('mission:opportunity-generated',e=>this.onOpportunity(e||{}));
  this.game.events.on('mission:started',e=>this.onMissionStarted(e||{}));
  this.game.events.on('mission:completed',e=>this.onMissionResult(e,true));
  this.game.events.on('mission:failed',e=>this.onMissionResult(e,false));
  this.game.events.on('player:choice-made',e=>this.onChoice(e||{}));
  this.game.events.on('world:consequence',e=>this.commitMemory(e||{}));
  this.game.events.on('ai:execution-result',e=>this.onAIResult(e||{}));
 }
 onOpportunity(o){
  if(!o.id)return;
  this.active.set(o.id,o);
  this.game.events.emit('navigation:opportunity-target',{district:o.district,type:o.type,opportunityId:o.id,priority:o.score||1});
  this.game.events.emit('npc:life-opportunity',{district:o.district,style:o.type,opportunityId:o.id});
  this.game.events.emit('vehicle:opportunity-fit',{district:o.district,type:o.type,classes:VEHICLE_FIT[o.type]||['ANY'],opportunityId:o.id});
  this.game.events.emit('ai:opportunity-director',{...o,phase:'discover'});
 }
 onMissionStarted(m){
  if(!m.id)return;
  const o=this.active.get(m.opportunityId||m.id);
  if(o)this.state.accepted++;
  this.game.events.emit('ai:opportunity-director',{opportunityId:o?.id||m.id,district:o?.district||m.district||this.game.state.get().world.district,phase:'active'});
 }
 onMissionResult(e,success){
  const district=e?.district||e?.objective?.district||this.game.state.get().world.district||'KigaliCBD';
  if(success)this.state.completed++;else this.state.failed++;
  this.game.events.emit('world:consequence',{district,type:'opportunity-result',success,source:'living-kigali',missionId:e?.id});
  if(success)this.game.events.emit('world:historical-ripple',{district,domain:'opportunity',value:.08,source:'living-kigali'});
  else this.game.events.emit('ai:world-pressure',{district,type:'opportunity-failure',pressure:.1});
  this.game.events.emit('district:cascade-wave',{origin:district,type:success?'opportunity-success':'opportunity-failure',strength:success?.08:.12});
  this.commitMemory({district,type:'opportunity-result',success});
 }
 onChoice(e){
  this.state.choices++;
  const district=e.district||this.game.state.get().world.district||'KigaliCBD';
  this.game.events.emit('ai:world-pressure',{district,type:'player-choice',pressure:Number(e.impact||.04)});
  this.game.events.emit('district:cascade-wave',{origin:district,type:'player-choice',strength:.04});
 }
 onAIResult(e){
  if(!e.success)return;
  const o=[...this.active.values()].find(x=>x.district===e.district);
  if(o)this.game.events.emit('gameplay:opportunity-ai-react',{...o,action:e.action});
 }
 commitMemory(e){
  this.state.memoryCommits++;
  this.game.events.emit('world:memory-commit',{district:e.district||'KigaliCBD',type:e.type||'event',value:e.success===false?-1:1,source:'living-kigali'});
 }
 update(){
  const now=Date.now();
  for(const [id,o] of this.active){if(o.expiresAt&&o.expiresAt<now)this.active.delete(id);}
  this.state.cascades=Math.max(this.state.cascades,this.state.choices+this.state.completed+this.state.failed);
  this.state.updatedAt=now;this.sync();
 }
 sync(){this.game.state.update({livingKigali:this.state});}
}
