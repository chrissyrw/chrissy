const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICT_ALIASES={CBD:'KigaliCBD',NYAMIRAMBO:'Nyamirambo',KIMIRONKO:'Kimironko',REMERA:'Remera',KACYIRU:'Kacyiru',NYARUTARAMA:'Nyarutarama',KICUKIRO:'Kicukiro',KANOMBE:'Kanombe'};
const TRAITS=['friendly','ambitious','cautious','social','independent','opportunist'];
const NEEDS=['money','food','safety','belonging','purpose'];

export class NPCSocialIntelligenceSystem{
  constructor(game){
    this.game=game;this.tick=0;this.nextId=1;
    const saved=game.state.get().npcSocialIntelligence||{};
    this.state=saved.npcs?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{npcs:{},relationships:{},districts:{},activeSignals:[],socialEvents:0,updatedAt:0};}
  bind(){
    this.game.events.on('npc:economy-update',e=>this.economySignal(e));
    this.game.events.on('city:event',e=>this.citySignal(e));
    this.game.events.on('city:response',e=>this.responseSignal(e));
    this.game.events.on('world:consequence',e=>this.consequenceSignal(e));
    this.game.events.on('social:memory-updated',e=>this.playerSignal(e));
  }
  alias(name){const key=String(name||'').toUpperCase();return DISTRICT_ALIASES[key]||name||'default';}
  ensure(n){
    const id=String(n?.id??this.nextId++);
    if(!this.state.npcs[id]){
      const seed=Number(id.replace(/\D/g,'')||this.nextId);
      const trait=TRAITS[seed%TRAITS.length];
      this.state.npcs[id]={id,trait,needs:{money:.35,food:.25,safety:.2,belonging:.2,purpose:.2},mood:'calm',trust:0.35,stress:0,loyalty:0,curiosity:.5,lastDecision:0};
    }
    return this.state.npcs[id];
  }
  district(name){
    const d=this.alias(name),x=this.state.districts[d]||(this.state.districts[d]={mood:0.5,trust:0.35,tension:0,activity:1,visits:0});
    return x;
  }
  economySignal(e={}){
    const district=this.district(e.district),pressure=CLAMP(Number(e.pressure||e.marketPressure||0));
    district.activity=CLAMP(.7+Number(e.activity||1)*.18);district.tension=CLAMP(district.tension+pressure*.18);
    this.emitSignal('economy',e.district,{pressure,activity:district.activity});
    for(const n of this.game.npcs?.npcs||[])this.updateNPC(n,{money:pressure*.22,purpose:pressure*.12},'economic-pressure');
  }
  citySignal(e={}){const district=this.district(e.district),intensity=CLAMP(Number(e.intensity||e.pressure||.35));district.tension=CLAMP(district.tension+intensity*.25);district.mood=CLAMP(district.mood-intensity*.12);this.emitSignal('city',e.district,{intensity});}
  responseSignal(e={}){const district=this.district(e.district),strength=CLAMP(Number(e.strength||0));if(e.response==='mobilize')district.trust=CLAMP(district.trust+strength*.12);if(e.response==='secure')district.tension=CLAMP(district.tension-strength*.1);this.emitSignal('response',e.district,{response:e.response,strength});}
  consequenceSignal(e={}){const district=this.district(e.district),heat=CLAMP(Number(e.heat||0));district.tension=CLAMP(district.tension+heat*.18);this.emitSignal('consequence',e.district,{heat});}
  playerSignal(e={}){const latest=e.recent?.[0];if(!latest)return;this.emitSignal('memory',latest.district,{trust:Number(latest.trust||0)});}
  updateNPC(n,delta={},reason='world'){
    if(!n)return;const s=this.ensure(n),d=this.district(n.district);for(const k of NEEDS)if(delta[k])s.needs[k]=CLAMP(s.needs[k]+delta[k]);
    const pressure=(s.needs.money+s.needs.food+s.needs.safety+s.needs.belonging+s.needs.purpose)/5;
    s.stress=CLAMP(s.stress+(pressure-.35)*.16-d.trust*.03);s.trust=CLAMP(s.trust+(d.trust-.35)*.04-s.stress*.015);
    if(s.stress>.68)s.mood='stressed';else if(d.tension>.62)s.mood='alert';else if(s.trust>.65)s.mood='confident';else s.mood='calm';
    s.lastDecision=Date.now();
    if(Math.random()<.12)this.game.events.emit('npc:social-decision',{npcId:s.id,trait:s.trait,mood:s.mood,reason,needs:{...s.needs},district:this.alias(n.district)});
  }
  decide(n){
    const s=this.ensure(n),d=this.district(n.district),need=Object.entries(s.needs).sort((a,b)=>b[1]-a[1])[0][0];
    let action='work';
    if(need==='safety'||d.tension>.7)action='avoid-risk';
    else if(need==='belonging'&&['social','friendly'].includes(s.trait))action='seek-group';
    else if(need==='money'||need==='purpose')action=s.trait==='opportunist'?'seek-opportunity':'work';
    else if(need==='food')action='shop';
    if(s.trait==='independent'&&d.tension<.4)action=need==='money'?'work':'explore';
    s.lastDecision=Date.now();
    this.game.events.emit('npc:social-decision',{npcId:s.id,trait:s.trait,mood:s.mood,action,need,district:this.alias(n.district)});
    return action;
  }
  interact(npcA,npcB,type='encounter'){
    const a=this.ensure(npcA),b=this.ensure(npcB),key=[a.id,b.id].sort().join(':');
    const rel=this.state.relationships[key]||(this.state.relationships[key]={a:a.id,b:b.id,trust:.2,cooperation:0,rivalry:0,meetings:0});
    rel.meetings++;if(type==='help'||type==='cooperation')rel.trust=CLAMP(rel.trust+.08);if(type==='rivalry')rel.rivalry=CLAMP(rel.rivalry+.12);else rel.cooperation=CLAMP(rel.cooperation+.04);
    this.state.socialEvents++;this.game.events.emit('npc:social-interaction',{a:a.id,b:b.id,type,trust:rel.trust,cooperation:rel.cooperation,rivalry:rel.rivalry});
  }
  emitSignal(type,district,data={}){this.state.activeSignals.push({id:this.nextId++,type,district:this.alias(district),at:Date.now(),...data});this.state.activeSignals=this.state.activeSignals.slice(-24);}
  update(dt){
    this.tick+=dt;if(this.tick<2)return;const step=this.tick;this.tick=0;
    const npcs=this.game.npcs?.npcs||[];let social=0,stressed=0;
    for(const n of npcs){if(!n.active)continue;const s=this.ensure(n);this.updateNPC(n,{safety:this.district(n.district).tension*.03,belonging:(s.trait==='social'?.015:0)},'routine');if(Date.now()-s.lastDecision>5000)this.decide(n);if(s.stress>.6)stressed++;if(s.trait==='social'&&s.mood!=='stressed')social++;this.district(n.district).visits++;}
    for(const d of Object.values(this.state.districts)){d.tension*=Math.pow(.9,step);d.mood=.5+d.trust*.35-d.tension*.3;}
    this.state.activeSignals=this.state.activeSignals.filter(e=>Date.now()-e.at<30000);this.state.updatedAt=Date.now();this.state.metrics={active:npcs.filter(n=>n.active).length,social,stressed,relationships:Object.keys(this.state.relationships).length};this.sync();
    if(social>0)this.game.events.emit('npc:social-network',{...this.state.metrics});
  }
  sync(){this.game.state.update({npcSocialIntelligence:this.state});}
}
