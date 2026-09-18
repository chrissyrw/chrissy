const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const PHASES=['mobilize','offensive','stalemate','negotiation','ceasefire','peace','collapsed'];
const OUTCOMES={victory:'victory',defeat:'defeat',ceasefire:'ceasefire',peace:'peace',collapse:'collapse'};
export class FactionWarCampaignSystem{
 constructor(game){this.game=game;this.tick=0;this.id=1;const saved=game.state.get().factionWarCampaign||{};this.state=saved.campaigns?{...saved}:this.empty();this.bind();this.sync();}
 empty(){return{campaigns:{},active:[],history:[],updatedAt:0};}
 bind(){
  this.game.events.on('faction:conflict-simulation',e=>this.startOrAdvance(e.conflict||e));
  this.game.events.on('faction:conflict-choice',e=>this.choice(e));
  this.game.events.on('faction:war-order',e=>this.order(e));
  this.game.events.on('faction:territory-pressure',e=>this.pressure(e));
  this.game.events.on('faction:war-campaign-action',e=>this.action(e));
 }
 key(c){return c.id||[c.a,c.b].sort().join('::');}
 startOrAdvance(c={}){
  if(!c.a||!c.b)return;
  const k=this.key(c),w=this.state.campaigns[k]||(this.state.campaigns[k]=this.create(c));
  w.intensity=C(Math.max(w.intensity,Number(c.intensity||0)));
  if(w.phase==='mobilize'&&w.intensity>.42)w.phase='offensive';
  if(w.phase==='offensive'&&w.intensity>.78)w.phase='stalemate';
  w.rounds++;
  this.refresh();this.emit(w,'conflict');
 }
 create(c){
  return{id:c.id||'CAM-'+this.id++,a:c.a,b:c.b,district:c.district||null,phase:'mobilize',intensity:.25,front:{[c.a]:.5,[c.b]:.5},objectives:{[c.a]:'hold', [c.b]:'expand'},support:{[c.a]:0,[c.b]:0},negotiation:0,rounds:0,playerRole:'observer',lastChoice:null,updatedAt:Date.now()};
 }
 choice(e={}){
  const c=e.conflict||{},w=this.find(c);
  if(!w)return;
  const choice=e.choice;
  w.lastChoice=choice;
  if(choice==='joinA'){w.playerRole='allyA';w.support[w.a]=C((w.support[w.a]||0)+.18);w.front[w.a]=C((w.front[w.a]||.5)+.06);}
  if(choice==='joinB'){w.playerRole='allyB';w.support[w.b]=C((w.support[w.b]||0)+.18);w.front[w.b]=C((w.front[w.b]||.5)+.06);}
  if(choice==='mediate'){w.playerRole='mediator';w.negotiation=C(w.negotiation+.2);w.intensity=C(w.intensity-.12);}
  if(choice==='withdraw')w.playerRole='observer';
  this.resolvePhase(w);
  this.emit(w,'player');
 }
 order(e={}){const w=this.find({a:e.faction,district:e.district});if(w){w.support[e.faction]=C((w.support[e.faction]||0)+(e.status==='completed'?.08:-.05));}}
 pressure(e={}){const w=Object.values(this.state.campaigns).find(x=>x.district===e.district&&x.phase!=='peace');if(w)w.intensity=C(w.intensity+Number(e.heat||0)*.05);}
 action(e={}){
  const w=this.find(e.conflict||e);if(!w)return;
  if(e.action==='negotiate')w.negotiation=C(w.negotiation+.18);
  if(e.action==='sabotage')w.intensity=C(w.intensity+.1);
  if(e.action==='ceasefire')w.negotiation=C(w.negotiation+.28);
  this.resolvePhase(w);this.emit(w,'campaign-action');
 }
 find(c){if(c.id&&this.state.campaigns[c.id])return this.state.campaigns[c.id];return Object.values(this.state.campaigns).find(w=>(w.a===c.a&&w.b===c.b)||(w.a===c.b&&w.b===c.a));}
 resolvePhase(w){
  if(w.negotiation>.72&&w.intensity<.5)w.phase='peace';
  else if(w.negotiation>.45)w.phase='ceasefire';
  else if(w.intensity>.82)w.phase='stalemate';
  else if(w.intensity>.5)w.phase='offensive';
  else if(w.rounds>12&&w.intensity<.2)w.phase='collapsed';
  if(w.front[w.a]>.82){w.outcome=OUTCOMES.victory;w.phase='peace';}
  if(w.front[w.b]>.82){w.outcome=OUTCOMES.victory;w.phase='peace';}
 }
 update(dt){
  this.tick+=dt;if(this.tick<6)return;const step=this.tick;this.tick=0;
  for(const w of Object.values(this.state.campaigns)){
   if(['peace','collapsed'].includes(w.phase))continue;
   const gap=Math.abs((w.front[w.a]||.5)-(w.front[w.b]||.5));
   w.intensity=C(w.intensity+(gap*.008-(w.negotiation*.012)-.002)*step);
   w.negotiation=Math.max(0,w.negotiation-.002*step);
   if(w.phase==='stalemate'&&w.negotiation>.35)w.phase='negotiation';
   if(w.phase==='negotiation'&&w.negotiation>.65)w.phase='ceasefire';
   if(w.phase==='ceasefire'&&w.negotiation>.78){w.phase='peace';w.outcome=OUTCOMES.peace;this.finish(w);}
   w.updatedAt=Date.now();
  }
  this.refresh();this.state.updatedAt=Date.now();this.sync();
 }
 finish(w){
  const winner=(w.front[w.a]||.5)>(w.front[w.b]||.5)?w.a:w.b;
  this.state.history.unshift({id:w.id,a:w.a,b:w.b,district:w.district,phase:w.phase,outcome:w.outcome,winner,playerRole:w.playerRole,rounds:w.rounds,at:Date.now()});
  this.state.history=this.state.history.slice(0,64);
  this.game.events.emit('faction:war-campaign-resolved',{...w,winner});
  this.game.events.emit('world:consequence',{district:w.district,source:'faction-war-campaign',rep:w.playerRole==='mediator'?8:2,reward:w.playerRole==='mediator'?500:150});
  this.game.events.emit('world:historical-ripple',{source:'faction-war-campaign',district:w.district,intensity:w.intensity,branch:w.phase});
 }
 emit(w,source){this.game.events.emit('faction:war-campaign',{campaign:{...w},source});}
 refresh(){this.state.active=Object.values(this.state.campaigns).filter(w=>!['peace','collapsed'].includes(w.phase)).map(w=>({...w}));}
 profile(id){return this.state.campaigns[id]?{...this.state.campaigns[id]}:null;}
 sync(){this.game.state.update({factionWarCampaign:this.state});}
}