const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];
const CULTURES={
  Kimironko:['trade','hustle','reliability'],
  Nyamirambo:['community','nightlife','loyalty'],
  Kimihurura:['business','status','networking'],
  Kacyiru:['civic','order','service'],
  Remera:['mobility','speed','coordination'],
  KigaliCBD:['ambition','commerce','visibility'],
  Rebero:['grit','hillcraft','independence']
};
const MEMORY_TYPES=['help','harm','trade','rescue','rivalry','discovery','reliability','betrayal'];

export class EmergentCultureSystem{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().emergentCulture||{};
    this.state=saved.districts?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{districts:{},players:{},npcs:{},rumors:[],trends:[],signals:[],updatedAt:0};}
  bind(){
    this.game.events.on('society:collective-update',e=>this.society(e));
    this.game.events.on('society:collective-decision',e=>this.collective(e));
    this.game.events.on('player:choice-made',e=>this.choice(e));
    this.game.events.on('world:consequence-effect',e=>this.consequence(e));
    this.game.events.on('consequence:world-effect',e=>this.consequence(e));
    this.game.events.on('npc:social-interaction',e=>this.social(e));
    this.game.events.on('npc:memory-update',e=>this.memory(e));
    this.game.events.on('player:memory-update',e=>this.memory(e));
    this.game.events.on('faction:alignment-update',e=>this.faction(e));
    this.game.events.on('district:collective-trade',e=>this.trade(e));
  }
  ensureDistrict(district){
    if(!this.state.districts[district])this.state.districts[district]={district,identity:CULTURES[district]||['mixed','adaptation','community'],dominant:'community',norms:{},values:{},status:0,trust:.35,visibility:.2,trend:0};
    return this.state.districts[district];
  }
  ensurePlayer(id='player'){
    if(!this.state.players[id])this.state.players[id]={id,reputation:0,status:0,trust:0.35,styles:{},memories:0,lastAt:0};
    return this.state.players[id];
  }
  district(e={}){return e.district||this.game.state.get().world?.district||'default';}
  playerId(e={}){return e.playerId||e.callsign||e.player||'player';}
  choice(e={}){
    const d=this.ensureDistrict(this.district(e)),p=this.ensurePlayer(this.playerId(e));
    const rep=Number(e.impact?.rep||e.rep||0);
    const option=String(e.option||e.choice||'choice');
    p.reputation+=rep;p.styles[option]=(p.styles[option]||0)+1;p.memories++;
    d.trust=CLAMP(d.trust+(rep>=0?.012:-.018));d.status=CLAMP(d.status+Math.abs(rep)*.006);
    this.remember('choice',d.district,option,rep);
  }
  consequence(e={}){
    const d=this.ensureDistrict(this.district(e)),intensity=CLAMP(Number(e.intensity||e.strength||.25));
    const kind=String(e.type||e.action||'consequence');
    if(/safety|crime|conflict/i.test(kind))d.norms.safety=(d.norms.safety||0)+intensity*.05;
    if(/trade|econom/i.test(kind))d.norms.trade=(d.norms.trade||0)+intensity*.05;
    if(/social/i.test(kind))d.norms.community=(d.norms.community||0)+intensity*.05;
    this.remember('consequence',d.district,kind,intensity);
  }
  social(e={}){
    const d=this.ensureDistrict(this.district(e)),type=String(e.type||'interaction');
    const value=/help|rescue|cooper/i.test(type)?0.025:-0.004;
    d.trust=CLAMP(d.trust+value);d.visibility=CLAMP(d.visibility+.008);
    this.remember('social',d.district,type,value);
  }
  memory(e={}){
    const d=this.ensureDistrict(this.district(e)),type=String(e.type||e.memoryType||e.kind||'memory');
    const strength=Number(e.strength||e.trustDelta||e.reputationDelta||.01);
    d.trust=CLAMP(d.trust+CLAMP(strength,-.03,.03));
    this.remember('memory',d.district,type,strength);
  }
  faction(e={}){
    const d=this.ensureDistrict(this.district(e)),rep=Number(e.reputation||e.trust||0);
    d.status=CLAMP(d.status+Math.abs(rep)*.01);
    this.remember('faction',d.district,String(e.faction||'alignment'),rep);
  }
  trade(e={}){
    const d=this.ensureDistrict(e.district||e.to||e.from||'default');
    d.norms.trade=(d.norms.trade||0)+.06;d.trend=CLAMP(d.trend+.04);
    this.remember('trade',d.district,'trade-wave',.04);
  }
  society(e={}){
    for(const district of DISTRICTS)this.ensureDistrict(district);
    this.signal('society','city',e);
  }
  collective(e={}){
    const d=this.ensureDistrict(e.district),action=String(e.action||'collective');
    d.norms[action]=(d.norms[action]||0)+Number(e.support||0)*.05;
    d.visibility=CLAMP(d.visibility+.02);
    this.signal('collective',d.district,action);
  }
  remember(type,district,data,strength){
    this.state.rumors.unshift({type,district,data,strength,at:Date.now()});
    this.state.rumors=this.state.rumors.slice(0,80);
  }
  signal(type,district,data){
    this.state.signals.unshift({type,district,data,at:Date.now()});
    this.state.signals=this.state.signals.slice(0,40);
  }
  update(dt){
    this.tick+=dt;if(this.tick<6)return;this.tick=0;
    for(const district of DISTRICTS)this.step(district);
    this.generateTrends();
    this.sync();
    const ds=Object.values(this.state.districts);
    this.game.events.emit('culture:update',{districts:ds.length,trends:this.state.trends.length,rumors:this.state.rumors.length});
  }
  step(name){
    const d=this.ensureDistrict(name);
    const norms=d.norms;
    const ranked=Object.entries(norms).sort((a,b)=>b[1]-a[1]);
    d.dominant=ranked[0]?.[0]||d.identity[0];
    d.trend=CLAMP(d.trend*.92+(ranked[0]?.[1]||0)*.08);
    d.trust=CLAMP(d.trust*.97+d.trend*.03);
    d.status=CLAMP(d.status*.98+d.visibility*.02);
    d.visibility=CLAMP(d.visibility*.96+d.status*.04);
    for(const k of Object.keys(norms))norms[k]=CLAMP(norms[k]*.985);
  }
  generateTrends(){
    const next=[];
    for(const d of Object.values(this.state.districts)){
      const norm=Object.entries(d.norms).sort((a,b)=>b[1]-a[1])[0];
      if(norm&&norm[1]>.12)next.push({district:d.district,trend:norm[0],strength:CLAMP(norm[1]),at:Date.now()});
    }
    this.state.trends=next.slice(0,16);
  }
  profile(district='default'){
    const d=this.ensureDistrict(district);
    return {district:d.district,identity:[...d.identity],dominant:d.dominant,trust:d.trust,status:d.status,visibility:d.visibility,trend:d.trend};
  }
  modifiers(district='default'){
    const d=this.ensureDistrict(district);
    return {opportunityBias:1+d.trend*.25,reputationBias:1+d.status*.2,socialTrust:d.trust,culture:d.dominant};
  }
  sync(){this.game.state.update({emergentCulture:this.state});}
}