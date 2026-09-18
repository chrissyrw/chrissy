export class CompletionGateSystem{
 constructor(game){this.game=game;this.last=null;this.gates=[{percent:25,id:'prototype'},{percent:50,id:'playable-core'},{percent:70,id:'vertical-slice'},{percent:85,id:'alpha'},{percent:95,id:'beta'},{percent:100,id:'release-candidate'}];this.game.events.on('klg:completion-progress',r=>this.evaluate(r||{}));}
 evaluate(r){const p=Number(r.overallPercent||0),gate=this.gates.filter(g=>p>=g.percent).at(-1)||{percent:0,id:'pre-prototype'};if(gate.id===this.last)return;this.last=gate.id;this.game.state.update({completionGate:{...gate,overallPercent:p,updatedAt:Date.now()}});this.game.events.emit('klg:completion-gate',{...gate,overallPercent:p});}
 update(){}
}