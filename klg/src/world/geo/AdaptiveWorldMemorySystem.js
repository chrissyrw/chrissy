const CLAMP=(v,a=-100,b=100)=>Math.max(a,Math.min(b,v));
const TYPES=['choice','success','failure','help','trade','conflict','discovery'];

export class AdaptiveWorldMemorySystem{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().adaptiveWorldMemory||{};
    this.state=saved.players?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{players:{},districts:{},factions:{},npcs:{},signals:[],learning:{},updatedAt:0};}
  district(name){return String(name||this.game.state.get().world?.district||'Kigali');}
  ensurePlayer(){
    if(!this.state.players.player)this.state.players.player={choices:{},types:{},districts:{},streaks:{},risk:0,reliability:0,helpfulness:0};
    return this.state.players.player;
  }
  ensureDistrict(name){
    const d=this.district(name);
    return this.state.districts[d]||(this.state.districts[d]={choices:0,help:0,harm:0,trade:0,success:0,pressure:0,trust:0,memory:[]});
  }
  ensureFaction(name){
    if(!name)return null;
    return this.state.factions[name]||(this.state.factions[name]={choices:0,help:0,oppose:0,success:0,heat:0,trust:0});
  }
  bind(){
    this.game.events.on('player:choice-made',e=>this.choice(e));
    this.game.events.on('gameplay:chain-resolved',e=>this.chain(e));
    this.game.events.on('world:consequence',e=>this.consequence(e));
    this.game.events.on('faction:mission-resolved',e=>this.faction(e));
    this.game.events.on('faction:encounter-resolved',e=>this.factionChoice(e));
    this.game.events.on('npc:memory-recorded',e=>this.npc(e));
    this.game.events.on('cargo:delivery-arrived',e=>this.delivery(e,true));
    this.game.events.on('cargo:delivery-failed',e=>this.delivery(e,false));
  }
  choice(e={}){
    const p=this.ensurePlayer(),d=this.ensureDistrict(e.district),type=e.type||'unknown',option=e.option||'unknown';
    p.choices[option]=(p.choices[option]||0)+1;p.types[type]=(p.types[type]||0)+1;p.districts[this.district(e.district)]=(p.districts[this.district(e.district)]||0)+1;
    d.choices++;d.memory.unshift({kind:'choice',option,type,at:Date.now()});d.memory=d.memory.slice(0,16);
    const positive=['deliver','help','join','report','buy'].includes(option);
    const risky=['abandon','oppose'].includes(option);
    p.helpfulness=CLAMP(p.helpfulness+(positive?.035:risky?-.02:0),0,1);
    p.risk=CLAMP(p.risk+(risky?.04:positive?.005:0),0,1);
    this.learn(`choice:${type}:${option}`);
    this.sync();
  }
  chain(e={}){
    const p=this.ensurePlayer(),d=this.ensureDistrict(e.district);
    if(e.outcome==='success'){d.success++;p.reliability=CLAMP(p.reliability+.05,0,1);}
    if(e.outcome==='failure'){p.reliability=CLAMP(p.reliability-.06,0,1);d.pressure=CLAMP(d.pressure+.05,0,1);}
    this.learn(`chain:${e.type}:${e.outcome}`);
  }
  consequence(e={}){
    const d=this.ensureDistrict(e.district),rep=Number(e.rep||0);
    if(rep>0)d.help++;if(rep<0)d.harm++;
    d.pressure=CLAMP(d.pressure+(Number(e.heat||0)*.15)+(rep<0?.025:-.008),0,1);
    d.trust=CLAMP(d.trust+rep*.01);
    this.learn(rep>=0?'consequence:positive':'consequence:negative');
  }
  faction(e={}){
    const f=this.ensureFaction(e.faction);if(!f)return;
    f.choices++;if(e.success)f.success++;else f.heat=CLAMP(f.heat+.06);f.trust=CLAMP(f.trust+(e.success?.04:-.05));
    this.learn(`faction:${e.faction}:${e.success?'success':'failure'}`);
  }
  factionChoice(e={}){
    const f=this.ensureFaction(e.faction);if(!f)return;
    f.choices++;if(e.action==='avoid')f.trust=CLAMP(f.trust-.01);else f.trust=CLAMP(f.trust+.035);
    this.learn(`faction-choice:${e.action}`);
  }
  npc(e={}){
    const id=String(e.npcId||'');if(!id)return;
    this.state.npcs[id]=this.state.npcs[id]||{memories:0,trust:0,reputation:0};
    const n=this.state.npcs[id];n.memories++;n.trust=CLAMP(n.trust+Number(e.trust||0)*.01);n.reputation=CLAMP(n.reputation+Number(e.reputation||0)*.04);
  }
  delivery(e={},success){
    const p=this.ensurePlayer();p.reliability=CLAMP(p.reliability+(success?.06:-.08),0,1);this.learn(success?'delivery:success':'delivery:failure');
  }
  learn(key){this.state.learning[key]=(this.state.learning[key]||0)+1;}
  profile(){
    const p=this.ensurePlayer(),choices=Object.entries(p.choices).sort((a,b)=>b[1]-a[1]);
    return{...p,topChoices:choices.slice(0,5),districtBias:Object.entries(p.districts).sort((a,b)=>b[1]-a[1]).slice(0,5)};
  }
  modifiers(district,type){
    const p=this.ensurePlayer(),d=this.ensureDistrict(district);
    const choiceCount=p.choices[type]||0;
    const reliability=p.reliability;
    const trust=d.trust;
    return{opportunityBias:CLAMP(.15+reliability*.35+choiceCount*.02,0,1),riskBias:CLAMP(.5+p.risk*.45-d.trust*.12,0,1),districtTrust:trust};
  }
  update(dt){
    this.tick+=dt;if(this.tick<4)return;this.tick=0;
    const now=Date.now();
    for(const d of Object.values(this.state.districts)){d.pressure*=Math.pow(.985,dt);d.trust*=Math.pow(.997,dt);}
    for(const f of Object.values(this.state.factions)){f.heat*=Math.pow(.94,dt);f.trust*=Math.pow(.998,dt);}
    this.state.updatedAt=now;this.sync();
    this.game.events.emit('world:memory-update',{profile:this.profile(),districts:Object.keys(this.state.districts).length,factions:Object.keys(this.state.factions).length});
  }
  sync(){this.game.state.update({adaptiveWorldMemory:this.state});}
}
