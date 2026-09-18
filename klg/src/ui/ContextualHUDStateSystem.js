export class ContextualHUDStateSystem{
 constructor(game){this.game=game;this.state={mode:'explore',focus:null,priority:0,message:null,updatedAt:0};this.bind();}
 bind(){
  this.game.events.on('mission:started',m=>this.set('mission',m?.id||null,3,'Mission active'));
  this.game.events.on('mission:completed',()=>this.set('explore',null,0,'Mission complete'));
  this.game.events.on('mission:failed',()=>this.set('explore',null,0,'Mission failed'));
  this.game.events.on('opportunity:discovered',o=>this.set('opportunity',o?.id||null,2,'Opportunity nearby'));
  this.game.events.on('npc:interaction-offer',e=>this.set('social',e?.npcId||null,2,'Social interaction'));
  this.game.events.on('crew:support-active',e=>this.set('crew',e?.crewId||null,2,'Crew support active'));
  this.game.events.on('navigation:route-ready',e=>this.set('navigation',e?.destination||null,1,'Route ready'));
  this.game.events.on('klg:completion-progress',e=>this.game.state.update({uxCompletionPercent:e?.overallPercent||0}));
 }
 set(mode,focus,priority,message){this.state={mode,focus,priority,message,updatedAt:Date.now()};this.game.state.update({contextualHUD:{...this.state}});this.game.events.emit('ui:contextual-hud',this.state);}
 update(){}
}