const TYPES=[
 {id:'commerce',base:1.0,reward:1.0,risk:.12},
 {id:'logistics',base:.92,reward:1.3,risk:.28},
 {id:'rescue',base:.72,reward:1.55,risk:.35},
 {id:'social',base:.9,reward:.75,risk:.06},
 {id:'mobility',base:1.0,reward:1.05,risk:.18},
 {id:'discovery',base:.68,reward:1.35,risk:.22},
 {id:'faction',base:.58,reward:1.7,risk:.4}
];
export class UnifiedOpportunityEngineSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().unifiedOpportunity||{generated:0,accepted:0,expired:0,lastAt:0,active:[],updatedAt:0};
  this.signals={};
  this.bind();this.sync();
 }
 bind(){
  const signal=(type,e={})=>this.addSignal(type,e);
  ['economy:state-shift','economy:state-shift','gikondo:economy-shift','business:orders','gikondo:economic-orders','traffic:incident','city:crisis-start','district:cascade-wave','ai:world-pressure','world:historical-ripple','npc:navigation-opportunity'].forEach(x=>this.game.events.on(x,e=>signal(x,e||{})));
  this.game.events.on('mission:completed',e=>{this.state.accepted++;this.addSignal('mission:success',e||{});});
  this.game.events.on('mission:failed',e=>{this.state.expired++;this.addSignal('mission:failure',e||{});});
  this.game.events.on('player:choice-made',e=>this.addSignal('player-choice',e||{}));
 }
 addSignal(type,e){
  const district=e.district||e.districtName||this.game.state.get().world?.district||'KigaliCBD';
  const value=Math.max(-1,Math.min(1,Number(e.impact||e.pressure||e.risk||e.score||.08)));
  const key=district;
  this.signals[key]=(this.signals[key]||0)+value;
  if(this.signals[key]>3)this.signals[key]=3;
 }
 score(type,district){
  const s=this.game.state.get(),signal=this.signals[district]||0;
  const econ=Number(s.economy?.districtActivity?.[district]||1);
  const memory=Number(s.districtMemory?.[district]?.memory||s.worldMemory?.[district]||0);
  const player=Number(s.player?.reputation||0)/100;
  return type.base+signal*.18+(econ-1)*.25+memory*.08+player*.04;
 }
 generate(){
  const s=this.game.state.get(),district=s.world?.district||'KigaliCBD';
  const candidates=TYPES.map(t=>({...t,score:this.score(t,district)})).sort((a,b)=>b.score-a.score);
  const chosen=candidates[0];
  if(!chosen||chosen.score<.7)return;
  const id=`opp-${district}-${chosen.id}-${Date.now()}`;
  const opportunity={id,district,type:chosen.id,score:+chosen.score.toFixed(2),reward:Math.round(300*chosen.reward*(1+chosen.score*.35)),risk:+Math.min(.95,chosen.risk+Math.max(0,chosen.score-1)*.08).toFixed(2),expiresAt:Date.now()+90000,source:'unified-city-engine'};
  this.state.generated++;this.state.lastAt=Date.now();this.state.active.unshift(opportunity);this.state.active=this.state.active.slice(0,8);
  this.game.events.emit('gameplay:opportunity',{...opportunity});
  this.game.events.emit('mission:opportunity-generated',{...opportunity});
 }
 update(dt){
  const now=Date.now();
  this.state.active=this.state.active.filter(o=>o.expiresAt>now);
  if(now-this.state.lastAt>7000)this.generate();
  for(const k of Object.keys(this.signals))this.signals[k]*=.94;
  this.state.updatedAt=now;this.sync();
 }
 sync(){this.game.state.update({unifiedOpportunity:this.state});}
}
