export class OpportunityLifecycleSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().opportunityLifecycle||{seen:0,accepted:0,expired:0,completed:0,updatedAt:0};
  this.active=new Map();this.bind();this.sync();
 }
 bind(){
  this.game.events.on('gameplay:opportunity',e=>this.see(e||{}));
  this.game.events.on('gameplay:opportunity-accept',e=>this.accept(e||{}));
  this.game.events.on('mission:completed',e=>this.finish(e||{},true));
  this.game.events.on('mission:failed',e=>this.finish(e||{},false));
 }
 see(e){if(!e.id)return;this.active.set(e.id,{...e,seenAt:Date.now()});this.state.seen++;}
 accept(e){if(!e.id)return;const o=this.active.get(e.id);if(o){this.state.accepted++;this.game.events.emit('mission:opportunity-locked',{...o,lockedAt:Date.now()});}}
 finish(e,success){
  const id=e.opportunityId||e.id;
  if(id)this.active.delete(id);
  if(success)this.state.completed++;else this.state.expired++;
  this.game.events.emit('ai:opportunity-director',{opportunityId:id,district:e.district||this.game.state.get().world?.district||'KigaliCBD',phase:success?'completed':'failed'});
 }
 update(){
  const now=Date.now();
  for(const [id,o] of this.active){
   if(o.expiresAt&&o.expiresAt<now){this.active.delete(id);this.state.expired++;this.game.events.emit('gameplay:opportunity-expired',{...o});}
  }
  this.state.updatedAt=now;this.sync();
 }
 sync(){this.game.state.update({opportunityLifecycle:this.state});}
}
