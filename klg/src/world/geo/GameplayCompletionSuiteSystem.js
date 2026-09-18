const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class GameplayCompletionSuiteSystem{
 constructor(game){
  this.game=game;this.tick=0;
  this.state=game.state.get().gameplayCompletion||{
   score:0,status:'in-progress',systems:{},missions:{started:0,completed:0,failed:0},opportunities:{generated:0,accepted:0,completed:0,expired:0},updatedAt:0
  };
  this.activeObjectives=new Map();this.seenOpportunities=new Set();this.acceptedOpportunities=new Set();
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('mission:started',m=>this.startMission(m||{}));
  this.game.events.on('mission:completed',m=>this.finishMission(m||{},true));
  this.game.events.on('mission:failed',m=>this.finishMission(m||{},false));
  this.game.events.on('gameplay:opportunity',o=>this.opportunityGenerated(o||{}));
  this.game.events.on('gameplay:opportunity-accept',o=>this.opportunityAccepted(o||{}));
  this.game.events.on('mission:crew-generated',m=>this.bridgeCrewMission(m||{}));
  this.game.events.on('mission:crew-accepted',m=>this.bridgeCrewMission(m||{}));
  this.game.events.on('crew:territory-controlled',e=>this.system('territory',e));
  this.game.events.on('crew:safehouse-ready',e=>this.system('safehouse',e));
  this.game.events.on('crew:business-opened',e=>this.system('business',e));
  this.game.events.on('crew:protection-offer',e=>this.system('protection',e));
 }
 system(name,e={}){this.state.systems[name]=(this.state.systems[name]||0)+1;}
 startMission(m){
  if(!m.id)return;
  this.activeObjectives.set(m.id,{...m,startedAt:Date.now(),deadline:Date.now()+this.deadline(m)});
  this.state.missions.started++;
 }
 deadline(m){
  const t=m.objective?.type;
  if(t==='rescue')return 45000;
  if(t==='delivery')return 90000;
  if(t==='escort')return 120000;
  if(t==='repair')return 75000;
  if(t==='social')return 90000;
  if(t==='crew')return 120000;
  return 150000;
 }
 finishMission(m,success){
  if(!m.id)return;
  this.activeObjectives.delete(m.id);
  if(success)this.state.missions.completed++;else this.state.missions.failed++;
  if(m.opportunityId)this.state.opportunities.completed++;
 }
 opportunityGenerated(o){
  if(!o.id)return;
  if(this.seenOpportunities.has(o.id))return;
  this.seenOpportunities.add(o.id);this.state.opportunities.generated++;
 }
 opportunityAccepted(o){
  const id=o.id||o.opportunityId||o.missionId;if(!id||this.acceptedOpportunities.has(id))return;
  this.acceptedOpportunities.add(id);this.state.opportunities.accepted++;
 }
 bridgeCrewMission(m){
  if(!m.id)return;
  this.system('crewMission',m);
 }
 position(){
  const v=this.game.vehicles?.active;
  return v?.mesh?.position||this.game.player?.position||{x:0,y:0,z:0};
 }
 objectiveDone(m){
  const o=m.objective||{};
  const p=this.position(),w=this.game.state.get().world||{};
  if(o.type==='location'||o.type==='delivery'||o.type==='repair'||o.type==='rescue'){
   if(o.x==null||o.z==null)return false;
   return Math.hypot(p.x-o.x,p.z-o.z)<=Number(o.radius||8);
  }
  if(o.type==='district')return w.district===o.district;
  if(o.type==='night-location')return (w.time>=1140||w.time<300)&&w.district===o.district;
  if(o.type==='storm-location')return w.weather==='storm'&&w.district===o.district;
  if(o.type==='social')return !!m.socialResolved;
  if(o.type==='crew')return !!m.crewResolved;
  return false;
 }
 update(dt=.016){
  this.tick+=dt;if(this.tick<.5)return;this.tick=0;
  const now=Date.now();
  for(const [id,m] of this.activeObjectives){
   if(this.objectiveDone(m)){
    this.game.events.emit('gameplay:objective-complete',{missionId:id,objective:m.objective});
    if(this.game.missions?.active?.id===id)this.game.missions.complete();
    continue;
   }
   if(now>m.deadline){
    this.game.events.emit('gameplay:objective-timeout',{missionId:id,objective:m.objective});
    if(this.game.missions?.active?.id===id){
     const failed=this.game.missions.active;this.game.missions.active=null;this.game.state.update('mission',null);this.game.events.emit('mission:failed',{...failed,reason:'timeout'});
    }
   }
  }
  const checks={
   missionObjectives:this.state.missions.completed+this.state.missions.failed>0,
   opportunityFlow:this.state.opportunities.generated>0,
   opportunityAcceptance:this.state.opportunities.accepted>0,
   crewIntegration:!!this.state.systems.crewMission,
   economyIntegration:!!(this.game.state.get().crewEconomy&&this.game.state.get().crewBusinesses),
   persistence:!!this.game.state.get().completionAudit
  };
  const passed=Object.values(checks).filter(Boolean).length;
  this.state.score=Math.round(passed/Object.keys(checks).length*100);
  this.state.status=this.state.score>=90?'near-complete':this.state.score>=70?'playable':'integration-needed';
  this.state.updatedAt=now;this.sync();
 }
 sync(){this.game.state.update({gameplayCompletion:{...this.state}});}
}