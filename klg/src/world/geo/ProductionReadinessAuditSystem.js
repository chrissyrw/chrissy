export class ProductionReadinessAuditSystem{
 constructor(game){this.game=game;this.tick=0;this.checks={runtime:false,persistence:false,geo:false,errors:false,contracts:false,telemetry:false};this.bind();}
 bind(){this.game.events.on('world:state-integrity',e=>{if(e?.healthy!==false)this.checks.contracts=true;});this.game.events.on('save:completed',()=>this.checks.persistence=true);this.game.events.on('geo:world-ready',()=>this.checks.geo=true);this.game.events.on('simulation:error',()=>this.checks.errors=false);}
 update(dt=.016){
  this.tick+=dt;if(this.tick<5)return;this.tick=0;
  this.checks.runtime=!!this.game.events&&!!this.game.state&&!!this.game.world;
  this.checks.telemetry=!!this.game.gameplayTelemetry;
  const passed=Object.values(this.checks).filter(Boolean).length;
  const base=55,score=Math.min(90,base+Math.round(passed/Object.keys(this.checks).length*35));
  const report={score,checks:{...this.checks},status:score>=85?'production-near':score>=70?'hardening':'prototype-ready',updatedAt:Date.now()};
  this.game.state.update({productionReadiness:report});this.game.events.emit('production:readiness-report',report);
 }
}