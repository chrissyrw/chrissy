const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DOMAINS=['emergency','traffic','economy','faction','social','weather','logistics','culture'];
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class CityCrisisOrchestratorSystem{
 constructor(game){
  this.game=game;this.tick=0;this.clock=0;this.nextId=1;
  const saved=game.state.get().cityCrisis||{};
  this.state=saved.crises?{...saved}:this.empty();
  this.bind();this.sync();
 }
 empty(){return{crises:[],active:null,signals:{},phase:'calm',pressure:0,history:[],updatedAt:0};}
 bind(){
  const watch=(domain,weight=1)=>(e)=>this.signal(domain,e,weight);
  this.game.events.on('emergency:network-pressure',watch('emergency',1.25));
  this.game.events.on('emergency:network-overload',watch('emergency',1.4));
  this.game.events.on('city:cascade-network-alert',watch('traffic',1.0));
  this.game.events.on('consequence:network-pressure',watch('economy',.85));
  this.game.events.on('faction:conflict-event',watch('faction',1.15));
  this.game.events.on('society:collective-decision',watch('social',.8));
  this.game.events.on('weather:environment-shift',watch('weather',.7));
  this.game.events.on('cargo:route-pressure',watch('logistics',.9));
  this.game.events.on('culture:world-impact',watch('culture',.65));
  this.game.events.on('emergency:incident-created',e=>this.signal('emergency',e,1.1));
  this.game.events.on('emergency:city-recovered',e=>this.recoverSignal(e));
  this.game.events.on('player:choice-made',e=>this.onPlayerChoice(e));
  this.game.events.on('crisis:recurring-threat',e=>this.signal(e.domain||'social',e,1.15));
 }
 signal(domain,e={},weight=1){
  const district=e.district||e.to||e.from||this.game.state.get().world?.district||'KigaliCBD';
  const value=C(Number(e.pressure??e.intensity??e.priority??e.risk??.25)*weight);
  this.state.signals[domain]={domain,district,value,at:Date.now()};
  if(this.state.active)this.state.active.signals[domain]={district,value};
  this.recalculate();
 }
 recalculate(){
  const vals=Object.values(this.state.signals).map(x=>x.value||0);
  this.state.pressure=C(vals.length?vals.reduce((a,b)=>a+b,0)/Math.max(1,vals.length)*1.35:0);
 }
 crisisScore(){
  const s=this.state.signals;
  const emergency=s.emergency?.value||0,traffic=s.traffic?.value||0,economy=s.economy?.value||0,faction=s.faction?.value||0;
  const cross=[emergency,traffic,economy,faction].filter(v=>v>.42).length;
  return C(this.state.pressure*.65+cross*.12);
 }
 start(){
  if(this.state.active)return;
  const score=this.crisisScore();
  if(score<.48)return;
  const domains=Object.values(this.state.signals).sort((a,b)=>b.value-a.value);
  const district=domains[0]?.district||this.game.state.get().world?.district||'KigaliCBD';
  const id='CR-'+Date.now().toString(36)+'-'+this.nextId++;
  this.state.active={id,district,phase:'escalation',intensity:score,domains:domains.slice(0,5).map(x=>x.domain),signals:{},ttl:120,startedAt:Date.now(),playerChoices:0};
  this.state.phase='escalation';this.state.crises.unshift({...this.state.active});this.state.crises=this.state.crises.slice(0,16);
  this.game.events.emit('city:crisis-start',{...this.state.active});
  this.emitScenario('escalation');
 }
 emitScenario(phase){
  const c=this.state.active;if(!c)return;
  const top=c.domains[0]||'emergency';
  const payload={id:c.id,district:c.district,phase,intensity:c.intensity,domains:c.domains,primary:top};
  if(phase==='escalation'){
   this.game.events.emit('city:crisis-pressure',payload);
   this.game.events.emit('ai:world-pressure',{type:'city-crisis',district:c.district,intensity:c.intensity});
   this.game.events.emit('gameplay:crisis-opportunity',{...payload,options:['respond','protect','exploit']});
  }else if(phase==='climax'){
   this.game.events.emit('city:crisis-climax',payload);
   this.game.events.emit('gameplay:crisis-opportunity',{...payload,options:['resolve','reroute','commit']});
  }else{
   this.game.events.emit('city:crisis-recovery',payload);
  }
 }
 onPlayerChoice(e){
  if(!this.state.active)return;
  this.state.active.playerChoices++;
  const impact=e.impact?.rep||0;
  this.state.active.intensity=C(this.state.active.intensity-(impact>0?.06:.02));
  if(this.state.active.phase==='escalation'&&this.state.active.playerChoices>=1){
   this.state.active.phase='climax';this.state.phase='climax';this.emitScenario('climax');
  }
 }
 recoverSignal(e){
  if(!this.state.active)return;
  this.state.active.intensity=C(this.state.active.intensity-.12);
  if(this.state.active.phase==='climax'&&this.state.active.intensity<.5){
   this.state.active.phase='recovery';this.state.phase='recovery';this.emitScenario('recovery');
  }
 }
 finish(outcome){
  const c=this.state.active;if(!c)return;
  const record={...c,outcome,resolvedAt:Date.now()};
  this.state.history.unshift(record);this.state.history=this.state.history.slice(0,24);
  this.game.events.emit('city:crisis-resolved',record);
  this.game.events.emit('world:consequence',{type:'consequence',district:c.district,intensity:C(c.intensity),source:'city-crisis-'+outcome});
  this.state.active=null;this.state.phase='calm';
 }
 update(dt){
  this.tick+=dt;this.clock+=dt;if(this.tick<1)return;
  const step=this.tick;this.tick=0;
  for(const s of Object.values(this.state.signals))s.value*=Math.pow(.94,step);
  this.recalculate();
  if(!this.state.active&&this.clock>=3){this.clock=0;this.start();}
  if(this.state.active){
   this.state.active.ttl-=step;
   this.state.active.intensity=C(this.state.active.intensity+(this.state.pressure-this.state.active.intensity)*.08);
   if(this.state.active.phase==='climax'&&this.state.active.ttl<55)this.finish(this.state.active.intensity<.55?'resolved':'unresolved');
   else if(this.state.active.phase==='recovery'&&this.state.active.ttl<20)this.finish('recovered');
   else if(this.state.active.phase==='escalation'&&this.state.active.ttl<75){this.state.active.phase='climax';this.state.phase='climax';this.emitScenario('climax');}
  }
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({cityCrisis:this.state});}
}