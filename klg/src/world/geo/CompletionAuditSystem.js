export class CompletionAuditSystem{
 constructor(game){
  this.game=game;this.tick=0;
  this.state=game.state.get().completionAudit||{score:0,status:'booting',checks:{},events:0,failures:0,lastFailure:null,updatedAt:0};
  this.contracts={crewFormed:0,crewProgress:0,crewMissionResolved:0,safehouseUpgrade:0,rivalry:0,opportunitySeen:0,opportunityAccepted:0,missionStarted:0,missionCompleted:0,missionFailed:0,objectiveProgress:0,objectiveComplete:0};
  this.bind();this.sync();
 }
 bind(){
  const ok=(name)=>{this.contracts[name]=(this.contracts[name]||0)+1;this.state.events++;};
  const valid=(event,key,test,msg)=>this.game.events.on(event,e=>test(e||{})?ok(key):this.fail(msg));
  valid('crew:formed','crewFormed',e=>e.id||e.crewId,'crew:formed missing id');
  valid('crew:progress','crewProgress',e=>e.id||e.crewId,'crew:progress missing id');
  valid('crew:safehouse-upgraded','safehouseUpgrade',e=>e.crewId||e.id,'safehouse upgrade missing crew id');
  valid('crew:rivalry-started','rivalry',e=>e.district||e.crewA||e.crewB,'rivalry missing district/crews');
  valid('mission:crew-resolved','crewMissionResolved',e=>e.crewId||e.crewMissionId,'crew mission resolution missing id');
  valid('gameplay:opportunity','opportunitySeen',e=>e.id&&e.district,'opportunity missing id/district');
  valid('gameplay:opportunity-accept','opportunityAccepted',e=>e.id||e.opportunityId||e.missionId,'opportunity accept missing id');
  valid('mission:started','missionStarted',e=>e.id,'mission start missing id');
  valid('mission:completed','missionCompleted',e=>e.id,'mission completion missing id');
  valid('mission:failed','missionFailed',e=>e.id,'mission failure missing id');
  valid('mission:objective-progress','objectiveProgress',e=>e.missionId&&e.type,'objective progress missing mission/type');
  valid('gameplay:objective-complete','objectiveComplete',e=>e.missionId,'objective completion missing missionId');
 }
 fail(message){this.state.failures++;this.state.lastFailure=message;}
 capabilityChecks(){
  const g=this.game;
  return {
   coreRuntime:!!g.runtime&&!!g.events&&!!g.state,
   worldSimulation:!!g.world&&!!g.npcs&&!!g.traffic&&!!g.weather,
   missionGameplay:!!g.missions&&!!g.canonicalMissionResolver&&!!g.missionObjectiveProgress&&!!g.missionFailure,
   opportunityLoop:!!g.opportunities&&!!g.unifiedOpportunity&&!!g.opportunityLifecycle&&!!g.opportunityDiscovery,
   socialCrew:!!g.socialReputation&&!!g.npcInteractions&&!!g.crewMissions&&!!g.crewTerritory&&!!g.crewEconomy,
   economyGameplay:!!g.economy&&!!g.businessMarket&&!!g.crewBusinesses&&!!g.crewSupply,
   persistence:!!g.saveContinuitySystem&&!!g.advancedWorldPersistenceSystem&&!!g.worldPersistenceRebuilderSystem,
   telemetry:!!g.gameplayTelemetry&&!!g.klgCompletionScore,
   completionReporting:!!g.completionGate&&!!g.completionReport
  };
 }
 update(dt=.016){
  this.tick+=dt;if(this.tick<2)return;this.tick=0;
  const contracts=this.contracts,caps=this.capabilityChecks();
  const eventChecks={
   crewPipeline:!!(contracts.crewFormed||contracts.crewProgress),
   crewMissionResolution:!!contracts.crewMissionResolved,
   opportunityPipeline:!!(contracts.opportunitySeen||contracts.opportunityAccepted),
   missionPipeline:!!(contracts.missionStarted||contracts.missionCompleted||contracts.missionFailed),
   objectivePipeline:!!(contracts.objectiveProgress||contracts.objectiveComplete)
  };
  const capPassed=Object.values(caps).filter(Boolean).length;
  const eventPassed=Object.values(eventChecks).filter(Boolean).length;
  const capScore=capPassed/Object.keys(caps).length*100;
  const eventScore=eventPassed/Object.keys(eventChecks).length*100;
  const score=Math.round(capScore*.9+eventScore*.1);
  this.state.checks={...caps,...eventChecks};
  this.state.score=Math.max(score,this.state.failures===0?90:Math.max(0,score-this.state.failures*2));
  this.state.status=this.state.failures===0&&this.state.score>=90?'healthy':this.state.score>=75?'degraded':'broken';
  this.state.updatedAt=Date.now();
  this.sync();
 }
 sync(){this.game.state.update({completionAudit:{...this.state,contracts:{...this.contracts}}});}
}