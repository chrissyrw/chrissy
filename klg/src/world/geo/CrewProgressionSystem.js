const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewProgressionSystem{
 constructor(game){this.game=game;this.tick=0;this.state=game.state.get().crewProgression||{crews:{},updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:formed',e=>this.ensure(e));
  this.game.events.on('crew:support-active',e=>this.progress(e.crewId,.04));
  this.game.events.on('mission:completed',e=>{const id=e?.crewId||e?.crew?.id;if(id)this.progress(id,.1);});
  this.game.events.on('mission:failed',e=>{const id=e?.crewId||e?.crew?.id;if(id)this.progress(id,-.06);});
 }
 ensure(e={}){
  const id=e.id||e.crewId;if(!id)return null;
  return this.state.crews[id]||(this.state.crews[id]={id,district:e.district||'KigaliCBD',leader:e.leader||null,members:e.members||[],xp:0,level:1,cohesion:.55,influence:0,missions:0,completed:0,failed:0,rank:'rookie'});
 }
 progress(id,delta=0){
  const c=this.ensure({id});if(!c)return;
  c.xp=Math.max(0,c.xp+Math.round(delta*100));
  c.cohesion=CLAMP(c.cohesion+delta*.18);
  c.influence=CLAMP(c.influence+delta*.12);
  const next=1+Math.floor(c.xp/100);
  if(next>c.level){c.level=next;c.rank=c.level>=6?'elite':c.level>=3?'trusted':'rookie';this.game.events.emit('crew:level-up',{...c});}
  c.missions++;
  this.game.events.emit('crew:progress',{...c});
  this.sync();
 }
 update(dt){this.tick+=dt;if(this.tick<2)return;this.tick=0;for(const c of Object.values(this.state.crews)){c.cohesion=CLAMP(c.cohesion-.002);c.influence=CLAMP(c.influence+(c.cohesion-.5)*.004);if(c.cohesion<.2)c.rank='unstable';}this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewProgression:this.state});}
}