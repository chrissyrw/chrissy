const ACTIONS={
 help:{identity:{community:.08,trust:.06},relationship:.05,faction:{'City Services':.04},economy:.01},
 trade:{identity:{commerce:.06,street:.03},relationship:.02,faction:{'Market Circle':.05},economy:.05},
 risk:{identity:{bold:.08,street:.04},relationship:-.02,faction:{'Night Route':.04},economy:.03},
 exploit:{identity:{opportunist:.1,trust:-.08},relationship:-.06,faction:{'Market Circle':-.03,'City Services':-.05},economy:.08},
 protect:{identity:{protector:.09,community:.05},relationship:.07,faction:{'City Services':.06},economy:-.02},
 connect:{identity:{social:.07,community:.04},relationship:.08,faction:{'Transport Network':.04},economy:.02}
};
export class PlayerChoiceIdentityBridgeSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().choiceIdentityBridge||{choices:0,identityChanges:0,relationshipChanges:0,factionChanges:0,economySignals:0,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('player:choice-made',e=>this.apply(e||{}));
  this.game.events.on('gameplay:opportunity',e=>this.offerContext(e||{}));
  this.game.events.on('mission:completed',e=>this.apply({action:'help',district:e.district,impact:.03,source:'mission'}));
  this.game.events.on('mission:failed',e=>this.apply({action:'risk',district:e.district,impact:-.03,source:'mission'}));
 }
 offerContext(e){
  this.game.events.emit('player:choice-context',{district:e.district||'KigaliCBD',opportunityType:e.type||'commerce',risk:e.risk||0,reward:e.reward||0});
 }
 apply(e){
  const action=String(e.action||e.choice||e.type||'help').toLowerCase();
  const cfg=ACTIONS[action]||ACTIONS.help;
  const s=this.game.state.get(),identity={...(s.playerIdentity||{}),traits:{...(s.playerIdentity?.traits||{})}};
  for(const [k,v] of Object.entries(cfg.identity||{}))identity.traits[k]=Math.max(-1,Math.min(1,Number(identity.traits[k]||0)+v));
  identity.lastChoice=action;identity.lastDistrict=e.district||s.world?.district||'KigaliCBD';identity.choiceCount=(identity.choiceCount||0)+1;
  this.game.state.update({playerIdentity:identity});
  this.state.choices++;this.state.identityChanges++;
  this.game.events.emit('identity:choice-impact',{action,district:identity.lastDistrict,traits:cfg.identity||{}});
  this.game.events.emit('relationship:choice-impact',{action,district:identity.lastDistrict,impact:cfg.relationship||0});
  this.state.relationshipChanges++;
  for(const [f,v] of Object.entries(cfg.faction||{})){this.game.events.emit('faction:player-choice-impact',{faction:f,impact:v,district:identity.lastDistrict,action});this.state.factionChanges++;}
  if(cfg.economy){this.game.events.emit('economy:player-choice-impact',{district:identity.lastDistrict,impact:cfg.economy,action});this.state.economySignals++;}
  this.game.events.emit('world:memory-commit',{district:identity.lastDistrict,type:'player-choice',action,value:cfg.relationship||.02});
  this.game.events.emit('ai:world-pressure',{district:identity.lastDistrict,type:'identity-choice',pressure:Math.abs(cfg.relationship||.02)});
 }
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({choiceIdentityBridge:this.state});}
}
