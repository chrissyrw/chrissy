export class DynamicSocialWorldResponseSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().socialWorldResponse||{responses:0,npc:0,factions:0,rumors:0,economy:0,access:0,opportunities:0,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('social:reputation-shift',e=>this.respond(e||{}));
  this.game.events.on('opportunity:social-weight',e=>this.opportunity(e||{}));
  this.game.events.on('identity:choice-impact',e=>this.choice(e||{}));
 }
 respond(e){
  const district=e.district||this.game.state.get().world?.district||'KigaliCBD';
  const score=Number(e.score||0),trust=Number(e.trust||0);
  const tone=score>.35?'trusted':score<-.3?'watched':'known';
  this.state.responses++;
  this.game.events.emit('npc:social-response',{district,tone,trust,score});
  this.state.npc++;
  this.game.events.emit('faction:social-response',{district,tone,trust,score});
  this.state.factions++;
  if(Math.abs(score)>.15){this.game.events.emit('rumor:social-response',{district,tone,strength:Math.abs(score)});this.state.rumors++;}
  const priceModifier=tone==='trusted'?.92:tone==='watched'?1.12:1;
  this.game.events.emit('economy:social-response',{district,priceModifier,tone});this.state.economy++;
  const access=tone==='trusted'?1: tone==='watched'?-1:0;
  this.game.events.emit('world:access-response',{district,tone,access});
  this.state.access++;
 }
 opportunity(e){
  const weight=Number(e.weight||0),trust=Number(e.trust||0);
  if(Math.abs(weight)<.01)return;
  this.game.events.emit('opportunity:personalized-response',{opportunityId:e.opportunityId,weight,trust,reason:weight>0?'reputation-fit':'reputation-friction'});
  this.state.opportunities++;
 }
 choice(e){
  const district=e.district||this.game.state.get().world?.district||'KigaliCBD';
  this.game.events.emit('rumor:choice-seed',{district,action:e.action,traits:e.traits||{}});
 }
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({socialWorldResponse:this.state});}
}
