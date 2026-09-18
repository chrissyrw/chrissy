const C=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
export class PlayerInfluenceEconomySystem{
 constructor(game){this.game=game;const s=game.state.get().playerInfluenceEconomy||{};this.state=s.influence!==undefined?{...s}:this.empty();this.bind();this.sync();}
 empty(){return{influence:0,capital:0,contacts:0,investments:{},history:[],updatedAt:0};}
 bind(){this.game.events.on('faction:diplomacy-update',e=>this.diplomacy(e));this.game.events.on('faction:war-campaign-resolved',e=>this.war(e));this.game.events.on('player:choice-made',e=>this.choice(e));}
 diplomacy(e={}){this.state.influence=C(this.state.influence+(e.pact==='alliance'?3:1));this.state.contacts=C(this.state.contacts+1);}
 war(e={}){this.state.capital=Math.max(0,this.state.capital+(e.playerRole==='mediator'?500:150));this.state.influence=C(this.state.influence+(e.playerRole==='mediator'?8:2));}
 choice(e={}){if(e.option==='mediate'||e.choice==='mediate'){this.state.influence=C(this.state.influence+4);this.state.contacts=C(this.state.contacts+1);}}
 update(dt){this.state.capital=Math.max(0,this.state.capital+this.state.influence*.001*dt);this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({playerInfluenceEconomy:this.state});}
}