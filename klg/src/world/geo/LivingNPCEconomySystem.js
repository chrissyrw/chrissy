const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

const DISTRICTS={
  Kimironko:{jobs:1.25,commerce:1.45,delivery:1.35,people:1.25,security:.9},
  Nyamirambo:{jobs:1.15,commerce:1.2,delivery:1.15,people:1.45,security:.82},
  Kimihurura:{jobs:1.3,commerce:1.25,delivery:1.05,people:1.05,security:1.12},
  Kacyiru:{jobs:1.0,commerce:.95,delivery:.9,people:.85,security:1.25},
  Remera:{jobs:1.18,commerce:1.15,delivery:1.35,people:1.2,security:1.0},
  KigaliCBD:{jobs:1.5,commerce:1.4,delivery:1.3,people:1.35,security:1.15},
  default:{jobs:1,commerce:1,delivery:1,people:1,security:1}
};

const RESPONSE_MAP={
  reroute:{traffic:.78,delivery:1.12,people:.94},
  redistribute:{supply:1.18,demand:.96,delivery:1.18},
  mobilize:{people:1.2,demand:1.12},
  secure:{security:1.28,traffic:.92,people:.94},
  adapt:{traffic:.9,delivery:1.08},
  spread:{information:1.28,demand:1.06},
  default:{traffic:1,demand:1,delivery:1,people:1,security:1}
};

export class LivingNPCEconomySystem{
  constructor(game){
    this.game=game;
    this.timer=0;
    this.state=game.state.get().livingNPCEconomy||this.empty();
    this.bind();
    this.sync();
  }

  empty(){return{districts:{},network:{jobs:0,demand:0,supply:0,deliveries:0,traffic:0,security:0,pricePressure:0},opportunities:[],updatedAt:0};}

  bind(){
    this.game.events.on('city:response',e=>this.applyResponse(e));
    this.game.events.on('city:adaptive-state',e=>this.adaptation=e.level||0);
    this.game.events.on('district:trade-opportunity',e=>this.tradeSignal(e));
    this.game.events.on('business:orders',e=>this.orderSignal(e));
    this.game.events.on('city:activity-signal',e=>this.activitySignal(e));
  }

  profile(name){return DISTRICTS[name]||DISTRICTS.default;}
  ensure(name){
    if(!this.state.districts[name]){
      const p=this.profile(name);
      this.state.districts[name]={name,jobs:p.jobs,demand:p.commerce,supply:1,deliveries:p.delivery,people:p.people,traffic:p.people,security:p.security,price:1,employment:.86,workShift:0,marketPressure:0};
    }
    return this.state.districts[name];
  }

  applyResponse(e={}){
    const n=this.ensure(e.district||'default'),r=RESPONSE_MAP[e.response]||RESPONSE_MAP.default,s=CLAMP(Number(e.strength||.35),.05,1);
    if(r.traffic)n.traffic=CLAMP(n.traffic*r.traffic+(1-r.traffic)*s*.35,.5,2);
    if(r.delivery)n.deliveries=CLAMP(n.deliveries*r.delivery,.5,2);
    if(r.people)n.people=CLAMP(n.people*r.people,.5,2);
    if(r.security)n.security=CLAMP(n.security*r.security,.5,2);
    if(r.demand)n.demand=CLAMP(n.demand*r.demand,.5,2);
    if(r.supply)n.supply=CLAMP(n.supply*r.supply,.5,2);
    if(r.information)n.demand=CLAMP(n.demand*(1+.06*s),.5,2);
    this.recompute(n);
    this.emitWorkShift(n,e.response||'adapt');
  }

  tradeSignal(e={}){
    const from=this.ensure(e.from||'default'),to=this.ensure(e.to||'default');
    from.supply=CLAMP(from.supply-.025,.5,2);from.deliveries=CLAMP(from.deliveries+.07,.5,2);
    to.demand=CLAMP(to.demand+.08,.5,2);to.deliveries=CLAMP(to.deliveries+.06,.5,2);
    this.recompute(from);this.recompute(to);
  }

  orderSignal(e={}){
    for(const order of (e.orders||[]).slice(0,8)){
      const n=this.ensure(order.district||this.game.state.get().world?.district||'default');
      n.deliveries=CLAMP(n.deliveries+.06,.5,2);n.demand=CLAMP(n.demand+.04,.5,2);this.recompute(n);
    }
  }

  activitySignal(e={}){
    const n=this.ensure(e.district||this.game.state.get().world?.district||'default');
    const intensity=CLAMP(Number(e.intensity||e.energy||.3),.05,1);
    n.people=CLAMP(n.people+.08*intensity,.5,2);n.demand=CLAMP(n.demand+.05*intensity,.5,2);this.recompute(n);
  }

  recompute(n){
    n.marketPressure=CLAMP((n.demand/n.supply-1)*.55+(n.traffic-1)*.2+(n.deliveries-1)*.12);
    n.price=CLAMP(1+n.marketPressure*.45,.75,1.5);
    n.employment=CLAMP(.72+n.jobs*.12-n.marketPressure*.12,.55,1);
    n.workShift=CLAMP((n.demand-1)*.55+(n.deliveries-1)*.2+(n.people-1)*.15);
  }

  emitWorkShift(n,reason){
    this.game.events.emit('npc:work-shift',{district:n.name,employment:n.employment,workShift:n.workShift,reason});
    if(n.workShift>.28)this.game.events.emit('delivery:opportunity',{district:n.name,demand:n.demand,reward:Math.round(180+240*n.workShift),reason:'market-pressure'});
    if(n.security>.25)this.game.events.emit('police:presence-shift',{district:n.name,presence:n.security});
  }

  generateOpportunities(){
    const out=[];
    for(const n of Object.values(this.state.districts)){
      if(n.demand>1.2&&n.supply<.95)out.push({type:'SUPPLY_RUN',district:n.name,pressure:n.marketPressure,reward:Math.round(260+320*n.marketPressure)});
      if(n.deliveries>1.28)out.push({type:'DELIVERY',district:n.name,pressure:n.deliveries-1,reward:Math.round(220+260*(n.deliveries-1))});
      if(n.security>1.2)out.push({type:'SECURITY_CONTRACT',district:n.name,pressure:n.security-1,reward:Math.round(240+280*(n.security-1))});
    }
    this.state.opportunities=out.slice(-12);
    for(const o of this.state.opportunities.slice(-4))this.game.events.emit('delivery:opportunity',o);
  }

  update(dt){
    this.timer+=dt;if(this.timer<3)return;const step=this.timer;this.timer=0;
    const world=this.game.state.get().world||{};const hour=world.time?.hour??12;const peak=(hour>=7&&hour<=9)||(hour>=16&&hour<=19);
    for(const name of Object.keys(DISTRICTS)){
      const n=this.ensure(name),p=this.profile(name),di=this.game.state.get().districtIntelligence;
      const same=di?.name===name;
      n.traffic=CLAMP(n.traffic+(peak?.025:-.018)*p.people*step/3,.5,2);
      n.people=CLAMP(n.people+(peak?.018:-.012)*p.people*step/3,.5,2);
      n.supply=CLAMP(n.supply+.018*step/3-n.demand*.004*step/3,.5,2);
      n.demand=CLAMP(n.demand-.018*step/3,.5,2);
      if(same&&di?.activity)n.demand=CLAMP(n.demand+(di.activity-1)*.025,.5,2);
      this.recompute(n);
    }
    const vals=Object.values(this.state.districts);
    this.state.network={
      jobs:vals.reduce((a,n)=>a+n.jobs,0)/vals.length,
      demand:vals.reduce((a,n)=>a+n.demand,0)/vals.length,
      supply:vals.reduce((a,n)=>a+n.supply,0)/vals.length,
      deliveries:vals.reduce((a,n)=>a+n.deliveries,0)/vals.length,
      traffic:vals.reduce((a,n)=>a+n.traffic,0)/vals.length,
      security:vals.reduce((a,n)=>a+n.security,0)/vals.length,
      pricePressure:vals.reduce((a,n)=>a+n.marketPressure,0)/vals.length
    };
    this.generateOpportunities();
    this.state.updatedAt=Date.now();
    this.sync();
    this.game.events.emit('npc:economy-update',{network:this.state.network,districts:Object.values(this.state.districts).map(n=>({...n}))});
    const hot=vals.slice().sort((a,b)=>b.marketPressure-a.marketPressure)[0];
    if(hot)this.game.events.emit('business:market-shift',{district:hot.name,demand:hot.demand,supply:hot.supply,price:hot.price,pressure:hot.marketPressure});
  }

  sync(){this.game.state.update({livingNPCEconomy:this.state});}
}
