const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];
const FACTION_BY_DISTRICT={
  Kimironko:'Market Circle',
  Nyamirambo:'Night Route',
  Rebero:'Hill Runners',
  Kacyiru:'City Services',
  Remera:'Transport Network'
};
const CULTURE_EFFECTS={
  trade:{commerce:.06,economy:.07},
  hustle:{commerce:.08,economy:.1},
  reliability:{trust:.08,faction:.05},
  community:{social:.1,trust:.07},
  nightlife:{social:.09,night:.08},
  loyalty:{trust:.1,faction:.08},
  business:{commerce:.1,economy:.1},
  status:{visibility:.1,social:.04},
  networking:{social:.08,faction:.06},
  civic:{civic:.1,trust:.06},
  order:{safety:.08,trust:.08},
  service:{civic:.08,trust:.07},
  mobility:{transport:.1,logistics:.08},
  speed:{transport:.08,logistics:.1},
  coordination:{transport:.07,social:.05},
  ambition:{economy:.08,visibility:.1},
  commerce:{commerce:.1,economy:.08},
  visibility:{visibility:.12,social:.05},
  grit:{faction:.07,resilience:.1},
  hillcraft:{terrain:.1,logistics:.06},
  independence:{opportunity:.08,social:-.03}
};

export class CultureWorldBridgeSystem{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().cultureWorldBridge||{};
    this.state=saved.districts?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{districts:{},effects:{},interventions:0,signals:[],updatedAt:0};}
  bind(){
    this.game.events.on('culture:update',e=>this.signal('culture-update',e));
    this.game.events.on('society:collective-decision',e=>this.signal('collective',e));
    this.game.events.on('district:collective-trade',e=>this.signal('trade',e));
    this.game.events.on('faction:opportunity',e=>this.signal('faction-opportunity',e));
  }
  ensure(district){
    if(!this.state.districts[district])this.state.districts[district]={district,dominant:'community',intensity:0,commerce:0,social:0,trust:0,transport:0,economy:0,civic:0,visibility:0,opportunity:0};
    return this.state.districts[district];
  }
  profile(district){
    return this.game.emergentCulture?.profile(district)||{district,identity:['mixed'],dominant:'community',trust:.35,status:0,visibility:.2,trend:0};
  }
  signal(type,data){this.state.signals.unshift({type,data,at:Date.now()});this.state.signals=this.state.signals.slice(0,32);}
  applyDistrict(district){
    const culture=this.profile(district),x=this.ensure(district),effect=CULTURE_EFFECTS[culture.dominant]||{};
    const strength=CLAMP(.35+culture.trend*.65);
    x.dominant=culture.dominant;x.intensity=strength;
    for(const key of ['commerce','social','trust','transport','economy','civic','visibility','opportunity'])x[key]=CLAMP((effect[key]||0)*strength);
    this.applyEconomy(district,x);
    this.applyFactions(district,x);
    this.applyNPCs(district,x);
    this.state.effects[district]={...x,at:Date.now()};
  }
  applyEconomy(district,x){
    const eco=this.game.factionEconomy?.state;
    if(!eco?.factions)return;
    for(const f of Object.values(eco.factions)){
      if(f.district!==district)continue;
      f.activity=CLAMP(f.activity+x.economy*.035+x.commerce*.03);
      f.demand=CLAMP(f.demand+x.commerce*.018,.5,2);
      f.supply=CLAMP(f.supply+(x.transport+x.civic)*.01,.2,2);
      if(x.commerce>.055)f.capital=Math.min(20000,f.capital+35*x.commerce);
      const market=eco.markets?.[f.name];
      if(market)market.trend=CLAMP(market.trend+x.commerce*.012-x.economy*.004,-.35,.35);
    }
    if(x.commerce>.07)this.game.events.emit('economy:culture-pressure',{district,commerce:x.commerce,source:'culture'});
  }
  applyFactions(district,x){
    const dynamics=this.game.npcFactionDynamics?.state;
    const name=FACTION_BY_DISTRICT[district];
    if(!dynamics?.factions||!name)return;
    const f=dynamics.factions[name];
    if(!f)return;
    f.trust=CLAMP(f.trust+x.trust*.025);
    f.cohesion=CLAMP(f.cohesion+(x.social+x.civic)*.012);
    f.influence=CLAMP(f.influence+(x.faction||0)*.018+x.visibility*.008);
    f.momentum=CLAMP(f.momentum+(x.opportunity+x.commerce)*.012);
    if(cultureConflict(x.dominant,f.type))f.heat=CLAMP(f.heat+.008);
    this.game.events.emit('faction:culture-signal',{faction:name,district,culture:x.dominant,trust:f.trust,influence:f.influence});
  }
  applyNPCs(district,x){
    const sys=this.game.npcSocialIntelligence;
    const npcs=this.game.npcs?.npcs||[];
    if(!sys)return;
    for(const n of npcs){
      const nd=n.district||'default';
      if(nd!==district||!n.active)continue;
      const s=sys.ensure(n);
      if(x.social>.04)s.needs.belonging=CLAMP(s.needs.belonging-x.social*.025);
      if(x.economy>.04)s.needs.purpose=CLAMP(s.needs.purpose-x.economy*.018);
      if(x.civic>.04)s.needs.safety=CLAMP(s.needs.safety-x.civic*.02);
      if(x.transport>.04)s.needs.money=CLAMP(s.needs.money-x.transport*.012);
      s.trust=CLAMP(s.trust+(x.trust*.015));
      s.curiosity=CLAMP(s.curiosity+x.opportunity*.018);
      if(x.social>.07&&s.trait==='social')s.mood='confident';
      if(x.civic>.07&&s.stress>.6)s.mood='alert';
    }
  }
  update(dt){
    this.tick+=dt;if(this.tick<6)return;this.tick=0;
    for(const d of DISTRICTS)this.applyDistrict(d);
    this.state.interventions++;
    this.state.updatedAt=Date.now();this.sync();
    const active=Object.values(this.state.effects).filter(x=>x.intensity>.45);
    this.game.events.emit('culture:world-impact',{districts:DISTRICTS.length,active:active.length,interventions:this.state.interventions});
  }
  modifiers(district){const x=this.ensure(district);return{culture:x.dominant,intensity:x.intensity,economy:x.economy,social:x.social,trust:x.trust,opportunity:x.opportunity};}
  sync(){this.game.state.update({cultureWorldBridge:this.state});}
}
function cultureConflict(culture,type){
  if(!culture||!type)return false;
  if(type==='civic'&&['hustle','nightlife'].includes(culture))return true;
  if(type==='commerce'&&culture==='independence')return true;
  return false;
}