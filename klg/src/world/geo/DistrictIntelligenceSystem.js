const DISTRICTS={
Kimironko:{type:'commerce',activity:1.25,traffic:1.2,social:1.25,night:.9,crime:.7,economy:1.3},
Nyamirambo:{type:'social',activity:1.15,traffic:1.1,social:1.45,night:1.2,crime:1.0,economy:1.05},
Kimihurura:{type:'business',activity:1.05,traffic:1.0,social:1.15,night:1.05,crime:.55,economy:1.45},
Kacyiru:{type:'civic',activity:.95,traffic:.9,social:.85,night:.7,crime:.45,economy:1.25},
Remera:{type:'transport',activity:1.2,traffic:1.35,social:1.1,night:1.05,crime:.75,economy:1.15},
KigaliCBD:{type:'urban',activity:1.35,traffic:1.3,social:1.2,night:1.25,crime:.6,economy:1.5},
default:{type:'mixed',activity:1,traffic:1,social:1,night:1,crime:.8,economy:1}
};
export class DistrictIntelligenceSystem{
 constructor(game){this.game=game;this.current='default';this.profile=DISTRICTS.default;this.state={name:'default',type:'mixed',activity:1,traffic:1,social:1,night:1,crime:.8,economy:1,heat:0};this.tick=0;}
 resolve(name){return DISTRICTS[name]||DISTRICTS.default;}
 setDistrict(name){if(name===this.current)return;this.current=name;this.profile=this.resolve(name);this.state={name,type:this.profile.type,...this.profile,heat:0};this.game.state.update({districtIntelligence:this.state});this.game.events.emit('district:intelligence',this.state);}
 update(dt){this.tick+=dt;if(this.tick<1)return;this.tick=0;const hour=this.game.state.get()?.world?.time?.hour??12;const night=(hour>=19||hour<6)?this.profile.night:1;const traffic=this.profile.traffic*((hour>=7&&hour<=9)||(hour>=16&&hour<=19)?1.25:1);const activity=this.profile.activity*(hour>=22||hour<6?.55:1);const heat=Math.max(0,Math.min(1,(this.profile.crime*.45+(traffic-1)*.35+(activity-1)*.2)));this.state={...this.state,activity,traffic,night,social:this.profile.social*night,economy:this.profile.economy,heat};this.game.state.update({districtIntelligence:this.state});}
 getSignals(){return{district:this.current,type:this.profile.type,activity:this.state.activity,traffic:this.state.traffic,social:this.state.social,night:this.state.night,economy:this.state.economy,heat:this.state.heat};}
 multiplier(key){return this.state[key]??1;}
}
