const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class LongTermWorldPersistenceSystem{
  constructor(game){
    this.game=game;this.tick=0;this.snapshotTick=0;
    const saved=game.state.get().longTermWorldPersistence||{};
    this.state=saved.worldAge!=null?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{worldAge:0,simulationDays:0,cycles:0,lastPersisted:0,baseline:{},districts:{},factions:{},economy:{},history:{chapters:0,legends:0,scars:0},snapshots:[],drift:0,continuity:1,updatedAt:0};}
  bind(){
    this.game.events.on('world:timeline-update',e=>this.observeTimeline(e));
    this.game.events.on('world:history-update',e=>this.observeHistory(e));
    this.game.events.on('world:historical-ripple',e=>this.observeRipple(e));
    this.game.events.on('culture:world-impact',e=>this.observeDistrict(e));
    this.game.events.on('faction:culture-signal',e=>this.observeFaction(e));
    this.game.events.on('economy:culture-pressure',e=>this.observeEconomy(e));
  }
  ensureDistrict(d){
    if(!this.state.districts[d])this.state.districts[d]={district:d,pressure:0,legacy:0,commerce:0,social:0,safety:0,activity:0,drift:0};
    return this.state.districts[d];
  }
  ensureFaction(f){
    if(!this.state.factions[f])this.state.factions[f]={faction:f,influence:0,heat:0,trust:.35,activity:0};
    return this.state.factions[f];
  }
  observeTimeline(e={}){
    this.state.drift=CLAMP(this.state.drift*.9+Number(e.causality||0)*.1);
    if(e.strongest)this.ensureDistrict(e.strongest).activity=CLAMP(this.ensureDistrict(e.strongest).activity+.03);
  }
  observeHistory(e={}){
    this.state.history={chapters:Number(e.chapters||0),legends:Number(e.legends||0),scars:Number(e.scars||0)};
  }
  observeRipple(e={}){
    const d=this.ensureDistrict(e.district||'default'),s=CLAMP(Number(e.strength||0));
    d.drift=CLAMP(d.drift+s*.08);d.pressure=CLAMP(d.pressure+s*.04);
    this.state.drift=CLAMP(this.state.drift+s*.02);
  }
  observeDistrict(e={}){
    const d=this.ensureDistrict(e.district||'default'),s=CLAMP(Number(e.intensity||e.strength||e.opportunity||0));
    d.activity=CLAMP(d.activity+s*.05);d.commerce=CLAMP(d.commerce+Number(e.economy||0)*.02);
  }
  observeFaction(e={}){
    const f=this.ensureFaction(e.faction||e.name||'unknown'),s=CLAMP(Number(e.intensity||e.strength||e.momentum||0));
    f.activity=CLAMP(f.activity+s*.05);f.heat=CLAMP(f.heat+s*.03);
  }
  observeEconomy(e={}){
    const d=this.ensureDistrict(e.district||'default'),s=CLAMP(Number(e.intensity||e.pressure||e.strength||0));
    d.commerce=CLAMP(d.commerce+s*.04);this.state.economy.pressure=CLAMP((this.state.economy.pressure||0)*.95+s*.05);
  }
  ingestLive(){
    const s=this.game.state.get(),timeline=s.livingCityTimeline||{},history=s.persistentWorldHistory||{};
    for(const d of DISTRICTS){
      const h=history.districts?.[d]||{},t=timeline.districts?.[d]||{};
      const x=this.ensureDistrict(d);
      x.pressure=CLAMP((h.pressure||0)*.55+(t.pressure||0)*.45);
      x.legacy=CLAMP((t.legacy||0));
      x.commerce=CLAMP((t.commerce||0));
      x.social=CLAMP((t.social||0));
      x.safety=CLAMP((t.safety||0));
      x.activity=CLAMP(x.activity*.8+(h.events||0)/80*.2);
      x.drift=CLAMP(x.drift*.9+(t.change||0)*.1);
    }
    this.state.history={chapters:history.chapters?.length||0,legends:history.legends?.length||0,scars:history.scars?.length||0};
  }
  snapshot(){
    const snap={at:Date.now(),worldAge:this.state.worldAge,simulationDays:this.state.simulationDays,districts:Object.fromEntries(Object.entries(this.state.districts).map(([k,v])=>[k,{...v}])),history:{...this.state.history}};
    this.state.snapshots.unshift(snap);this.state.snapshots=this.state.snapshots.slice(0,12);
    this.state.lastPersisted=snap.at;
  }
  update(dt){
    this.tick+=dt;this.snapshotTick+=dt;
    this.state.worldAge+=dt;
    this.state.simulationDays=this.state.worldAge/86400;
    if(this.tick>=15){
      this.tick=0;this.ingestLive();
      for(const d of Object.values(this.state.districts)){
        d.pressure=CLAMP(d.pressure*.992);d.legacy=CLAMP(d.legacy*.999);d.commerce=CLAMP(d.commerce*.996);d.social=CLAMP(d.social*.996);d.safety=CLAMP(d.safety*.997);d.activity=CLAMP(d.activity*.995);d.drift=CLAMP(d.drift*.99);
      }
      for(const f of Object.values(this.state.factions)){f.heat=CLAMP(f.heat*.994);f.activity=CLAMP(f.activity*.996);}
      this.state.cycles++;this.state.continuity=CLAMP(.92+Math.min(.08,this.state.cycles/10000));
      this.state.updatedAt=Date.now();
      this.game.events.emit('world:persistence-cycle',{worldAge:this.state.worldAge,simulationDays:this.state.simulationDays,cycles:this.state.cycles,continuity:this.state.continuity});
    }
    if(this.snapshotTick>=60){this.snapshotTick=0;this.snapshot();}
    this.sync();
  }
  profile(d='default'){return this.ensureDistrict(d);}
  sync(){this.game.state.update({longTermWorldPersistence:this.state});}
}