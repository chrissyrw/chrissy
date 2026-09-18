export class CompletionReportSystem{
 constructor(game){this.game=game;this.tick=0;this.game.events.on('klg:completion-progress',r=>this.publish(r||{}));}
 publish(r){const report={...r,headline:'KLG '+(r.overallPercent||0)+'% · '+String(r.gate||'prototype').toUpperCase(),updatedAt:Date.now()};this.game.state.update({completionReport:report});this.game.events.emit('ui:completion-report',report);}
 update(dt=.016){this.tick+=dt;if(this.tick<3)return;this.tick=0;const r=this.game.state.get().klgCompletion;if(r)this.publish(r);}
}