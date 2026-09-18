const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class DistrictGovernanceSystem{
 constructor(game){this.game=game;const s=game.state.get().districtGovernance||{};this.state=s.districts?{...s}:this.empty();this.bind();this.sync();}
 empty(){return{districts:{},services:{},history:[],updatedAt:0};}
 bind(){this.game.events.on('faction:war-campaign-resolved',e=>this.war(e));this.game.events.on('district:shock',e=>this.shock(e));this.game.events.on('city:response',e=>this.response(e));}
 district(d){return this.state.districts[d]||(this.state.districts[d]={district:d,stability:.7,services:.7,trust:.5,control:null,pressure:0});}
 war(e={}){if(!e.district)return;const d=this.district(e.district);d.stability=C(d.stability-(e.outcome==='peace'?.02:.12));d.pressure=C(d.pressure+.08);if(e.winner)d.control=e.winner;this.emit(d);}
 shock(e={}){const d=this.district(e.district);d.pressure=C(d.pressure+.1);d.stability=C(d.stability-.05);}
 response(e={}){const d=this.district(e.district);d.services=C(d.services+.05);d.stability=C(d.stability+.04);d.pressure=C(d.pressure-.08);this.emit(d);}
 emit(d){this.game.events.emit('district:governance-state',{...d});}
 update(dt){for(const d of Object.values(this.state.districts)){d.pressure=Math.max(0,d.pressure-dt*.01);d.stability=C(d.stability+(d.services-.6)*.002*dt);d.trust=C(d.trust+(d.stability-.5)*.001*dt);}this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({districtGovernance:this.state});}
}