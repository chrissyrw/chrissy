const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewProtectionEconomySystem{
 constructor(game){this.game=game;this.state=game.state.get().crewProtection||{districts:{},updatedAt:0};this.bind();this.sync();}
 bind(){this.game.events.on('crew:territory-controlled',e=>this.register(e));this.game.events.on('crew:rivalry-started',e=>this.heat(e));}
 register(e={}){if(!e.crewId||!e.district)return;this.state.districts[e.district]={crewId:e.crewId,fee:25,coverage:.35,trust:.45,heat:0};this.game.events.emit('crew:protection-offer',this.state.districts[e.district]);this.sync();}
 heat(e={}){const d=this.state.districts[e.district];if(d)d.heat=CLAMP(d.heat+.12);}
 collect(district,success=true){const d=this.state.districts[district];if(!d)return;if(success){d.coverage=CLAMP(d.coverage+.03);d.trust=CLAMP(d.trust+.02);this.game.events.emit('crew:protection-collected',{district,crewId:d.crewId,amount:d.fee});}else{d.trust=CLAMP(d.trust-.06);this.game.events.emit('crew:protection-failed',{district,crewId:d.crewId});}this.sync();}
 update(dt){for(const d of Object.values(this.state.districts))d.heat=CLAMP(d.heat-.01*dt);this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewProtection:this.state});}
}