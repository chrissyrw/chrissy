const distance=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
export class MissionObjectiveProgressSystem{
 constructor(game){this.game=game;this.tick=0;this.bind();}
 bind(){
  this.game.events.on('vehicle:ability-used',e=>this.signal('vehicle-ability',e));
  this.game.events.on('delivery:completed',e=>this.signal('delivery',e));
  this.game.events.on('cargo:delivered',e=>this.signal('delivery',e));
  this.game.events.on('emergency:rescue-complete',e=>this.signal('rescue',e));
  this.game.events.on('repair:completed',e=>this.signal('repair',e));
  this.game.events.on('npc:interaction-resolved',e=>this.signal('social',e));
  this.game.events.on('npc:conflict-resolved',e=>this.signal('social',e));
  this.game.events.on('crew:mission-resolved',e=>this.signal('crew',e));
  this.game.events.on('mission:crew-resolved',e=>this.signal('crew',e));
 }
 signal(type,e={}){const m=this.game.missions?.active,o=m?.objective||{};if(m&&(o.type===type||(['social','crew'].includes(type)&&o.type===type)))this.game.events.emit('mission:objective-progress',{missionId:m.id,type,progress:100,source:e});}
 position(){const v=this.game.vehicles?.active;return v?.mesh?.position||this.game.player?.position||{x:0,y:0,z:0};}
 update(dt=.016){
  this.tick+=dt;if(this.tick<.25)return;this.tick=0;const m=this.game.missions?.active;if(!m)return;
  const o=m.objective||{},p=this.position(),w=this.game.state.get().world||{};let progress=Number(m.progress||0);
  if(['location','delivery','repair','rescue'].includes(o.type)&&o.x!=null&&o.z!=null){const d=distance(p,o),r=Number(o.radius||8);progress=Math.max(progress,Math.max(0,Math.min(100,(1-d/Math.max(r*4,1))*100)));if(d<=r)this.game.events.emit('mission:objective-progress',{missionId:m.id,type:o.type,progress:100,source:'proximity'});}
  else if(o.type==='district')progress=w.district===o.district?100:progress;
  else if(o.type==='night-location')progress=(w.time>=1140||w.time<300)&&w.district===o.district?100:progress;
  else if(o.type==='storm-location')progress=w.weather==='storm'&&w.district===o.district?100:progress;
  if(progress!==m.progress)this.game.events.emit('mission:objective-progress',{missionId:m.id,type:o.type,progress,source:'telemetry'});
 }
}