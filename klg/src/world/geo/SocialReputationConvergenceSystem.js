const RELATIONSHIP_ACTIONS={
 help:.08,protect:.1,connect:.07,trade:.04,risk:.01,exploit:-.1
};
export class SocialReputationConvergenceSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().socialReputation||{score:0,trust:0,visibility:0,rumor:0,relationships:0,factionLinks:0,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('identity:choice-impact',e=>this.choice(e||{}));
  this.game.events.on('relationship:choice-impact',e=>this.relationship(e||{}));
  this.game.events.on('faction:player-choice-impact',e=>this.faction(e||{}));
  this.game.events.on('world:memory-commit',e=>this.memory(e||{}));
  this.game.events.on('world:rumor',e=>this.rumor(e||{}));
  this.game.events.on('rumor:propagated',e=>this.rumor(e||{}));
  this.game.events.on('mission:completed',e=>this.result(e,true));
  this.game.events.on('mission:failed',e=>this.result(e,false));
  this.game.events.on('gameplay:opportunity',e=>this.opportunity(e||{}));
 }
 choice(e){
  const traits=e.traits||{};
  const delta=Object.values(traits).reduce((a,v)=>a+Number(v||0),0);
  this.state.score=Math.max(-1,Math.min(1,this.state.score+delta*.08));
  this.state.visibility=Math.min(1,this.state.visibility+.025);
 }
 relationship(e){this.state.trust=Math.max(-1,Math.min(1,this.state.trust+Number(e.impact||0)));this.state.relationships++;}
 faction(e){this.state.factionLinks++;this.state.score=Math.max(-1,Math.min(1,this.state.score+Number(e.impact||0)*.03));}
 memory(e){if(e.type==='player-choice'||e.type==='opportunity-result')this.state.visibility=Math.min(1,this.state.visibility+.015);}
 rumor(e){this.state.rumor=Math.min(1,Math.max(0,this.state.rumor+Math.abs(Number(e.strength||e.value||.02))*.04));}
 result(e,success){this.state.score=Math.max(-1,Math.min(1,this.state.score+(success?.025:-.035)));this.state.trust=Math.max(-1,Math.min(1,this.state.trust+(success?.02:-.03)));this.game.events.emit('social:reputation-shift',{district:e?.district||this.game.state.get().world?.district||'KigaliCBD',score:this.state.score,trust:this.state.trust,success});}
 opportunity(e){const fit=this.state.score>0?.08:this.state.score<-.25?-.05:.02;this.game.events.emit('opportunity:social-weight',{opportunityId:e.id,weight:fit,trust:this.state.trust,visibility:this.state.visibility,rumor:this.state.rumor});}
 update(dt){
  this.state.rumor=Math.max(0,this.state.rumor-(dt||0)*.001);
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({socialReputation:this.state});}
}
