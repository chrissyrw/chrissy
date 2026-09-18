const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class AIDiplomaticDirectorSystem{
 constructor(game){this.game=game;this.tick=0;this.state=game.state.get().aiDiplomaticDirector||{recommendations:[],updatedAt:0};this.bind();this.sync();}
 bind(){this.game.events.on('faction:diplomacy-update',e=>this.evaluate(e));this.game.events.on('district:governance-state',e=>this.governance(e));}
 evaluate(e={}){const score=C((Number(e.trust)||0)+.5);const action=score>.72?'propose-alliance':score>.48?'offer-trade':score<.25?'deescalate':'observe';const r={action,factions:[e.a,e.b],trust:e.trust||0,at:Date.now()};this.state.recommendations.unshift(r);this.state.recommendations=this.state.recommendations.slice(0,20);this.game.events.emit('ai:diplomatic-recommendation',r);}
 governance(e={}){if(e.stability<.35)this.game.events.emit('ai:world-pressure',{type:'governance-risk',district:e.district,intensity:1-e.stability});}
 update(dt){this.tick+=dt;if(this.tick>8){this.tick=0;this.state.updatedAt=Date.now();this.sync();}}
 sync(){this.game.state.update({aiDiplomaticDirector:this.state});}
}