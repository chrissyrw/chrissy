const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const THREATS={
 'faction-revenge':{domain:'faction',base:.62,growth:.08,cooldown:70},
 'route-disruption':{domain:'logistics',base:.55,growth:.07,cooldown:55},
 'market-backlash':{domain:'economy',base:.5,growth:.06,cooldown:65},
 'district-tension':{domain:'social',base:.58,growth:.07,cooldown:60}
};
export class RecurringCrisisEvolutionSystem{
 constructor(game){
  this.game=game;this.tick=0;this.nextId=1;
  const saved=game.state.get().recurringCrisis||{};
  this.state=saved.threats?{...saved}:this.empty();
  this.bind();this.sync();
 }
 empty(){return{threats:{},active:[],history:[],cooldowns:{},updatedAt:0};}
 bind(){
  this.game.events.on('crisis:legacy-recorded',e=>this.inherit(e));
  this.game.events.on('crisis:branch-changed',e=>this.observeChoice(e));
  this.game.events.on('ai:crisis-memory-update',e=>this.observeOutcome(e));
  this.game.events.on('world:historical-ripple',e=>this.ripple(e));
 }
 inherit(e){
  const key=this.key(e.district,e.branch);
  const t=this.ensure(key,e.district,e.branch);
  t.visits++;t.memory=C(t.memory+.1);t.intensity=C(t.intensity+.04);
  t.evolution++;
  if(e.outcome==='unresolved')t.intensity=C(t.intensity+.1);
  this.state.history.unshift({type:'inherit',key,district:e.district,branch:e.branch,outcome:e.outcome,at:Date.now()});
  this.state.history=this.state.history.slice(0,80);
 }
 observeChoice(e){
  const key=this.key(e.district,e.branch),t=this.ensure(key,e.district,e.branch);
  t.choices++;t.branches[e.option]=(t.branches[e.option]||0)+1;
  t.memory=C(t.memory+(e.option==='exploit'?.06:.025));
 }
 observeOutcome(e){
  for(const t of Object.values(this.state.threats)){
   if(t.district!==e.district)continue;
   t.intensity=C(t.intensity+(e.outcome==='resolved'?- .08:.07));
   t.lastOutcome=e.outcome;
  }
 }
 ripple(e){
  const d=e.to||e.district;
  if(!d)return;
  for(const t of Object.values(this.state.threats)){
   if(t.district===d)t.intensity=C(t.intensity+.025);
  }
 }
 key(d,b){return d+'::'+b;}
 ensure(key,district,branch){
  if(this.state.threats[key])return this.state.threats[key];
  const domain=THREATS[branch==='opportunist'?'market-backlash':branch==='mobility'?'route-disruption':branch==='alliance'?'faction-revenge':'district-tension']?.domain||'social';
  const spec=THREATS[branch==='opportunist'?'market-backlash':branch==='mobility'?'route-disruption':branch==='alliance'?'faction-revenge':'district-tension'];
  return this.state.threats[key]={key,district,branch,domain,visits:0,choices:0,evolution:0,memory:0,intensity:spec.base,threshold:spec.base+.22,branches:{},lastOutcome:null,lastSpawn:0};
 }
 spawn(t){
  const id='RT-'+Date.now().toString(36)+'-'+this.nextId++;
  const intensity=C(t.intensity);
  const event={id,threat:t.key,district:t.district,branch:t.branch,domain:t.domain,intensity,level:Math.max(1,t.evolution),createdAt:Date.now(),ttl:75};
  this.state.active.unshift(event);this.state.active=this.state.active.slice(0,8);t.lastSpawn=Date.now();t.intensity=C(t.intensity*.72);
  this.state.history.unshift({type:'spawn',...event});this.state.history=this.state.history.slice(0,80);
  this.game.events.emit('crisis:recurring-threat',{...event});
  this.game.events.emit('ai:world-pressure',{type:'recurring-crisis',district:t.district,intensity,domain:t.domain});
  if(t.domain==='faction')this.game.events.emit('faction:recurring-pressure',event);
  if(t.domain==='logistics')this.game.events.emit('cargo:route-pressure',{district:t.district,pressure:intensity,source:'recurring-crisis'});
  if(t.domain==='economy')this.game.events.emit('economy:crisis-opportunity',{district:t.district,intensity,source:'recurring-crisis'});
 }
 update(dt){
  this.tick+=dt;if(this.tick<1)return;const step=this.tick;this.tick=0;
  for(const t of Object.values(this.state.threats)){
   t.intensity=C(t.intensity+THREATS[t.domain]?.growth*.002||.0001);
   const cd=THREATS[t.domain]?.cooldown||60;
   if(t.intensity>t.threshold&&Date.now()-t.lastSpawn>cd*1000)this.spawn(t);
  }
  for(const e of this.state.active)e.ttl-=step;
  this.state.active=this.state.active.filter(e=>e.ttl>0);
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({recurringCrisis:this.state});}
}