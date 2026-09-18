const dist=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
export class OpportunityDiscoverySystem{
 constructor(game){this.game=game;this.available=new Map();this.discovered=new Set();this.accepted=new Set();this.tick=0;this.bind();}
 bind(){this.game.events.on('gameplay:opportunity',o=>this.register(o||{}));this.game.events.on('gameplay:opportunity-accept',o=>this.accept(o||{}));}
 register(o){if(o.id)this.available.set(o.id,{...o,createdAt:Date.now()});}
 accept(o){const id=o.id||o.opportunityId;if(!id)return;this.accepted.add(id);this.game.events.emit('opportunity:discovered',{id,district:o.district||null,accepted:true});}
 position(){const v=this.game.vehicles?.active;return v?.mesh?.position||this.game.player?.position||{x:0,y:0,z:0};}
 update(dt=.016){
  this.tick+=dt;if(this.tick<.5)return;this.tick=0;const p=this.position(),w=this.game.state.get().world||{};
  for(const [id,o] of this.available){if(this.accepted.has(id)||this.discovered.has(id))continue;const nearDistrict=o.district===w.district,nearPoint=o.x!=null&&o.z!=null&&dist(p,o)<=Number(o.discoveryRadius||45);if(nearDistrict||nearPoint){this.discovered.add(id);this.game.events.emit('opportunity:discovered',{...o,id,accepted:false});}}
  for(const [id,o] of this.available)if(Date.now()-(o.createdAt||Date.now())>120000)this.available.delete(id);
 }
}