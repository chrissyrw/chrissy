const C=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
export class FactionInfluenceNetworkSystem{
 constructor(game){this.game=game;const s=game.state.get().factionInfluence||{};this.state=s.nodes?{...s}:this.empty();this.bind();this.sync();}
 empty(){return{nodes:{},links:{},history:[],updatedAt:0};}
 bind(){this.game.events.on('faction:diplomacy-update',e=>this.diplomacy(e));this.game.events.on('faction:war-campaign-resolved',e=>this.war(e));this.game.events.on('player:choice-made',e=>this.player(e));}
 node(n){return this.state.nodes[n]||(this.state.nodes[n]={faction:n,influence:20,legitimacy:50,heat:0});}
 diplomacy(e={}){if(!e.a||!e.b)return;const a=this.node(e.a),b=this.node(e.b);a.influence=C(a.influence+(e.pact==='alliance'?4:1));b.influence=C(b.influence+(e.pact==='alliance'?4:1));this.link(e.a,e.b,e.trust||0);}
 link(a,b,trust){this.state.links[[a,b].sort().join('::')]={a,b,trust,strength:C((trust+1)*50)};}
 war(e={}){if(e.winner){const w=this.node(e.winner);w.influence=C(w.influence+7);w.legitimacy=C(w.legitimacy+4);}}
 player(e={}){if(e.faction){const n=this.node(e.faction);n.influence=C(n.influence+Number(e.rep||0)*.2);}}
 update(dt){for(const n of Object.values(this.state.nodes)){n.heat=Math.max(0,n.heat-dt*.002);n.legitimacy=C(n.legitimacy+(n.influence>50?.01:-.01)*dt);}this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({factionInfluence:this.state});}
}