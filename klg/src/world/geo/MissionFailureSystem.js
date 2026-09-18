const now=()=>Date.now();
export class MissionFailureSystem{
 constructor(game){this.game=game;this.deadlines=new Map();this.bind();}
 bind(){
  this.game.events.on('mission:started',m=>this.register(m||{}));
  this.game.events.on('mission:completed',m=>this.deadlines.delete(m?.id));
  this.game.events.on('mission:failed',m=>this.deadlines.delete(m?.id));
  this.game.events.on('vehicle:destroyed',e=>this.failActive('vehicle-destroyed',e));
  this.game.events.on('mission:target-lost',e=>this.failActive('target-lost',e));
 }
 duration(m){return ({rescue:45000,delivery:90000,repair:75000,escort:120000,social:90000,crew:120000,'vehicle-ability':90000}[m?.objective?.type]||150000);}
 register(m){if(m?.id)this.deadlines.set(m.id,now()+this.duration(m));}
 failActive(reason,source){const m=this.game.missions?.active;if(!m)return;this.game.events.emit('mission:objective-failed',{missionId:m.id,reason,source});this.game.events.emit('mission:failed',{...m,reason});if(this.game.missions?.active?.id===m.id)this.game.missions.active=null;this.game.state.update('mission',null);}
 update(){const m=this.game.missions?.active,deadline=m&&this.deadlines.get(m.id);if(m&&deadline&&now()>deadline)this.failActive('timeout',{deadline});}
}