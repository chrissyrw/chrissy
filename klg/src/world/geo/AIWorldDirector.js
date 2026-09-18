const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const ACTIONS={
  'seed-opportunity':{cooldown:18,weight:1.05},
  'stabilize-district':{cooldown:16,weight:.92},
  'boost-logistics':{cooldown:20,weight:1.0},
  'faction-pressure':{cooldown:24,weight:.78},
  'social-wave':{cooldown:18,weight:.72},
  'city-response':{cooldown:14,weight:.88}
};

const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class AIWorldDirector{
  constructor(game){
    this.game=game;
    this.tick=0;
    this.decisionClock=0;
    this.lastDecisions={};
    const saved=game.state.get().aiWorldDirector||{};
    this.state=saved.decisions?{...saved}:this.empty();
    this.bind();
    this.sync();
  }

  empty(){
    return{
      phase:'observing',
      pressure:{},
      decisions:[],
      queue:[],
      interventions:0,
      lastAction:null,
      updatedAt:0
    };
  }

  bind(){
    this.game.events.on('world:consequence',e=>this.learn('consequence',e));
    this.game.events.on('cargo:delivery-arrived',e=>this.learn('delivery-success',e));
    this.game.events.on('cargo:delivery-failed',e=>this.learn('delivery-failure',e));
    this.game.events.on('faction:encounter-resolved',e=>this.learn('faction-choice',e));
    this.game.events.on('npc:social-decision',e=>this.learn('npc-decision',e));
  }

  snapshot(){
    const s=this.game.state.get();
    const world=s.world||{};
    const economy=s.livingNPCEconomy?.network||{};
    const social=s.npcSocialIntelligence?.metrics||{};
    const cargo=s.cargoSupplyChain?.network||{};
    const logistics=s.logisticsAI?.playerProfile||{};
    const faction=s.npcFactionDynamics||{};
    const conflicts=s.factionConflict?.active||[];
    const security=s.security||{};
    const identity=s.identity?.traits||s.identity||{};
    const memory=s.adaptiveWorldMemory||{};
    const profile=memory.players?.player||{};

    const traffic=CLAMP((Number(economy.traffic||1)-.8)/.8);
    const economic=CLAMP(Math.abs(Number(economy.pricePressure||0))+.35*Math.max(0,Number(economy.demand||1)-Number(economy.supply||1)));
    const socialPressure=CLAMP((Number(social.stressed||0)/Math.max(1,Number(social.active||1)))+.15*Number(social.relationships>20));
    const safety=CLAMP(Number(security.heat||0)/100+.45*(conflicts.length/Math.max(1,5)));
    const logisticsPressure=CLAMP(Number(cargo.pressure||0));
    const weather=world.weather==='storm'||world.weather==='rain'?0.55:0.15;
    const opportunityPressure=CLAMP(.35*economic+.25*logisticsPressure+.2*traffic+.2*socialPressure);

    return{
      district:world.district||'Kigali',
      time:world.time||0,
      traffic,economic,social:socialPressure,safety,logistics:logisticsPressure,weather,
      opportunity:opportunityPressure,
      conflicts:conflicts.length,
      reliability:Number(logistics.reliability||0),
      identity
    };
  }

  districtSnapshots(snapshot){
    const economy=this.game.state.get().livingNPCEconomy?.districts||{};
    const out=[];
    for(const name of DISTRICTS){
      const n=economy[name]||{};
      const pressure=CLAMP(
        Math.max(0,(Number(n.demand||1)-Number(n.supply||1)))*.55+
        Math.max(0,Number(n.traffic||1)-1)*.25+
        Math.max(0,Number(n.marketPressure||0))*.45
      );
      out.push({name,pressure,demand:Number(n.demand||1),supply:Number(n.supply||1),traffic:Number(n.traffic||1),security:Number(n.security||1)});
    }
    if(snapshot.district&&!out.some(x=>x.name===snapshot.district))out.push({name:snapshot.district,pressure:snapshot.opportunity,demand:1,supply:1,traffic:1,security:1});
    return out;
  }

  playerFit(action,s){
    const t=s.identity||{};
    if(action==='boost-logistics')return CLAMP((Number(t.courier||0)+Number(t.operator||0))/40);
    if(action==='seed-opportunity')return CLAMP((Number(t.explorer||0)+Number(t.courier||0)+Number(t.operator||0))/45);
    if(action==='faction-pressure')return CLAMP((Number(t.operator||0)+Number(t.night||0))/40);
    if(action==='social-wave')return CLAMP((Number(t.operator||0)+Number(t.explorer||0))/35);
    if(action==='stabilize-district')return CLAMP((Number(t.courier||0)+Number(t.lowprofile||0))/35);
    return .35;
  }

  repetitionPenalty(action,district){
    const key=action+':'+district;
    const recent=this.state.decisions.filter(x=>x.key===key).slice(0,3);
    return CLAMP(recent.length*.22);
  }

  cooldownPenalty(action){
    const at=this.lastDecisions[action]||0;
    const cd=ACTIONS[action]?.cooldown||18;
    const age=(Date.now()-at)/1000;
    return age>=cd?0:1-age/cd;
  }

  candidates(s){
    const districts=this.districtSnapshots(s);
    const hot=districts.slice().sort((a,b)=>b.pressure-a.pressure)[0]||{name:s.district,pressure:s.opportunity};
    const targets=[
      ['seed-opportunity',s.opportunity*.7+s.logistics*.35,hot],
      ['stabilize-district',s.traffic*.5+s.safety*.45+s.economic*.35,hot],
      ['boost-logistics',s.logistics*.7+s.economic*.4,hot],
      ['faction-pressure',s.safety*.8+s.conflicts*.12+s.social*.2,hot],
      ['social-wave',s.social*.8+s.economic*.25,hot],
      ['city-response',s.opportunity*.5+s.traffic*.35+s.weather*.15,hot]
    ];

    return targets.map(([action,pressure,district])=>{
      const fit=this.playerFit(action,s);
      const novelty=1-this.repetitionPenalty(action,district.name);\n      const memory=this.game.state.get().adaptiveWorldMemory?.districts?.[district.name]||{};\n      const memoryBias=CLAMP(Number(memory.trust||0)*.12-Number(memory.pressure||0)*.08);
      const cooldown=this.cooldownPenalty(action);
      const consequence=CLAMP(pressure*.65+fit*.2+novelty*.15+memoryBias);
      const score=Math.max(0,pressure)*ACTIONS[action].weight*(.55+.45*fit)*novelty*(1-cooldown)*(.65+.35*consequence);
      return{action,district:district.name,pressure:CLAMP(pressure),fit,novelty,cooldown,consequence,memoryBias,score};
    }).filter(x=>x.score>.12).sort((a,b)=>b.score-a.score);
  }

  decide(){
    const s=this.snapshot();
    const candidates=this.candidates(s);
    const selected=[];
    for(const c of candidates){
      if(selected.length>=2)break;
      if(selected.some(x=>x.action===c.action||x.district===c.district))continue;
      selected.push(c);
    }
    if(!selected.length){
      this.state.phase='observing';
      return;
    }
    this.state.phase=selected[0].score>.72?'intervening':selected[0].score>.42?'guiding':'observing';
    for(const c of selected)this.enqueue(c);
  }

  enqueue(decision){
    this.state.queue.push({...decision,queuedAt:Date.now()});
    this.state.queue=this.state.queue.slice(-8);
    this.apply(decision);
  }

  apply(d){
    const now=Date.now();
    this.lastDecisions[d.action]=now;
    const payload={action:d.action,district:d.district,score:d.score,pressure:d.pressure,fit:d.fit,consequence:d.consequence,memoryBias:d.memoryBias||0,key:d.action+':'+d.district,at:now};

    if(d.action==='seed-opportunity'){
      const reward=Math.round(220+420*d.pressure+180*d.fit);
      const good=d.pressure>.7?'parts':d.pressure>.52?'food':'delivery';
      this.game.events.emit('delivery:opportunity',{type:'AI_DIRECTOR',district:d.district,pressure:d.pressure,reward,good,reason:'world-director'});
      this.game.events.emit('ai:opportunity-seeded',{...payload,good,reward});
    }

    if(d.action==='stabilize-district'){
      this.game.cityResponse?.respond(d.pressure>.7?'secure':'adapt',d.district,CLAMP(.28+d.pressure*.5));
      this.game.events.emit('ai:world-pressure',{...payload,type:'stabilize'});
    }

    if(d.action==='boost-logistics'){
      const routes=this.game.cargoSupplyChain?.state?.routes||{};
      const route=Object.values(routes).filter(r=>r.from===d.district||r.to===d.district).sort((a,b)=>b.pressure-a.pressure)[0];
      if(route){
        route.pressure=CLAMP(route.pressure+.08+d.pressure*.12);
        this.game.logisticsAI?.pressure({route:route.id,pressure:route.pressure,traffic:route.traffic});
        this.game.events.emit('cargo:route-pressure',{route:route.id,pressure:route.pressure,traffic:route.traffic});
        this.game.events.emit('ai:world-pressure',{...payload,type:'logistics',route:route.id});
      }
    }

    if(d.action==='faction-pressure'){
      this.game.factionConflict?.pressure({district:d.district,heat:CLAMP(.35+d.pressure*.5)});
      this.game.events.emit('faction:territory-pressure',{district:d.district,heat:CLAMP(.25+d.pressure*.35),source:'ai-director'});
    }

    if(d.action==='social-wave'){
      this.game.npcSocialIntelligence?.citySignal({district:d.district,intensity:CLAMP(.35+d.pressure*.5)});
      this.game.events.emit('ai:world-pressure',{...payload,type:'social'});
    }

    if(d.action==='city-response'){
      this.game.cityResponse?.respond(d.pressure>.65?'reroute':'mobilize',d.district,CLAMP(.25+d.pressure*.45));
      this.game.events.emit('ai:world-pressure',{...payload,type:'city-response'});
    }

    this.state.interventions++;
    this.state.lastAction=payload;
    this.state.decisions.unshift(payload);
    this.state.decisions=this.state.decisions.slice(0,64);
    this.state.queue=this.state.queue.filter(x=>x!==d);
    this.sync();
    this.game.events.emit('ai:director-decision',payload);
  }

  learn(type,data={}){
    const s=this.state.learning||{};
    s[type]=(s[type]||0)+1;
    this.state.learning=s;
  }

  update(dt){
    this.tick+=dt;
    this.decisionClock+=dt;
    if(this.tick<1.5)return;
    this.tick=0;
    if(this.decisionClock>=4){
      this.decisionClock=0;
      this.decide();
    }
    this.state.pressure=this.snapshot();
    this.state.updatedAt=Date.now();
    this.sync();
  }

  sync(){
    this.game.state.update({aiWorldDirector:this.state});
  }
}
