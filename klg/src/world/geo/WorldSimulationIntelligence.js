const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const HORIZONS=[10,30,60];
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class WorldSimulationIntelligence{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().worldSimulationIntelligence||{};
    this.state=saved.forecasts?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{forecasts:[],current:null,pressure:0,opportunity:0,updatedAt:0};}
  bind(){
    this.game.events.on('consequence:world-effect',()=>this.request());
    this.game.events.on('ai:director-decision',()=>this.request());
    this.game.events.on('city:adaptive-state',()=>this.request());
  }
  snapshot(){
    const s=this.game.state.get(),ai=s.aiWorldDirector||{},memory=s.adaptiveWorldMemory||{},living=s.livingConsequences||{},economy=s.livingNPCEconomy||{};
    const districts={};
    for(const name of DISTRICTS){
      const m=memory.districts?.[name]||{},e=economy.districts?.[name]||{};
      districts[name]={
        pressure:CLAMP(Number(m.pressure||0)+Number(e.marketPressure||0)),
        trust:CLAMP(.5+Number(m.trust||0)),
        traffic:CLAMP((Number(e.traffic||1)-.7)/1.3),
        demand:CLAMP((Number(e.demand||1)-.7)/1.3),
        security:CLAMP((Number(e.security||1)-.6)/1.4)
      };
    }
    return{
      districts,
      networkPressure:CLAMP(Number(living.network?.pressure||0)),
      aiOpportunity:CLAMP(Number(ai.pressure?.opportunity||0)),
      weather:(s.world?.weather==='storm'||s.world?.weather==='rain')?.55:.15,
      time:s.world?.time||0
    };
  }
  project(base,horizon){
    const d=Object.fromEntries(Object.entries(base.districts).map(([k,v])=>[k,{...v}]));
    let pressure=base.networkPressure,opportunity=base.aiOpportunity;
    const steps=Math.max(1,Math.round(horizon/10));
    for(let i=0;i<steps;i++){
      for(const n of Object.values(d)){
        n.traffic=CLAMP(n.traffic*.96+(n.demand*.045));
        n.demand=CLAMP(n.demand*.97+n.pressure*.055);
        n.security=CLAMP(n.security*.985+n.pressure*.035);
        n.pressure=CLAMP(n.pressure*.93+n.traffic*.035+n.demand*.045+n.security*.02);
        n.trust=CLAMP(n.trust*.992+(1-n.pressure)*.012);
      }
      const vals=Object.values(d);
      pressure=CLAMP(vals.reduce((a,n)=>a+n.pressure,0)/vals.length*.72+pressure*.28);
      opportunity=CLAMP(.55*opportunity+.25*pressure+.12*vals.reduce((a,n)=>a+n.demand,0)/vals.length+.08*(1-vals.reduce((a,n)=>a+n.trust,0)/vals.length));
    }
    const ranked=Object.entries(d).map(([district,n])=>({district,risk:CLAMP(n.pressure*.6+n.security*.2+n.traffic*.2),opportunity:CLAMP(n.demand*.45+n.traffic*.2+(1-n.trust)*.2+n.pressure*.15)})).sort((a,b)=>b.risk-a.risk);
    return{horizon,pressure,opportunity,hot:ranked.slice(0,3),atRisk:ranked.filter(x=>x.risk>.58).slice(0,3),signals:{traffic:ranked[0]?.risk||0,demand:ranked[0]?.opportunity||0}};
  }
  simulate(){
    const base=this.snapshot();
    return HORIZONS.map(h=>this.project(base,h));
  }
  request(){
    const forecasts=this.simulate(),current=forecasts[0]||null;
    this.state.forecasts=forecasts;this.state.current=current;
    this.state.pressure=CLAMP(forecasts.reduce((a,f)=>a+f.pressure,0)/Math.max(1,forecasts.length));
    this.state.opportunity=CLAMP(forecasts.reduce((a,f)=>a+f.opportunity,0)/Math.max(1,forecasts.length));
    this.state.updatedAt=Date.now();this.sync();
    if(current)this.game.events.emit('ai:world-forecast',{...current,source:'simulation'});
  }
  update(dt){
    this.tick+=dt;if(this.tick<5)return;this.tick=0;this.request();
  }
  sync(){this.game.state.update({worldSimulationIntelligence:this.state});}
}
