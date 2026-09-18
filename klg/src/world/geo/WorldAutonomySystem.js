const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DOMAINS=['economy','social','faction','logistics','safety','district'];

export class WorldAutonomySystem{
  constructor(game){
    this.game=game;this.tick=0;this.lastDecision={};
    const saved=game.state.get().worldAutonomy||{};
    this.state=saved.agents?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{agents:{},decisions:[],cycles:0,autonomy:0,updatedAt:0};}
  bind(){
    this.game.events.on('ai:world-forecast',e=>this.observe('forecast',e));
    this.game.events.on('npc:economy-update',e=>this.observe('economy',e));
    this.game.events.on('npc:social-network',e=>this.observe('social',e));
    this.game.events.on('faction:conflict-event',e=>this.observe('faction',e));
    this.game.events.on('cargo:route-pressure',e=>this.observe('logistics',e));
    this.game.events.on('district:evolved',e=>this.observe('district',e));
  }
  ensure(domain,district){
    const key=domain+':'+district;
    if(!this.state.agents[key])this.state.agents[key]={key,domain,district,utility:0,decisions:0,last:0,state:'idle'};
    return this.state.agents[key];
  }
  observe(domain,e={}){
    const district=e.district||e.name||e.hot?.[0]?.district||this.game.state.get().world?.district||'default';
    const a=this.ensure(domain,district);
    const values=[e.pressure,e.risk,e.opportunity,e.intensity,e.marketPressure,e.tension].filter(v=>Number.isFinite(Number(v))).map(Number);
    const signal=values.length?CLAMP(values.reduce((x,v)=>x+v,0)/values.length):.25;
    a.utility=CLAMP(a.utility*.7+signal*.3);a.state=signal>.7?'active':signal>.4?'watching':'idle';
  }
  candidates(){
    const s=this.game.state.get(),f=s.worldSimulationIntelligence?.forecasts?.find(x=>x.horizon===10),out=[];
    for(const x of (f?.hot||[])){
      if(x.risk>.62)out.push({domain:'safety',district:x.district,action:'stabilize',score:x.risk});
      if(x.opportunity>.6)out.push({domain:'economy',district:x.district,action:'open-trade',score:x.opportunity});
      if(x.risk>.5&&x.opportunity>.45)out.push({domain:'logistics',district:x.district,action:'reroute-flow',score:(x.risk+x.opportunity)/2});
    }
    for(const [key,a] of Object.entries(this.state.agents)){
      if(a.utility>.58)out.push({domain:a.domain,district:a.district,action:this.defaultAction(a.domain),score:a.utility*.72});
    }
    return out.filter(x=>this.cooldown(x)).sort((a,b)=>b.score-a.score).slice(0,3);
  }
  defaultAction(domain){
    return {economy:'open-trade',social:'create-social-wave',faction:'reduce-tension',logistics:'reroute-flow',safety:'stabilize',district:'adapt-district'}[domain]||'adapt';
  }
  cooldown(c){const key=c.domain+':'+c.district+':'+c.action,age=(Date.now()-(this.lastDecision[key]||0))/1000;return age>18;}
  act(c){
    const key=c.domain+':'+c.district+':'+c.action;this.lastDecision[key]=Date.now();
    const a=this.ensure(c.domain,c.district);a.decisions++;a.last=Date.now();a.state='acting';
    const strength=CLAMP(.25+c.score*.55);
    if(c.action==='stabilize')this.game.cityResponse?.respond('secure',c.district,strength);
    if(c.action==='open-trade'){this.game.events.emit('district:autonomous-trade',{district:c.district,intensity:strength,source:'world-autonomy'});this.game.events.emit('delivery:opportunity',{district:c.district,reward:Math.round(180+300*strength),reason:'autonomous-economy'});}
    if(c.action==='reroute-flow'){this.game.cityResponse?.respond('reroute',c.district,strength);}
    if(c.action==='create-social-wave')this.game.npcSocialIntelligence?.citySignal({district:c.district,intensity:strength});
    if(c.action==='reduce-tension')this.game.cityResponse?.respond('adapt',c.district,strength);
    if(c.action==='adapt-district')this.game.events.emit('district:autonomous-adaptation',{district:c.district,strength,source:'world-autonomy'});
    this.state.decisions.unshift({...c,strength,at:Date.now()});this.state.decisions=this.state.decisions.slice(0,64);
    this.state.cycles++;this.game.events.emit('world:autonomous-decision',{...c,strength,at:Date.now()});
  }
  update(dt){
    this.tick+=dt;if(this.tick<6)return;this.tick=0;
    for(const c of this.candidates())this.act(c);
    this.state.autonomy=CLAMP(Object.values(this.state.agents).reduce((s,a)=>s+(a.decisions>0?1:0),0)/Math.max(1,Object.keys(this.state.agents).length));
    this.state.updatedAt=Date.now();this.sync();
  }
  sync(){this.game.state.update({worldAutonomy:this.state});}
}
