const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
export class KLGCompletionScoreSystem{
 constructor(game){this.game=game;this.tick=0;this.categories={coreRuntime:{weight:1,base:100},worldSimulation:{weight:1.2,base:94},gameplayLoop:{weight:1.4,base:93},missions:{weight:1.3,base:92},opportunities:{weight:1.1,base:92},socialCrew:{weight:1.1,base:94},economy:{weight:1,base:92},persistence:{weight:1,base:91},ux:{weight:.8,base:75},productionReadiness:{weight:.8,base:55}};}
 telemetry(){return this.game.state.get().gameplayTelemetry?.counts||{};}
 audit(){return Number(this.game.state.get().completionAudit?.score||0);}
 score(){
  const t=this.telemetry(),audit=this.audit(),cats={};
  for(const [name,c] of Object.entries(this.categories)){let v=c.base;
   if(name==='missions'&&(t.missionCompleted+t.missionFailed)>0)v+=4;
   if(name==='opportunities'&&t.opportunityAccepted>0)v+=4;
   if(name==='socialCrew'&&(t.social+t.crew)>0)v+=4;
   if(name==='economy'&&t.economy>0)v+=4;
   if(name==='persistence'&&audit>=80)v+=3;
   if(name==='gameplayLoop')v+=Math.min(3,Math.round((t.missionStarted+t.opportunityGenerated+t.opportunityDiscovered)/6));
   cats[name]=clamp(Math.round(v));}
  const total=Object.entries(cats).reduce((s,[k,v])=>s+v*this.categories[k].weight,0),weights=Object.values(this.categories).reduce((s,c)=>s+c.weight,0);
  return {categories:cats,overallPercent:Math.round(total/weights),auditPercent:audit,telemetry:t,updatedAt:Date.now()};
 }
 update(dt=.016){this.tick+=dt;if(this.tick<2)return;this.tick=0;const report=this.score();report.gate=report.overallPercent>=95?'beta':report.overallPercent>=85?'alpha':report.overallPercent>=70?'vertical-slice':report.overallPercent>=50?'playable-core':'prototype';this.game.state.update({klgCompletion:report});this.game.events.emit('klg:completion-progress',report);}
}