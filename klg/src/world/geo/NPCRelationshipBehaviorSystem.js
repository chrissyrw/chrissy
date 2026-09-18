export class NPCRelationshipBehaviorSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().npcRelationshipBehavior||{interactions:0,allies:0,hostile:0,cautious:0,helpOffers:0,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('npc:relationship-update',e=>this.apply(e||{}));
  this.game.events.on('npc:social-response',e=>this.response(e||{}));
  this.game.events.on('gameplay:opportunity',e=>this.opportunity(e||{}));
  this.game.events.on('mission:started',e=>this.mission(e||{}));
 }
 apply(r){
  const npcs=this.game.npcs?.npcs||[];
  const n=npcs.find(x=>String(x.id)===String(r.npcId));
  if(!n)return;
  n.relationship={trust:r.trust,affinity:r.affinity,respect:r.respect,fear:r.fear,stance:r.stance};
  if(r.stance==='ally'){n.mood='positive';n.state='group';this.state.allies++;this.state.helpOffers++;this.game.events.emit('npc:help-offer',{npcId:n.id,district:n.district,reason:'ally',trust:r.trust});}
  else if(r.stance==='hostile'){n.mood='angry';n.state='flee';this.state.hostile++;this.game.events.emit('npc:hostile-response',{npcId:n.id,district:n.district,reason:'relationship',trust:r.trust});}
  else if(r.stance==='cautious'){n.mood='uneasy';n.state='wander';this.state.cautious++;}
  else if(r.stance==='respectful'){n.mood='positive';this.state.helpOffers++;this.game.events.emit('npc:help-offer',{npcId:n.id,district:n.district,reason:'respect',trust:r.trust});}
  this.state.interactions++;
 }
 response(e){
  const district=String(e.district||'').toUpperCase();
  for(const n of (this.game.npcs?.npcs||[]).filter(x=>x.active&&(!district||String(x.district||'').toUpperCase()===district)).slice(0,16)){
   if(e.tone==='trusted'){n.mood='positive';if(Math.random()<.2)n.state='group';}
   if(e.tone==='watched'){n.mood='uneasy';if(Math.random()<.25)n.state='wander';}
  }
 }
 opportunity(e){
  const social=this.game.state.get().socialReputation||{};
  if(Number(social.trust||0)>.35)this.game.events.emit('npc:opportunity-assist',{district:e.district||social.district||'KigaliCBD',trust:social.trust});
 }
 mission(e){
  if(!e)return;
  const district=e.district||this.game.state.get().world?.district||'KigaliCBD';
  const allies=(this.game.state.get().npcRelationships?.people||{});
  const count=Object.values(allies).filter(x=>x.district===district&&x.stance==='ally').length;
  if(count>0)this.game.events.emit('mission:npc-support',{district,allies:count});
 }
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({npcRelationshipBehavior:this.state});}
}
