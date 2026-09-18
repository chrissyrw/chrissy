const C=(v,a=-1,b=1)=>Math.max(a,Math.min(b,v));
export class FactionDiplomacySystem{
 constructor(game){this.game=game;this.tick=0;const s=game.state.get().factionDiplomacy||{};this.state=s.pacts?{...s}:this.empty();this.bind();this.sync();}
 empty(){return{pacts:{},trust:{},leverage:{},history:[],updatedAt:0};}
 bind(){this.game.events.on('faction:war-campaign-resolved',e=>this.warResolved(e));this.game.events.on('faction:conflict-choice',e=>this.choice(e));this.game.events.on('faction:economic-order-resolved',e=>this.trade(e));}
 pair(a,b){return[a,b].sort().join('::');}
 ensure(a,b){const k=this.pair(a,b);if(!this.state.pacts[k])this.state.pacts[k]={a:[a,b].sort()[0],b:[a,b].sort()[1],trust:0,pact:'none',leverage:0};return this.state.pacts[k];}
 warResolved(e={}){if(!e.a||!e.b)return;const p=this.ensure(e.a,e.b);p.trust=C(p.trust+(e.outcome==='peace'?.22:-.08));if(e.outcome==='peace')p.pact='peace';this.record(p,'war-resolved');}
 choice(e={}){const c=e.conflict||{};if(!c.a||!c.b)return;const p=this.ensure(c.a,c.b);if(e.choice==='mediate')p.trust=C(p.trust+.1);if(e.choice==='betray')p.trust=C(p.trust-.18);this.updatePact(p);}
 trade(e={}){if(!e.faction||!e.partner)return;const p=this.ensure(e.faction,e.partner);p.trust=C(p.trust+.04);p.leverage=C(p.leverage+.03);this.updatePact(p);}
 updatePact(p){if(p.trust>.65)p.pact='alliance';else if(p.trust>.35)p.pact='non-aggression';else if(p.trust<-.45)p.pact='rivalry';}
 record(p,source){this.state.history.unshift({pair:p.a+'::'+p.b,pact:p.pact,trust:p.trust,source,at:Date.now()});this.state.history=this.state.history.slice(0,80);this.game.events.emit('faction:diplomacy-update',{...p});}
 update(dt){this.tick+=dt;if(this.tick<4)return;this.tick=0;for(const p of Object.values(this.state.pacts))p.trust*=.999;this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({factionDiplomacy:this.state});}
}