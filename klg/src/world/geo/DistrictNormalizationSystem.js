export class DistrictNormalizationSystem {
  constructor(game){
    this.game=game;
    this.aliases={
      CBD:'KigaliCBD',KIGALI_CBD:'KigaliCBD',KIGALICBD:'KigaliCBD','KIGALI CBD':'KigaliCBD',
      KIMIRONKO:'Kimironko',KIMIRONKO_MARKET:'Kimironko',
      NYAMIRAMBO:'Nyamirambo',NYARUTARAMA:'Nyarutarama',
      REMERA:'Remera',KACYIRU:'Kacyiru',KICUKIRO:'Kicukiro',KANOMBE:'Kanombe',
      REBERO:'Rebero',KIMIHURURA:'Kimihurura'
    };
    this.state=game.state.get().districtNormalization||{resolved:0,updatedAt:0};
    this.bind();this.sync();
  }
  normalize(value){
    const raw=String(value||'').trim();
    if(!raw)return 'KigaliCBD';
    const key=raw.toUpperCase().replace(/-/g,'_');
    return this.aliases[key]||raw;
  }
  bind(){
    const normalizeEvent=(source,target)=>{
      this.game.events.on(source,e=>{
        const district=this.normalize(e?.district);
        this.state.resolved++;
        this.game.events.emit(target,{...(e||{}),district,districtKey:district.toUpperCase().replace(/[^A-Z0-9]+/g,'_')});
      });
    };
    normalizeEvent('ai:director-v2-decision','district:normalized-ai');
    normalizeEvent('ai:execution-request','district:normalized-ai-execution');
    normalizeEvent('mission:completed','district:normalized-mission');
    normalizeEvent('mission:failed','district:normalized-mission');
    normalizeEvent('npc:navigation-reroute','district:normalized-navigation');
    normalizeEvent('npc:navigation-opportunity','district:normalized-navigation');
    normalizeEvent('traffic:director','district:normalized-traffic');
    normalizeEvent('economy:mission-impact','district:normalized-economy');
  }
  update(dt){this.state.updatedAt=Date.now();this.sync();}
  sync(){this.game.state.update({districtNormalization:this.state});}
}
