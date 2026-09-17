const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const RESPONSE={
 traffic:{response:'reroute',traffic:.7,people:.25},
 economy:{response:'redistribute',goods:.65,money:.7},
 social:{response:'mobilize',people:.55,information:.8},
 safety:{response:'secure',traffic:.35,police:.8},
 weather:{response:'adapt',traffic:.45,people:.35},
 information:{response:'spread',information:.9,people:.3},
 activity:{response:'mobilize',people:.7,information:.55},
 shock:{response:'secure',traffic:.4,police:.85},
 trade:{response:'redistribute',goods:.75,money:.8},
 consequence:{response:'adapt',information:.5,social:.45}
};
export class CityResponseSystem{
 constructor(game,cascade,ecosystem){this.game=game;this.cascade=cascade;this.ecosystem=ecosystem;this.tick=0;this.state=game.state.get().cityResponse||{districts:{},active:[],adaptation:0,updatedAt:0};this.bind();this.sync();}
 bind(){this.game.events.on('city:cascade-wave',e=>this.respond(e.type,e.to,e.strength));this.game.events.on('city:cascade-player-signal',e=>this.game.events.emit('city:response-player-choice',{district:e.district,signals:e.signals}));}
 respond(type,district,strength){const r=RESPONSE[type]||RESPONSE.information;const n=this.state.districts[district]||(this.state.districts[district]={traffic:0,goods:0,money:0,people:0,information:0,police:0,response:r.response,pressure:0});for(const k of ['traffic','goods','money','people','information','police'])if(r[k])n[k]=CLAMP((n[k]||0)+r[k]*strength);n.response=r.response;n.pressure=CLAMP((n.pressure||0)+strength*.35);this.state.active.push({district,type,response:r.response,strength,at:Date.now()});this.state.active=this.state.active.slice(-24);this.game.events.emit('city:response',{district,type,response:r.response,strength,signals:{...n}});this.sync();}
 update(dt){this.tick+=dt;if(this.tick<2)return;const step=this.tick;this.tick=0;for(const n of Object.values(this.state.districts)){const decay=Math.pow(.82,step);for(const k of ['traffic','goods','money','people','information','police'])n[k]*=decay;n.pressure*=Math.pow(.88,step);}const vals=Object.values(this.state.districts).map(n=>n.pressure||0);this.state.adaptation=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;this.state.updatedAt=Date.now();this.state.active=this.state.active.filter(e=>Date.now()-e.at<30000);this.sync();if(this.state.adaptation>.65)this.game.events.emit('city:adaptive-state',{level:this.state.adaptation});}
 sync(){this.game.state.update({cityResponse:this.state});}
}
