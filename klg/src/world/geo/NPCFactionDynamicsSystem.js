const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const STATES=['stable','rising','strained','fragmented','dominant'];

export class NPCFactionDynamicsSystem{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().npcFactionDynamics||{};
    this.state=saved.factions?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{factions:{},alliances:{},rivalries:{},territories:{},events:[],cityInfluence:0,updatedAt:0};}
  bind(){
    this.game.events.on('npc:faction-joined',e=>this.touch(e.faction,.03));
    this.game.events.on('npc:faction-left',e=>this.touch(e.faction,-.04));
    this.game.events.on('npc:relationship-network',e=>this.networkSignal(e));
    this.game.events.on('npc:memory-recorded',e=>this.memorySignal(e));
    this.game.events.on('district:trade-opportunity',e=>this.opportunity(e));
    this.game.events.on('world:consequence',e=>this.consequence(e));
  }
  ensure(name,data={}){
    if(!name)return null;
    if(!this.state.factions[name])this.state.factions[name]={name,members:0,influence:.2,cohesion:.5,trust:.35,heat:0,momentum:0,state:'stable',opportunities:0};
    return this.state.factions[name];
  }
  touch(name,amount=0){const f=this.ensure(name);if(!f)return;f.momentum=CLAMP(f.momentum+amount);f.influence=CLAMP(f.influence+amount*.5);this.sync();}
  relation(a,b,type='rivalry',strength=.2){
    if(!a||!b||a===b)return;
    const key=[a,b].sort().join(':');
    const target=type==='alliance'?this.state.alliances:this.state.rivalries;
    const r=target[key]||(target[key]={a,b,strength:0,updatedAt:Date.now()});
    r.strength=CLAMP(r.strength+strength);r.updatedAt=Date.now();
  }
  networkSignal(e={}){
    const factions=this.game.npcRelationshipWeb?.state?.factions||{};
    for(const [name,src] of Object.entries(factions)){const f=this.ensure(name);f.members=src.members?.length||0;f.cohesion=CLAMP(Number(src.cohesion||f.cohesion));f.heat=CLAMP(Number(src.heat||0));f.influence=CLAMP(Number(src.influence||f.influence));}
    this.resolveRelations();
  }
  resolveRelations(){
    const fs=Object.values(this.state.factions);
    for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++){
      const a=fs[i],b=fs[j],overlap=Math.min(a.influence,b.influence);
      if(a.heat<.35&&b.heat<.35&&Math.abs(a.influence-b.influence)<.18)this.relation(a.name,b.name,'alliance',.01);
      else if(overlap>.18)this.relation(a.name,b.name,'rivalry',.015);
    }
  }
  memorySignal(e={}){
    const n=this.game.npcRelationshipWeb?.state?.nodes?.[String(e.npcId)];
    if(!n?.faction)return;
    const f=this.ensure(n.faction);const rep=Number(e.reputation||0);
    if(rep>10){f.trust=CLAMP(f.trust+.02);f.influence=CLAMP(f.influence+.012);}
    if(rep<-10){f.heat=CLAMP(f.heat+.025);f.cohesion=CLAMP(f.cohesion-.015);}
  }
  opportunity(e={}){const district=e.from||e.to||e.district;for(const f of Object.values(this.state.factions)){if(f.district===district||this.game.npcRelationshipWeb?.state?.factions?.[f.name]?.district===district){f.opportunities++;f.momentum=CLAMP(f.momentum+.04);}}}
  consequence(e={}){const district=e.district;for(const [name,src] of Object.entries(this.game.npcRelationshipWeb?.state?.factions||{})){if(src.district===district){const f=this.ensure(name);f.heat=CLAMP(f.heat+Number(e.heat||0)*.15);f.cohesion=CLAMP(f.cohesion-Number(e.heat||0)*.05);}}}
  territory(name,district){if(!name||!district)return;const current=this.state.territories[district];if(!current||current.influence<this.ensure(name).influence)this.state.territories[district]={faction:name,influence:this.ensure(name).influence,updatedAt:Date.now()};}
  update(dt){
    this.tick+=dt;if(this.tick<4)return;const step=this.tick;this.tick=0;
    const fs=Object.values(this.state.factions);
    for(const f of fs){
      f.momentum*=Math.pow(.94,step);f.heat*=Math.pow(.9,step);f.trust*=Math.pow(.98,step);
      f.influence=CLAMP(f.influence+(f.members/20)*.01*step+f.momentum*.004*step-f.heat*.006*step);
      f.cohesion=CLAMP(f.cohesion+(f.trust-.35)*.01*step-f.heat*.008*step);
      f.state=f.heat>.72?'fragmented':f.cohesion<.3?'strained':f.influence>.82?'dominant':f.momentum>.55?'rising':'stable';
      const src=this.game.npcRelationshipWeb?.state?.factions?.[f.name];if(src?.district)this.territory(f.name,src.district);
    }
    for(const r of Object.values(this.state.rivalries))r.strength*=Math.pow(.995,step);
    for(const r of Object.values(this.state.alliances))r.strength*=Math.pow(.997,step);
    this.state.cityInfluence=fs.length?fs.reduce((a,f)=>a+f.influence,0)/fs.length:0;
    this.state.updatedAt=Date.now();this.state.events=this.state.events.slice(-48);this.sync();
    this.game.events.emit('npc:faction-dynamics',{factions:fs.length,dominant:fs.filter(f=>f.state==='dominant').length,fragmented:fs.filter(f=>f.state==='fragmented').length,influence:this.state.cityInfluence});
    for(const f of fs)if(f.state==='rising'&&f.opportunities>0)this.game.events.emit('faction:opportunity',{faction:f.name,opportunities:f.opportunities,influence:f.influence});
  }
  profile(name){return this.state.factions[name]?{...this.state.factions[name]}:null;}
  sync(){this.game.state.update({npcFactionDynamics:this.state});}
}
