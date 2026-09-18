const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const ACTIONS={
  dispatch:{weight:1.15,cooldown:10},
  reroute:{weight:1.0,cooldown:12},
  reinforce:{weight:.95,cooldown:15},
  spawn-assist:{weight:1.05,cooldown:18},
  accelerate-recovery:{weight:.85,cooldown:16}
};

export class EmergencyAIDirectorSystem{
  constructor(game){
    this.game=game;this.tick=0;this.clock=0;this.last={};
    const saved=game.state.get().emergencyAIDirector||{};
    this.state=saved.decisions?{...saved}:{
      phase:'watching',decisions:[],active:0,interventions:0,
      responseBias:{},updatedAt:0
    };
    this.bind();this.sync();
  }
  bind(){
    this.game.events.on('emergency:incident-created',e=>this.observe(e));
    this.game.events.on('emergency:secondary-event',e=>this.learn('secondary',e));
    this.game.events.on('emergency:rescue-complete',e=>this.learn('rescue',e));
    this.game.events.on('emergency:reported',e=>this.learn('report',e));
    this.game.events.on('emergency:ignored',e=>this.learn('ignored',e));
    this.game.events.on('emergency:city-recovered',e=>this.learn('recovery',e));
  }
  observe(e){
    if(!e?.id)return;
    this.state.active++;
    this.state.responseBias[e.district]=(this.state.responseBias[e.district]||0)+e.intensity;
    this.game.events.emit('ai:emergency-assessment',{
      id:e.id,district:e.district,type:e.type,intensity:e.intensity,
      priority:C(.35+e.intensity*.65),at:Date.now()
    });
  }
  score(action,e){
    const bias=C((this.state.responseBias[e.district]||0)/3);
    const forecast=this.game.state.get().worldSimulationIntelligence?.forecasts?.find(x=>x.horizon===10);
    const hot=forecast?.hot?.find(x=>x.district===e.district);
    const risk=hot?.risk||0,opp=hot?.opportunity||0;
    const age=(Date.now()-(this.last[action]||0))/1000;
    const cd=ACTIONS[action].cooldown;
    const cooldown=age<cd?1-age/cd:0;
    let base=e.intensity;
    if(action==='reroute')base+=risk*.35;
    if(action==='reinforce')base+=e.intensity*.3+bias*.15;
    if(action==='spawn-assist')base+=opp*.25;
    if(action==='accelerate-recovery')base+=(1-e.intensity)*.2;
    return Math.max(0,base*ACTIONS[action].weight*(1-cooldown));
  }
  decide(e){
    const candidates=Object.keys(ACTIONS).map(action=>({action,score:this.score(action,e)}))
      .sort((a,b)=>b.score-a.score);
    const selected=candidates[0];
    if(!selected||selected.score<.28)return;
    this.apply(selected,e);
  }
  apply(d,e){
    this.last[d.action]=Date.now();
    const payload={id:e.id,action:d.action,district:e.district,type:e.type,score:C(d.score),priority:C(e.intensity),at:Date.now()};
    if(d.action==='dispatch'){
      this.game.events.emit('emergency:dispatch',{id:e.id,district:e.district,type:e.type,priority:e.intensity,units:e.type==='medical-call'?['service','medical']:['service','police']});
    } else if(d.action==='reroute'){
      if(this.game.traffic)this.game.traffic.emergencyIncident={x:e.position?.x||0,z:e.position?.z||0,type:e.type,intensity:C(e.intensity*1.15)};
      this.game.events.emit('traffic:consequence',{district:e.district,pressure:C(e.intensity*.8),source:'emergency-ai'});
    } else if(d.action==='reinforce'){
      this.game.emergencyRescue?.createResponder('police');
      this.game.events.emit('emergency:reinforcement',{id:e.id,district:e.district,intensity:e.intensity});
    } else if(d.action==='spawn-assist'){
      this.game.events.emit('ai:world-pressure',{type:'emergency-assist',district:e.district,intensity:C(.3+e.intensity*.5),source:'emergency-ai'});
      this.game.events.emit('gameplay:emergency-opportunity',{...e,options:['help','report','avoid'],aiGenerated:true});
    } else if(d.action==='accelerate-recovery'){
      this.game.events.emit('emergency:recovery-boost',{id:e.id,district:e.district,factor:C(.45+e.intensity*.35)});
    }
    this.state.interventions++;
    this.state.decisions.unshift(payload);this.state.decisions=this.state.decisions.slice(0,48);
    this.state.phase=d.score>.8?'commanding':d.score>.5?'coordinating':'watching';
    this.game.events.emit('ai:emergency-decision',payload);
    this.sync();
  }
  learn(type,e){
    this.state.responseBias[e?.district]=(this.state.responseBias[e?.district]||0)*.98;
    this.state.responseBias[e?.district]=(this.state.responseBias[e?.district]||0)+(type==='recovery'?.08:type==='ignored'?.2:.04);
  }
  update(dt){
    this.tick+=dt;this.clock+=dt;if(this.tick<1)return;this.tick=0;
    const active=Object.keys(this.game.emergencyRescue?.state?.active||{}).length;
    this.state.active=active;
    if(this.clock>=2){
      this.clock=0;
      const incident=this.game.emergencyRescue?.active;
      if(incident)this.decide(incident);
    }
    this.state.updatedAt=Date.now();this.sync();
  }
  sync(){this.game.state.update({emergencyAIDirector:this.state});}
}