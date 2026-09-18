export class SocialMissionLifecycleSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().socialMissionLifecycle||{active:null,started:0,completed:0,failed:0,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('mission:social-generated',e=>this.offer(e||{}));
  this.game.events.on('gameplay:opportunity-accept',e=>this.accept(e||{}));
  this.game.events.on('npc:interaction-resolved',e=>this.resolveInteraction(e||{}));
  this.game.events.on('npc:conflict-resolved',e=>this.resolveConflict(e||{}));
  this.game.events.on('crew:support-active',e=>this.resolveCrew(e||{}));
 }
 offer(e){
  this.game.events.emit('social:mission-offer',{mission:e,acceptEvent:'gameplay:opportunity-accept'});
 }
 accept(e){
  const id=e.id||e.missionId||e.opportunityId;
  if(!id)return;
  const mission=e.mission||e;
  if(mission.source!=='social-world'&&mission.type!=='help'&&mission.type!=='conflict'&&mission.type!=='crew')return;
  this.state.active={...mission,id,startedAt:Date.now(),progress:0};
  this.state.started++;
  this.game.events.emit('mission:social-started',this.state.active);
 }
 resolveInteraction(e){
  const m=this.state.active;if(!m||m.npcId==null||String(m.npcId)!==String(e.npcId))return;
  if(e.success===false)return this.fail('interaction');
  if(m.type==='help'||m.type==='favor'){this.complete('interaction');}
 }
 resolveConflict(e){
  const m=this.state.active;if(!m||m.type!=='conflict')return;
  if(e.success)this.complete('conflict');else this.fail('conflict');
 }
 resolveCrew(e){
  const m=this.state.active;if(!m||m.type!=='crew')return;
  if(e.members?.length)this.complete('crew');
 }
 complete(reason){
  const m=this.state.active;if(!m)return;
  this.state.completed++;
  this.game.events.emit('mission:completed',{...m,reason,district:m.district,reputation:Math.max(2,Math.round((m.reward||300)/150))});
  this.game.events.emit('world:consequence',{district:m.district,type:'social-mission-completed',reason,value:.08});
  this.game.events.emit('world:historical-ripple',{district:m.district,type:'social-success',strength:.08});
  this.state.active=null;
 }
 fail(reason){
  const m=this.state.active;if(!m)return;
  this.state.failed++;
  this.game.events.emit('mission:failed',{...m,reason,district:m.district});
  this.game.events.emit('world:consequence',{district:m.district,type:'social-mission-failed',reason,value:-.08});
  this.state.active=null;
 }
 update(){
  if(this.state.active&&Date.now()-this.state.active.startedAt>120000)this.fail('timeout');
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({socialMissionLifecycle:this.state});}
}
