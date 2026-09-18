export class CompletionAuditSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().completionAudit||{score:0,status:'booting',checks:{},events:0,failures:0,lastFailure:null,updatedAt:0};
  this.tick=0;this.contracts={
   crewFormed:0, crewProgress:0, crewMissionResolved:0, safehouseUpgrade:0, rivalry:0,
   opportunitySeen:0, opportunityAccepted:0, missionStarted:0, missionCompleted:0, missionFailed:0
  };
  this.bind();this.sync();
 }
 bind(){
  const ok=(name)=>{this.contracts[name]=(this.contracts[name]||0)+1;this.state.events++;};
  this.game.events.on('crew:formed',e=>{if(e?.id||e?.crewId)ok('crewFormed');else this.fail('crew:formed missing id');});
  this.game.events.on('crew:progress',e=>{if(e?.id||e?.crewId)ok('crewProgress');else this.fail('crew:progress missing id');});
  this.game.events.on('crew:safehouse-upgraded',e=>{if(e?.crewId&&e?.district)ok('safehouseUpgrade');else this.fail('safehouse upgrade missing crewId/district');});
  this.game.events.on('crew:rivalry-started',e=>{if(e?.district)ok('rivalry');else this.fail('rivalry missing district');});
  this.game.events.on('mission:crew-resolved',e=>{if(e?.crewId)ok('crewMissionResolved');else this.fail('crew mission resolution missing crewId');});
  this.game.events.on('gameplay:opportunity',e=>{if(e?.id&&e?.district)ok('opportunitySeen');else this.fail('opportunity missing id/district');});
  this.game.events.on('gameplay:opportunity-accept',e=>{if(e?.id||e?.opportunityId||e?.missionId)ok('opportunityAccepted');else this.fail('opportunity accept missing id');});
  this.game.events.on('mission:started',e=>{if(e?.id)ok('missionStarted');else this.fail('mission start missing id');});
  this.game.events.on('mission:completed',e=>{if(e?.id)ok('missionCompleted');else this.fail('mission completion missing id');});
  this.game.events.on('mission:failed',e=>{if(e?.id)ok('missionFailed');else this.fail('mission failure missing id');});
 }
 fail(message){this.state.failures++;this.state.lastFailure=message;}
 update(dt=.016){
  this.tick+=dt;if(this.tick<2)return;this.tick=0;
  const c=this.contracts;
  const checks={
   crewPipeline:!!(c.crewFormed||c.crewProgress),
   crewMissionResolution:!!c.crewMissionResolved,
   opportunityPipeline:!!(c.opportunitySeen||c.opportunityAccepted),
   missionPipeline:!!(c.missionStarted||c.missionCompleted||c.missionFailed),
   gameplayCompletion:!!this.game.state.get().gameplayCompletion,
   persistence:!!this.game.state.get().crewEconomy&&!!this.game.state.get().crewMissions
  };
  const passed=Object.values(checks).filter(Boolean).length;
  this.state.checks=checks;
  this.state.score=Math.round(passed/Object.keys(checks).length*100);
  this.state.status=this.state.failures===0&&this.state.score>=80?'healthy':this.state.score>=60?'degraded':'broken';
  this.state.updatedAt=Date.now();
  this.sync();
 }
 sync(){this.game.state.update({completionAudit:{...this.state,contracts:{...this.contracts}}});}
}