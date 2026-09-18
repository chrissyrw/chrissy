const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ACTIONS={mediate:-.18,joinA:.12,joinB:.12,withdraw:-.04,trade:.02};
export class FactionConflictSimulationSystem{
 constructor(game){
  this.game=game;this.tick=0;
  const saved=game.state.get().factionConflictSim||{};
  this.state=saved.conflicts?{...saved}:this.empty();
  this.bind();this.sync();
 }
 empty(){return{conflicts:{},active:[],history:[],updatedAt:0};}
 bind(){
  this.game.events.on('faction:rivalry-activated',e=>this.activate(e));
  this.game.events.on('faction:conflict-event',e=>this.observe(e.conflict||e));
  this.game.events.on('faction:crisis-alignment',e=>this.alignment(e));
  this.game.events.on('player:choice-made',e=>this.playerChoice(e));
 }
 key(a,b){return[a,b].sort().join('::');}
 activate(e){
  const a=e.faction,b=e.opponent||e.rival||'Local Rival';
  if(a===b)return;
  const k=this.key(a,b),c=this.ensure(k,a,b,e.district);
  c.intensity=C(Math.max(c.intensity||0,e.tension||.45)+.08);
  c.stage=c.intensity>.78?'active':'escalating';
  this.refresh();this.emit(c,'activated');
 }
 observe(e){
  if(!e?.a||!e?.b)return;
  const c=this.ensure(this.key(e.a,e.b),e.a,e.b,e.district);
  c.intensity=C(Math.max(c.intensity||0,e.intensity||0));
  c.stage=e.stage||c.stage;
  this.refresh();
 }
 alignment(e){
  const faction=e.branch==='alliance'?'faction':e.district;
  for(const c of Object.values(this.state.conflicts)){
   if(c.a===faction||c.b===faction)c.intensity=C(c.intensity-(Number(e.standing||0)>0?.05:-.03));
  }
 }
 playerChoice(e){
  if(e.type!=='crisis')return;
  const c=Object.values(this.state.conflicts).find(x=>x.district===e.district&&x.stage!=='quiet');
  if(c)this.resolveChoice(c,e.option);
 }
 ensure(k,a,b,district){
  return this.state.conflicts[k]||(this.state.conflicts[k]={id:k,a,b,district:district||null,intensity:.2,stage:'tension',resources:{[a]:1,[b]:1},alliances:{},rounds:0,lastAction:null,updatedAt:Date.now()});
 }
 resolveChoice(c,choice){
  const delta=ACTIONS[choice]??0;
  c.intensity=C(c.intensity+delta);c.lastAction=choice;c.rounds++;
  if(choice==='joinA')c.resources[c.a]=C((c.resources[c.a]||0)+.12);
  if(choice==='joinB')c.resources[c.b]=C((c.resources[c.b]||0)+.12);
  if(choice==='mediate'){c.alliances.mediator='player';}
  if(choice==='withdraw'){c.resources[c.a]=C((c.resources[c.a]||0)-.05);c.resources[c.b]=C((c.resources[c.b]||0)-.05);}
  c.stage=c.intensity>.78?'active':c.intensity>.42?'escalating':c.intensity>.18?'tension':'ceasefire';
  this.state.history.unshift({conflict:c.id,choice,stage:c.stage,intensity:c.intensity,at:Date.now()});
  this.state.history=this.state.history.slice(0,80);
  this.game.events.emit('faction:conflict-choice',{conflict:{...c},choice});
  this.emit(c,'player-choice');
 }
 emit(c,source){
  this.game.events.emit('faction:conflict-simulation',{conflict:{...c},source});
  if(c.stage==='active')this.game.events.emit('ai:world-pressure',{type:'faction-conflict',district:c.district,intensity:c.intensity});
 }
 refresh(){this.state.active=Object.values(this.state.conflicts).filter(c=>c.intensity>.25).map(c=>({...c}));}
 update(dt){
  this.tick+=dt;if(this.tick<2)return;const step=this.tick;this.tick=0;
  for(const c of Object.values(this.state.conflicts)){
   const resourceGap=Math.abs((c.resources[c.a]||1)-(c.resources[c.b]||1));
   c.intensity=C(c.intensity+(resourceGap*.012-(c.stage==='ceasefire'?.02:.004))*step);
   if(c.stage==='active'&&c.rounds%3===0)this.game.events.emit('faction:conflict-event',{conflict:{...c},district:c.district});
   c.stage=c.intensity>.78?'active':c.intensity>.42?'escalating':c.intensity>.18?'tension':'ceasefire';
   c.updatedAt=Date.now();
  }
  this.refresh();this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({factionConflictSim:this.state});}
}