export class PlayerCrewLeadershipSystem{
 constructor(game){this.game=game;this.state=game.state.get().crewLeadership||{crewId:null,rank:'outsider',delegates:[],recruits:0,updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:level-up',e=>this.evaluate(e));
  this.game.events.on('crew:formed',e=>this.evaluate(e));
  this.game.events.on('npc:interaction-resolved',e=>{if(e.type==='favor'&&e.success)this.recruit(e);});
 }
 evaluate(e={}){
  if(this.state.crewId)return;
  if((e.level||1)>=3&&e.cohesion>=.65){this.state.crewId=e.id;this.state.rank='leader';this.game.events.emit('player:crew-leadership',{crewId:e.id,rank:'leader'});this.sync();}
 }
 recruit(e={}){
  if(!this.state.crewId||!e.npcId)return;
  const crew=this.game.state.get().crewProgression?.crews?.[this.state.crewId];if(!crew)return;
  if(!crew.members.includes(e.npcId)&&crew.members.length<8){crew.members.push(e.npcId);this.state.recruits++;this.game.events.emit('crew:member-recruited',{crewId:crew.id,npcId:e.npcId,members:crew.members.length});this.sync();}
 }
 delegate(npcId,role='scout'){
  if(!this.state.crewId||!npcId)return false;
  const d={npcId,role};this.state.delegates=[...this.state.delegates.filter(x=>x.npcId!==npcId),d].slice(0,4);this.game.events.emit('crew:delegated',{crewId:this.state.crewId,...d});this.sync();return true;
 }
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewLeadership:this.state});}
}