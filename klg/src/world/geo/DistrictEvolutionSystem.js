const BASE={Kimironko:'commerce',Nyamirambo:'social',Kimihurura:'business',Kacyiru:'civic',Remera:'transport',KigaliCBD:'urban',default:'mixed'};
export class DistrictEvolutionSystem{
 constructor(game,districtAI){this.game=game;this.ai=districtAI;this.history=game.state.get().districtEvolution||{};this.last=0;this.bind();}
 bind(){this.game.events.on('world:consequence',e=>this.record(e?.district,'consequence',e));this.game.events.on('opportunity:resolved',e=>this.record(e?.district,'opportunity',e));this.game.events.on('city:activity-signal',e=>this.record(e?.district,'signal',e));}
 name(value){return value||this.game.state.get().world?.district||'default';}
 ensure(name){if(!this.history[name])this.history[name]={visits:0,help:0,success:0,events:0,heat:0,lastChange:0};return this.history[name];}
 record(name,type,e={}){const m=this.ensure(this.name(name));m.events++;if(type==='opportunity')m.success++;if(type==='consequence'){m.help+=Number(e.rep||0)>0?1:0;m.heat+=Math.max(0,Number(e.heat||0));}m.lastChange=Date.now();this.sync();}
 visit(name){const m=this.ensure(this.name(name));m.visits++;this.sync();}
 profile(name){const key=this.name(name),m=this.ensure(key),base=BASE[key]||BASE.default;const trust=Math.min(1,m.help/10),pressure=Math.min(1,m.heat/10),momentum=Math.min(1,(m.success+m.events)/20);let tone=base;if(pressure>.65)tone='tense';else if(trust>.65)tone='welcoming';else if(momentum>.7)tone='booming';return{name:key,type:base,tone,trust,pressure,momentum,visits:m.visits,events:m.events};}
 update(dt){this.last+=dt;if(this.last<2)return;this.last=0;const district=this.game.state.get().world?.district||this.ai.current||'default';this.visit(district);const p=this.profile(district);this.game.state.update({districtEvolution:{...this.history,current:p}});this.game.events.emit('district:evolved',p);}
 sync(){this.game.state.update({districtEvolution:this.history});}
}
