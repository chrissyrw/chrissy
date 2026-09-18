export class MissionHUDStateSystem{
 constructor(game){this.game=game;this.state=null;this.bind();}
 bind(){
  this.game.events.on('mission:started',m=>this.sync(m||{}));
  this.game.events.on('mission:objective-progress',e=>this.progress(e||{}));
  this.game.events.on('gameplay:objective-complete',e=>this.progress({...e,progress:100}));
  this.game.events.on('mission:completed',()=>this.clear());
  this.game.events.on('mission:failed',()=>this.clear());
 }
 sync(m){this.state={id:m.id,title:m.title||m.name||'Mission',objective:m.objective||{},progress:0,status:'active',updatedAt:Date.now()};this.game.state.update({missionHUD:this.state});this.game.events.emit('ui:mission-hud',this.state);}
 progress(e){if(!this.state||e.missionId!==this.state.id)return;this.state={...this.state,progress:Math.max(this.state.progress,Math.min(100,Number(e.progress||0))),updatedAt:Date.now()};this.game.state.update({missionHUD:this.state});this.game.events.emit('ui:mission-hud',this.state);}
 clear(){this.state=null;this.game.state.update({missionHUD:null});this.game.events.emit('ui:mission-hud',{visible:false});}
 update(){}
}