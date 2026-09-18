const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class SeasonalWorldAdaptationSystem{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().seasonalWorldAdaptation||{};
    this.state=saved.districts?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{districts:{},economy:0,traffic:0,social:0,faction:0,logistics:0,opportunities:0,weather:0,cycles:0,updatedAt:0};}
  ensure(d){
    if(!this.state.districts[d])this.state.districts[d]={district:d,traffic:0,social:0,economy:0,faction:0,logistics:0,opportunity:0,weather:0};
    return this.state.districts[d];
  }
  bind(){
    this.game.events.on('world:season-state',e=>this.apply(e));
    this.game.events.on('world:season-change',e=>this.transition(e));
    this.game.events.on('world:macro-cycle',e=>this.apply(e));
  }
  apply(e={}){
    const m=e.modifiers||{},season=e.season||this.game.worldSeasonCycle?.state?.season||{},macro=e.macro||{};
    const scale={
      economy:Math.max(.7,Number(m.economy||1)),
      social:Math.max(.7,Number(m.social||1)),
      logistics:Math.max(.7,Number(m.logistics||1)),
      faction:Math.max(.7,Number(m.faction||1)),
      traffic:Math.max(.7,Number(m.traffic||1)),
      commerce:Math.max(.7,Number(m.commerce||1)),
      visibility:Math.max(.7,Number(m.visibility||1)),
      heat:Math.max(.7,Number(m.heat||1)),
      exploration:Math.max(.7,Number(m.exploration||1))
    };
    this.state.economy=CLAMP(this.state.economy*.85+(scale.economy-1)*.5+.5);
    this.state.social=CLAMP(this.state.social*.85+(scale.social-1)*.5+.5);
    this.state.logistics=CLAMP(this.state.logistics*.85+(scale.logistics-1)*.5+.5);
    this.state.faction=CLAMP(this.state.faction*.85+(scale.faction-1)*.5+.5);
    this.state.traffic=CLAMP(this.state.traffic*.85+(scale.traffic-1)*.5+.5);
    this.state.opportunities=CLAMP(this.state.opportunities*.85+((scale.economy+scale.social+scale.exploration)/3-1)*.5+.5);
    this.state.weather=season.weather||'mixed';
    const district=this.game.state.get().world?.district||'default';
    const d=this.ensure(district);
    d.traffic=CLAMP(d.traffic*.75+(scale.traffic-1)*.5+.5);
    d.social=CLAMP(d.social*.75+(scale.social-1)*.5+.5);
    d.economy=CLAMP(d.economy*.75+(scale.economy-1)*.5+.5);
    d.faction=CLAMP(d.faction*.75+(scale.faction-1)*.5+.5);
    d.logistics=CLAMP(d.logistics*.75+(scale.logistics-1)*.5+.5);
    d.opportunity=CLAMP(d.opportunity*.75+(scale.exploration-1)*.5+.5);
    d.weather=season.weather||d.weather;
    this.emitEffects(district,scale,season,macro);
  }
  transition(e={}){
    this.state.cycles++;
    this.game.events.emit('seasonal:world-shift',{season:e.season,modifiers:e.modifiers,weather:e.season?.weather||'mixed'});
  }
  emitEffects(district,s,season,macro){
    if(s.traffic>1.04)this.game.events.emit('traffic:seasonal-pressure',{district,intensity:CLAMP((s.traffic-1)*2),source:'season'});
    if(s.logistics>1.04)this.game.events.emit('cargo:seasonal-flow',{district,bonus:s.logistics,source:'season'});
    if(s.economy>1.04||s.commerce>1.04)this.game.events.emit('economy:seasonal-shift',{district,bonus:Math.max(s.economy,s.commerce),source:'season'});
    if(s.social>1.04||s.visibility>1.04)this.game.events.emit('social:seasonal-wave',{district,intensity:CLAMP((s.social-1)*2),source:'season'});
    if(s.faction>1.04||s.heat>1.04)this.game.events.emit('faction:seasonal-pressure',{district,intensity:CLAMP(((s.faction||1)+(s.heat||1)-2)),source:'season'});
    if(s.exploration>1.04)this.game.events.emit('exploration:seasonal-window',{district,bonus:s.exploration,source:'season'});
    this.game.events.emit('world:seasonal-adaptation',{district,season:season.id||season.name,macro:macro.id||macro.name,modifiers:s});
  }
  update(dt){
    this.tick+=dt;if(this.tick<4)return;this.tick=0;
    const cycle=this.game.worldSeasonCycle?.state;
    if(cycle)this.apply(cycle);
    for(const d of Object.values(this.state.districts)){
      d.traffic=CLAMP(d.traffic*.96);d.social=CLAMP(d.social*.96);d.economy=CLAMP(d.economy*.96);d.faction=CLAMP(d.faction*.96);d.logistics=CLAMP(d.logistics*.96);d.opportunity=CLAMP(d.opportunity*.96);
    }
    this.state.updatedAt=Date.now();this.sync();
    this.game.events.emit('seasonal:adaptation-update',{cycles:this.state.cycles,economy:this.state.economy,social:this.state.social,logistics:this.state.logistics,opportunities:this.state.opportunities});
  }
  modifier(type,fallback=1){return Number(this.state[type]??fallback);}
  profile(d='default'){return this.ensure(d);}
  sync(){this.game.state.update({seasonalWorldAdaptation:this.state});}
}