const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const BRANCHES={
 respond:{next:'stabilize',rep:5,pressure:-.18,domains:['safety','social']},
 protect:{next:'alliance',rep:7,pressure:-.12,domains:['faction','social']},
 exploit:{next:'opportunist',rep:-3,pressure:.08,domains:['economy','faction']},
 resolve:{next:'recovery',rep:6,pressure:-.25,domains:['safety','economy']},
 reroute:{next:'mobility',rep:3,pressure:-.16,domains:['traffic','logistics']},
 commit:{next:'legacy',rep:9,pressure:-.1,domains:['culture','faction']}
};

export class CrisisBranchingAgencySystem{
 constructor(game){
  this.game=game;this.tick=0;this.active=null;
  const saved=game.state.get().crisisAgency||{};
  this.state=saved.history?{...saved}:{
   history:[],branches:{},alliances:{},districtEffects:{},updatedAt:0
  };
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('city:crisis-start',e=>this.start(e));
  this.game.events.on('gameplay:crisis-opportunity',e=>this.offer(e));
  this.game.events.on('city:crisis-climax',e=>this.offer({...e,options:['resolve','reroute','commit']}));
  this.game.events.on('city:crisis-resolved',e=>this.finish(e));
  if(typeof document!=='undefined')document.addEventListener('keydown',e=>{
   if(e.repeat||!this.active)return;
   const i=Number(e.key)-1;
   if(i>=0&&i<3)this.choose(this.active.options?.[i]);
  });
 }
 start(e){
  this.active={id:e.id,district:e.district,phase:e.phase,intensity:e.intensity,domains:e.domains||[],options:[],branch:'root',choices:[],startedAt:Date.now()};
  this.state.branches[e.id]={root:true,branch:'root',choices:[]};
  this.game.events.emit('crisis:branch-opened',{id:e.id,district:e.district,branch:'root',options:[]});
  this.sync();
 }
 offer(e){
  if(!this.active||this.active.id!==e.id)return;
  this.active.options=e.options||[];
  this.active.phase=e.phase||this.active.phase;
  this.game.events.emit('crisis:choice-available',{
   id:this.active.id,district:this.active.district,phase:this.active.phase,
   branch:this.active.branch,options:[...this.active.options]
  });
  this.sync();
 }
 choose(option){
  if(!this.active||!option)return false;
  const branch=BRANCHES[option];
  if(!branch||!this.active.options.includes(option))return false;
  const a=this.active;
  a.choices.push({option,branch:branch.next,at:Date.now()});
  a.branch=branch.next;
  a.intensity=C(a.intensity+branch.pressure);
  a.options=[];
  const d=a.district;
  this.state.branches[a.id]={branch:a.branch,choices:a.choices.slice(-8),domains:branch.domains};
  this.state.districtEffects[d]=this.state.districtEffects[d]||{pressure:0,rep:0};
  this.state.districtEffects[d].pressure=C(this.state.districtEffects[d].pressure+branch.pressure,-1,1);
  this.state.districtEffects[d].rep+=branch.rep;
  this.state.history.unshift({id:a.id,district:d,option,branch:a.branch,at:Date.now()});
  this.state.history=this.state.history.slice(0,64);

  this.game.events.emit('player:choice-made',{
   crisisId:a.id,option,type:'crisis',district:d,
   impact:{rep:branch.rep,xp:8}
  });
  this.game.events.emit('crisis:branch-changed',{
   id:a.id,district:d,from:a.choices.length>1?a.choices[a.choices.length-2].branch:'root',
   branch:a.branch,option,intensity:a.intensity
  });
  this.game.events.emit('world:consequence',{
   type:'crisis-branch',district:d,rep:branch.rep,
   intensity:C(Math.abs(branch.pressure)),choice:option,source:'crisis-agency'
  });

  if(branch.next==='alliance'||branch.next==='legacy'){
   this.state.alliances[d]=(this.state.alliances[d]||0)+branch.rep;
   this.game.events.emit('faction:crisis-alignment',{district:d,standing:branch.rep,branch:branch.next});
  }
  if(branch.next==='mobility'){
   this.game.events.emit('cargo:route-pressure',{district:d,pressure:C(.35+a.intensity*.25),source:'crisis-reroute'});
  }
  if(branch.next==='opportunist'){
   this.game.events.emit('economy:crisis-opportunity',{district:d,intensity:a.intensity,source:'player-exploit'});
  }
  if(a.phase==='escalation'){
   a.phase='climax';
   this.game.events.emit('city:crisis-branch-escalated',{...a});
  }else{
   this.game.events.emit('city:crisis-branch-resolved',{...a});
  }
  this.sync();return true;
 }
 finish(e){
  if(this.active?.id!==e.id)return;
  const a=this.active;
  this.state.history.unshift({id:a.id,district:a.district,outcome:e.outcome,branch:a.branch,choices:a.choices,at:Date.now()});
  this.state.history=this.state.history.slice(0,64);
  this.game.events.emit('crisis:legacy-recorded',{
   id:a.id,district:a.district,branch:a.branch,choices:a.choices,outcome:e.outcome
  });
  this.active=null;this.sync();
 }
 update(dt){
  this.tick+=dt;if(this.tick<1)return;this.tick=0;
  if(this.active){
   this.active.intensity=C(this.active.intensity*.997);
   if(this.active.intensity<.18)this.active.options=[];
  }
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({crisisAgency:this.state});}
}