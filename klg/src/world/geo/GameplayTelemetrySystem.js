export class GameplayTelemetrySystem{
 constructor(game){this.game=game;this.counts={missionStarted:0,missionCompleted:0,missionFailed:0,objectiveProgress:0,objectiveComplete:0,opportunityGenerated:0,opportunityDiscovered:0,opportunityAccepted:0,social:0,crew:0,economy:0};this.lastEvents=[];this.bind();}
 bind(){
  const on=(name,key)=>this.game.events.on(name,e=>{this.counts[key]=(this.counts[key]||0)+1;this.lastEvents.push({name,at:Date.now()});if(this.lastEvents.length>30)this.lastEvents.shift();});
  on('mission:started','missionStarted');on('mission:completed','missionCompleted');on('mission:failed','missionFailed');on('mission:objective-progress','objectiveProgress');on('gameplay:objective-complete','objectiveComplete');on('gameplay:opportunity','opportunityGenerated');on('opportunity:discovered','opportunityDiscovered');on('gameplay:opportunity-accept','opportunityAccepted');on('npc:interaction-resolved','social');on('npc:conflict-resolved','social');on('crew:formed','crew');on('crew:progress','crew');on('crew:business-opened','economy');on('crew:economy-settlement','economy');
 }
 update(){this.game.state.update({gameplayTelemetry:{counts:{...this.counts},lastEvents:[...this.lastEvents],updatedAt:Date.now()}});}
}