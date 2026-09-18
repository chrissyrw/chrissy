const now=()=>Date.now();
export class CanonicalMissionResolverSystem{
 constructor(game){this.game=game;this.missions=new Map();this.bind();}
 bind(){
  this.game.events.on('mission:started',m=>this.register(m||{}));
  this.game.events.on('mission:objective-progress',e=>this.progress(e||{}));
  this.game.events.on('gameplay:objective-complete',e=>this.completeObjective(e||{}));
  this.game.events.on('mission:objective-failed',e=>this.fail(e||{}));
  this.game.events.on('mission:completed',m=>this.finalize(m||{},true));
  this.game.events.on('mission:failed',m=>this.finalize(m||{},false));
 }
 register(m){if(m?.id)this.missions.set(m.id,{id:m.id,objective:m.objective||{},progress:0,startedAt:now(),status:'active',opportunityId:m.opportunityId||null});}
 progress(e){const m=this.missions.get(e?.missionId);if(!m)return;m.progress=Math.max(0,Math.min(100,Number(e.progress||0)));m.lastProgressAt=now();}
 completeObjective(e){const m=this.missions.get(e?.missionId);if(!m)return;m.progress=100;m.objectiveCompletedAt=now();}
 fail(e){const m=this.missions.get(e?.missionId);if(m){m.status='failed';m.reason=e.reason||'objective-failed';}}
 finalize(m,success){
  if(!m.id)return;const local=this.missions.get(m.id);
  if(local)local.status=success?'completed':'failed';
  this.game.state.update({canonicalMission:{id:m.id,status:success?'completed':'failed',progress:success?100:(local?.progress||0),updatedAt:now()}});
  this.game.events.emit('mission:canonical-resolved',{missionId:m.id,success,progress:success?100:(local?.progress||0),reason:m.reason||null});
  this.missions.delete(m.id);
 }
 update(){const active=this.game.missions?.active;if(active?.id&&!this.missions.has(active.id))this.register(active);}
}