export class NavigationFeedbackSystem{
 constructor(game){this.game=game;this.state={active:false,destination:null,distance:null,route:null,updatedAt:0};this.bind();}
 bind(){
  this.game.events.on('navigation:route-ready',e=>this.set({active:true,destination:e?.destination||e?.district||null,distance:e?.distance??null,route:e?.route||null}));
  this.game.events.on('navigation:route-cleared',()=>this.set({active:false,destination:null,distance:null,route:null}));
 }
 set(p){this.state={...this.state,...p,updatedAt:Date.now()};this.game.state.update({navigationFeedback:this.state});this.game.events.emit('ui:navigation-feedback',this.state);}
 update(){}
}