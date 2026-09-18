export class NPCRelationshipEvolutionSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().npcRelationships||{people:{},events:0,updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('identity:choice-impact',e=>this.choice(e||{}));
  this.game.events.on('social:reputation-shift',e=>this.reputation(e||{}));
  this.game.events.on('npc:mission-impact',e=>this.mission(e||{}));
  this.game.events.on('npc:social-response',e=>this.response(e||{}));
  this.game.events.on('rumor:social-response',e=>this.rumor(e||{}));
 }
 ensure(id,district='KigaliCBD'){
  const key=String(id);
  if(!this.state.people[key])this.state.people[key]={npcId:id,district,trust:0,affinity:0,respect:0,fear:0,encounters:0,lastAction:null,memory:[],stance:'neutral'};
  return this.state.people[key];
 }
 touch(id,patch={},memory){
  const p=this.ensure(id,patch.district);
  Object.assign(p,patch);
  if(memory)p.memory=[memory,...p.memory].slice(0,8);
  p.encounters++;
  p.trust=Math.max(-1,Math.min(1,p.trust));
  p.affinity=Math.max(-1,Math.min(1,p.affinity));
  p.respect=Math.max(-1,Math.min(1,p.respect));
  p.fear=Math.max(0,Math.min(1,p.fear));
  p.stance=p.trust>.45?'ally':p.trust<-.4?'hostile':p.respect>.4?'respectful':p.fear>.55?'cautious':'neutral';
  this.game.events.emit('npc:relationship-update',p);
 }
 choice(e){
  const npcs=this.game.npcs?.npcs||[];
  const district=String(e.district||'').toUpperCase();
  for(const n of npcs.filter(x=>x.active).slice(0,24)){
   if(district&&String(n.district||'').toUpperCase()!==district)continue;
   const traits=e.traits||{},social=Number(traits.community||0)+Number(traits.social||0),street=Number(traits.street||0);
   const trust=Number(e.action==='help'||e.action==='protect'?0.08:e.action==='exploit'?-0.09:0.02);
   this.touch(n.id,{district:n.district,trust:trust+social*.03,respect:street*.03,affinity:social*.04,lastAction:e.action},{type:'choice',action:e.action||'unknown',at:Date.now()});
   this.state.events++;
  }
 }
 reputation(e){
  const npcs=this.game.npcs?.npcs||[];
  const district=String(e.district||'').toUpperCase();
  const delta=Number(e.score||0)*.025;
  for(const n of npcs.filter(x=>x.active&&(!district||String(x.district||'').toUpperCase()===district)).slice(0,32))this.touch(n.id,{district:n.district,trust:delta},{type:'reputation',score:e.score||0,at:Date.now()});
 }
 mission(e){
  const npcs=this.game.npcs?.npcs||[];
  const district=String(e.district||'').toUpperCase(),delta=Number(e.impact||0);
  for(const n of npcs.filter(x=>x.active&&(!district||String(x.district||'').toUpperCase()===district)).slice(0,32))this.touch(n.id,{trust:delta*.6,affinity:delta*.4},{type:'mission',impact:delta,at:Date.now()});
 }
 response(e){
  const npcs=this.game.npcs?.npcs||[];
  const delta=e.tone==='trusted'?.04:e.tone==='watched'?-0.05:0.01;
  for(const n of npcs.filter(x=>x.active).slice(0,20))this.touch(n.id,{trust:delta},{type:'social-response',tone:e.tone,at:Date.now()});
 }
 rumor(e){
  const strength=Math.min(.08,Math.abs(Number(e.strength||0))*.02);
  for(const n of (this.game.npcs?.npcs||[]).filter(x=>x.active).slice(0,18))this.touch(n.id,{affinity:-strength},{type:'rumor',strength,at:Date.now()});
 }
 update(dt){
  for(const p of Object.values(this.state.people)){p.trust*=.9995;p.affinity*=.9997;p.respect*=.9998;p.fear=Math.max(0,p.fear-(dt||0)*.002);}
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({npcRelationships:this.state});}
}
