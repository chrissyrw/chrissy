export class OpportunityFeedbackSystem{
 constructor(game){this.game=game;this.active=null;this.bind();}
 bind(){
  this.game.events.on('opportunity:discovered',o=>{this.active={id:o.id,title:o.title||o.name||'New opportunity',district:o.district||null,type:o.type||'discovery',accepted:!!o.accepted,updatedAt:Date.now()};this.publish();});
  this.game.events.on('gameplay:opportunity-accept',o=>{if(this.active?.id===(o.id||o.opportunityId))this.active={...this.active,accepted:true,updatedAt:Date.now()};this.publish();});
  this.game.events.on('opportunity:expired',o=>{if(this.active?.id===o.id)this.active=null;this.publish();});
 }
 publish(){this.game.state.update({opportunityFeedback:this.active});this.game.events.emit('ui:opportunity-feedback',this.active);}
 update(){}
}