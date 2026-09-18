export class WorldIntegrationCoordinatorSystem{
constructor(game){this.game=game;this.state=game.state.get().worldIntegration||{events:0,bridges:0,health:1,lastDecision:null,updatedAt:0};this.bind();this.sync();}
bind(){
 const bridge=(source,target,fn)=>this.game.events.on(source,e=>{this.state.events++;this.state.bridges++;fn(e||{});});
 bridge('ai:director-v2-decision','ai:personalized-opportunity',e=>{this.state.lastDecision=e.action;this.game.events.emit('ai:execution-request',{...e,source:'director-v2'});});
 bridge('ai:personalized-opportunity','mission',e=>this.game.events.emit('mission:ai-opportunity',{...e}));
 bridge('mission:dynamic-generated','mission:lifecycle',e=>this.game.events.emit('mission:lifecycle-start',{...e}));
 bridge('mission:lifecycle-start','npc',e=>this.game.events.emit('npc:life-opportunity',{district:e.district||'KigaliCBD',style:e.style||'explorer'}));
 bridge('faction:economic-order-resolved','district:economy',e=>this.game.events.emit('district:economic-shift',{...e}));
 bridge('world:consequence','memory',e=>this.game.events.emit('world:memory-commit',{...e}));
 bridge('faction:war-campaign-resolved','memory',e=>this.game.events.emit('world:memory-commit',{...e}));
 bridge('district:governance-state','district',e=>this.game.events.emit('district:personality-shift',{...e}));
 bridge('vehicle:ability-used','vehicle',e=>this.game.events.emit('vehicle:identity-update',{...e}));
 bridge('city:crisis-start','persistence',e=>this.game.events.emit('world:persistence-request',{reason:'crisis-start',district:e.district}));
 bridge('city:crisis-resolved','persistence',e=>this.game.events.emit('world:persistence-request',{reason:'crisis-resolved',district:e.district}));
 bridge('world:day-changed','persistence',e=>this.game.events.emit('world:persistence-request',{reason:'day',day:e.day}));
}
update(dt){
 const s=this.game.state.get();
 const required=['worldBrain','worldResources','worldTime','districtSimulation'];
 const present=required.filter(k=>s[k]!=null).length;
 this.state.health=present/required.length;
 this.state.updatedAt=Date.now();
 this.sync();
}
sync(){this.game.state.update({worldIntegration:this.state});}
}