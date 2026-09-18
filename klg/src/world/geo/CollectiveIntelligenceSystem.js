const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const GROUPS=['market','transport','civic','nightlife','hill','social'];
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class CollectiveIntelligenceSystem{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().collectiveIntelligence||{};
    this.state=saved.groups?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{groups:{},districts:{},alliances:[],norms:{},signals:[],decisions:[],cohesion:0,coordination:0,updatedAt:0};}
  bind(){
    this.game.events.on('world:autonomous-decision',e=>this.agentDecision(e));
    this.game.events.on('npc:social-interaction',e=>this.social(e));
    this.game.events.on('npc:economy-update',e=>this.economy(e));
    this.game.events.on('faction:conflict-event',e=>this.conflict(e));
    this.game.events.on('player:choice-made',e=>this.playerChoice(e));
    this.game.events.on('district:trade-opportunity',e=>this.trade(e));
    this.game.events.on('city:response',e=>this.response(e));
  }
  groupKey(type,district){return type+':'+district;}
  ensureGroup(type,district){
    const key=this.groupKey(type,district);
    if(!this.state.groups[key])this.state.groups[key]={key,type,district,trust:.35,cohesion:.35,influence:.25,resources:.35,activity:.4,alliances:[],rivalries:[],decisions:0};
    return this.state.groups[key];
  }
  ensureDistrict(district){
    if(!this.state.districts[district])this.state.districts[district]={district,trust:.35,cohesion:.35,coordination:.2,commerce:.5,tension:.2,activity:1,norms:[]};
    return this.state.districts[district];
  }
  districtFor(e={}){return e.district||this.game.state.get().world?.district||'default';}
  groupsFor(district){return GROUPS.map(type=>this.ensureGroup(type,district));}
  agentDecision(e={}){const d=this.districtFor(e),g=this.ensureGroup(this.mapDomain(e.domain||e.action),d);g.decisions++;g.activity=CLAMP(g.activity+.035);this.signal('agent',d,e.action||e.domain);}
  mapDomain(v=''){
    const x=String(v).toLowerCase();
    if(x.includes('trade')||x.includes('econom'))return'market';
    if(x.includes('logistic')||x.includes('route'))return'transport';
    if(x.includes('safety')||x.includes('stabil'))return'civic';
    if(x.includes('social'))return'social';
    if(x.includes('faction'))return'hill';
    return'social';
  }
  social(e={}){const d=this.districtFor(e),x=this.ensureDistrict(d),trust=CLAMP(Number(e.trust||.35));x.cohesion=CLAMP(x.cohesion+.025);x.trust=CLAMP(x.trust*.96+trust*.04);this.ensureGroup('social',d).trust=CLAMP(this.ensureGroup('social',d).trust+.02);this.signal('social',d,e.type);}
  economy(e={}){const d=this.districtFor(e),x=this.ensureDistrict(d),pressure=CLAMP(Number(e.network?.pricePressure||e.marketPressure||0));x.commerce=CLAMP(x.commerce*.9+pressure*.1);this.ensureGroup('market',d).resources=CLAMP(this.ensureGroup('market',d).resources+.025);this.signal('economy',d,'market-shift');}
  conflict(e={}){const d=this.districtFor(e),x=this.ensureDistrict(d);x.tension=CLAMP(x.tension+.08);this.ensureGroup('civic',d).cohesion=CLAMP(this.ensureGroup('civic',d).cohesion-.025);this.ensureGroup('nightlife',d).cohesion=CLAMP(this.ensureGroup('nightlife',d).cohesion-.01);this.signal('conflict',d,'tension');}
  playerChoice(e={}){const d=this.districtFor(e),x=this.ensureDistrict(d),positive=Number(e.impact?.rep||0)>=0;x.trust=CLAMP(x.trust+(positive?.018:-.022));this.signal('player',d,e.option||'choice');}
  trade(e={}){const d=e.to||e.from||'default',x=this.ensureDistrict(d);x.commerce=CLAMP(x.commerce+.04);this.ensureGroup('market',d).activity=CLAMP(this.ensureGroup('market',d).activity+.04);this.signal('trade',d,'flow');}
  response(e={}){const d=this.districtFor(e),x=this.ensureDistrict(d);if(e.response==='secure')x.tension=CLAMP(x.tension-.05);if(e.response==='mobilize')x.coordination=CLAMP(x.coordination+.05);this.signal('response',d,e.response);}
  signal(type,district,data){this.state.signals.unshift({type,district,data,at:Date.now()});this.state.signals=this.state.signals.slice(0,40);}
  update(dt){
    this.tick+=dt;if(this.tick<5)return;this.tick=0;
    for(const district of Object.keys(this.state.districts))this.stepDistrict(district);
    for(const district of DISTRICTS)this.groupsFor(district);
    this.formAlliances();
    this.resolveCollectiveDecisions();
    const ds=Object.values(this.state.districts),gs=Object.values(this.state.groups);
    this.state.cohesion=ds.length?ds.reduce((a,d)=>a+d.cohesion,0)/ds.length:0;
    this.state.coordination=ds.length?ds.reduce((a,d)=>a+d.coordination,0)/ds.length:0;
    this.state.updatedAt=Date.now();this.sync();
    this.game.events.emit('society:collective-update',{cohesion:this.state.cohesion,coordination:this.state.coordination,alliances:this.state.alliances.length,groups:gs.length});
  }
  stepDistrict(d){
    const x=this.ensureDistrict(d);
    const gs=this.groupsFor(d);
    const cooperation=gs.reduce((a,g)=>a+g.trust*g.cohesion,0)/gs.length;
    x.coordination=CLAMP(x.coordination*.86+cooperation*.14);
    x.cohesion=CLAMP(x.cohesion*.92+x.coordination*.08-x.tension*.035);
    x.tension=CLAMP(x.tension*.9);
    x.trust=CLAMP(x.trust*.94+x.cohesion*.06);
    for(const g of gs){g.activity=CLAMP(g.activity*.94+x.activity*.06);g.trust=CLAMP(g.trust*.97+x.trust*.03);}
  }
  formAlliances(){
    const candidates=Object.values(this.state.groups).filter(g=>g.cohesion>.48&&g.trust>.46);
    const next=[];
    for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
      const a=candidates[i],b=candidates[j];if(a.district!==b.district||a.type===b.type)continue;
      const score=(a.trust+b.trust+a.cohesion+b.cohesion)/4;
      if(score>.58)next.push({a:a.key,b:b.key,district:a.district,trust:CLAMP(score),type:'cooperation'});
    }
    this.state.alliances=next.slice(0,24);
  }
  resolveCollectiveDecisions(){
    const hot=Object.values(this.state.districts).filter(d=>d.tension>.45||d.commerce>.62||d.coordination>.55);
    for(const d of hot.slice(0,3)){
      const action=d.tension>.65?'collective-safety':d.commerce>.72?'collective-trade':'collective-coordination';
      const key=action+':'+d.district;
      const last=this.state.decisions.find(x=>x.key===key);
      if(last&&Date.now()-last.at<20000)continue;
      const support=CLAMP(d.cohesion*.45+d.trust*.3+d.coordination*.25);
      const decision={key,action,district:d.district,support,at:Date.now()};
      this.state.decisions.unshift(decision);this.state.decisions=this.state.decisions.slice(0,32);
      this.game.events.emit('society:collective-decision',decision);
      if(action==='collective-safety')this.game.cityResponse?.respond('secure',d.district,CLAMP(.25+support*.45));
      if(action==='collective-trade')this.game.events.emit('district:collective-trade',{district:d.district,support});
      if(action==='collective-coordination')this.game.cityResponse?.respond('mobilize',d.district,CLAMP(.2+support*.35));
    }
  }
  sync(){this.game.state.update({collectiveIntelligence:this.state});}
}
