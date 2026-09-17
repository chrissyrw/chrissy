const CLAMP=(v,a=-100,b=100)=>Math.max(a,Math.min(b,v));
const DISTRICT_ALIASES={CBD:'KigaliCBD',NYAMIRAMBO:'Nyamirambo',KIMIRONKO:'Kimironko',REMERA:'Remera',KACYIRU:'Kacyiru',NYARUTARAMA:'Nyarutarama',KICUKIRO:'Kicukiro',KANOMBE:'Kanombe'};
const MEMORY_TYPES=['met','helped','harmed','traded','rescued','betrayed','shared'];
const EVENT_MAP={accepted:'helped',resolved:'shared',rejected:'betrayed',consequence:'harmed',encounter:'met',trade:'traded',rescue:'rescued'};

export class NPCMemoryReputationSystem{
  constructor(game){
    this.game=game;
    const saved=game.state.get().npcMemoryReputation||{};
    this.state=saved.npcs?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{npcs:{},districts:{},events:[],network:{},updatedAt:0};}
  alias(name){const key=String(name||'').toUpperCase();return DISTRICT_ALIASES[key]||name||'default';}
  ensure(npc){
    const id=String(npc?.id??npc?.npcId??'unknown');
    if(!this.state.npcs[id])this.state.npcs[id]={id,trust:0,reputation:0,memories:[],visits:0,lastSeen:0,flags:{}};
    return this.state.npcs[id];
  }
  district(name){
    const d=this.alias(name);
    if(!this.state.districts[d])this.state.districts[d]={reputation:0,trust:0,events:0,helped:0,harmed:0,rumor:0};
    return this.state.districts[d];
  }
  bind(){
    this.game.events.on('social:encounter',e=>this.playerEvent('encounter',e));
    this.game.events.on('opportunity:accepted',e=>this.playerEvent('accepted',e));
    this.game.events.on('opportunity:resolved',e=>this.playerEvent('resolved',e));
    this.game.events.on('opportunity:rejected',e=>this.playerEvent('rejected',e));
    this.game.events.on('world:consequence',e=>this.playerEvent('consequence',e));
    this.game.events.on('npc:social-interaction',e=>this.npcInteraction(e));
    this.game.events.on('npc:social-decision',e=>this.touch(e.npcId,e.district));
    this.game.events.on('relationships:changed',e=>this.relationshipSignal(e));
  }
  playerId(e={}){return String(e.npcId||e.playerId||e.callsign||e.id||e.name||'city');}
  remember(id,type,district,data={}){
    if(!MEMORY_TYPES.includes(type))return;
    const n=this.state.npcs[id]||(this.state.npcs[id]={id,trust:0,reputation:0,memories:[],visits:0,lastSeen:0,flags:{}});
    const delta={met:2,helped:10,harmed:-12,traded:5,rescued:14,betrayed:-18,shared:4}[type]||0;
    n.trust=CLAMP(n.trust+delta*.35);n.reputation=CLAMP(n.reputation+delta);
    const memory={type,district:this.alias(district),at:Date.now(),note:data.note||type};
    const duplicate=n.memories.find(m=>m.type===type&&m.district===memory.district&&Date.now()-m.at<45000);
    if(!duplicate)n.memories.unshift(memory);
    n.memories=n.memories.slice(0,20);n.lastSeen=Date.now();n.visits++;
    const d=this.district(district);d.events++;d.reputation=CLAMP(d.reputation+delta*.12);d.trust=CLAMP(d.trust+delta*.008);
    if(type==='helped'||type==='rescued')d.helped++;if(type==='harmed'||type==='betrayed')d.harmed++;
    this.spread(district,id,delta*.08);
    this.state.events.push({id,type,district:this.alias(district),delta,at:Date.now()});this.state.events=this.state.events.slice(-48);
    this.game.events.emit('npc:memory-recorded',{npcId:id,type,district:this.alias(district),trust:n.trust,reputation:n.reputation});
  }
  playerEvent(kind,e={}){
    const id=this.playerId(e);if(id==='city')return;
    this.remember(id,EVENT_MAP[kind]||kind,e.district||this.game.state.get().world?.district,{note:e.name||e.type||kind});
  }
  npcInteraction(e={}){
    const district=e.district||this.game.state.get().world?.district;
    const type=e.type==='help'||e.type==='cooperation'?'helped':e.type==='rivalry'?'betrayed':'met';
    if(e.a)this.remember(String(e.a),type,district);
    if(e.b)this.remember(String(e.b),type,district);
  }
  relationshipSignal(e={}){
    const links=e.links||{};
    const reputation=Object.values(links).reduce((sum,v)=>sum+Number(v||0),0);
    this.game.state.update({playerReputation:Math.round(reputation)});
  }
  touch(id,district){if(!id)return;const n=this.ensure({id});n.lastSeen=Date.now();if(district)n.district=this.alias(district);}
  spread(origin,id,amount){
    const from=this.alias(origin);const edges=this.game.districtEcosystem?.state?.edges||[];
    const targets=new Set(edges.filter(e=>e.from===from||e.to===from).map(e=>e.from===from?e.to:e.from));
    for(const target of targets){
      const edge=edges.find(e=>(e.from===from&&e.to===target)||(e.to===from&&e.from===target));
      const flow=Math.max(0,Math.min(1,Number(edge?.total||1)/12));
      const d=this.district(target);d.rumor=Math.max(0,Math.min(100,d.rumor+Math.abs(amount)*(.18+flow*.22)));d.reputation=CLAMP(d.reputation+amount*(.05+flow*.08));
      this.state.network[`${from}->${target}`]={source:id,strength:Math.abs(amount)*flow,updatedAt:Date.now()};
    }
  }
  reputation(id){return Math.round(this.state.npcs[String(id)]?.reputation||0);}
  trust(id){return Math.round(this.state.npcs[String(id)]?.trust||0);}
  profile(id){const n=this.state.npcs[String(id)];if(!n)return null;return{reputation:n.reputation,trust:n.trust,memories:[...n.memories],lastSeen:n.lastSeen};}
  update(dt){
    for(const n of Object.values(this.state.npcs)){n.trust*=Math.pow(.997,dt);n.reputation*=Math.pow(.999,dt);}
    for(const d of Object.values(this.state.districts)){d.rumor*=Math.pow(.88,dt);d.trust*=Math.pow(.995,dt);}
    this.state.updatedAt=Date.now();this.sync();
    const values=Object.values(this.state.npcs);
    this.game.events.emit('npc:reputation-network',{tracked:values.length,positive:values.filter(n=>n.reputation>20).length,negative:values.filter(n=>n.reputation<-20).length});
  }
  sync(){this.game.state.update({npcMemoryReputation:this.state});}
}
