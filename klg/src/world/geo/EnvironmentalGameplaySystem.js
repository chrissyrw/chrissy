const C=(v,a=0,b=2)=>Math.max(a,Math.min(b,v));
export class EnvironmentalGameplaySystem{
 constructor(game){this.game=game;this.timer=0;this.state={weather:'clear',traction:1,visibility:1,traffic:1,npcActivity:1,heat:0,risk:0,rescue:0,updatedAt:0};this.bind();}
 bind(){
  this.game.events.on('weather:environment-shift',d=>{Object.assign(this.state,{weather:d.weather,traction:d.traction,visibility:d.visibility,traffic:d.traffic,npcActivity:d.npcActivity,heat:d.heat,updatedAt:Date.now()});this.emitGameplay(d);});
 }
 emitGameplay(d){
  const risk=C((1-d.traction)*.7+(1-d.visibility)*.5+(d.traffic-1)*.35+d.heat*.25,0,1);
  this.state.risk=risk;this.state.rescue=C((1-d.npcActivity)*.45+(d.traffic-1)*.25+d.heat*.15,0,1);
  this.game.events.emit('environment:gameplay-impact',{weather:d.weather,traction:d.traction,visibility:d.visibility,traffic:d.traffic,npcActivity:d.npcActivity,heat:d.heat,risk,rescue:this.state.rescue});
  if(risk>.42)this.game.events.emit('environment:hazard-window',{weather:d.weather,risk,district:this.game.state.get().world?.district||'default'});
  if(this.state.rescue>.38)this.game.events.emit('environment:rescue-window',{weather:d.weather,intensity:this.state.rescue,district:this.game.state.get().world?.district||'default'});
 }
 update(dt){
  this.timer+=dt;if(this.timer<3)return;this.timer=0;
  const w=this.game.weather;if(!w)return;
  const traction=w.modifier('traction',1),visibility=w.modifier('visibility',1),traffic=w.modifier('traffic',1),npc=w.modifier('npcActivity',1);
  this.state.traction=traction;this.state.visibility=visibility;this.state.traffic=traffic;this.state.npcActivity=npc;
  const v=this.game.vehicles.active;
  if(v){const base=v.baseGrip??.92;v.environmentGrip=C(base*traction,.35,.98);v.grip=Math.min(v.grip??.92,v.environmentGrip);v.environmentSpeed=C((v.maxSpeed??v.speed??20)*(0.78+0.22*traction),4,60);}
  this.state.updatedAt=Date.now();
  this.game.state.update({environmentGameplay:this.state});
  this.game.events.emit('environment:gameplay-update',{...this.state});
 }
}