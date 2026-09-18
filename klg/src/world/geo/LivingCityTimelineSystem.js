const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class LivingCityTimelineSystem{
  constructor(game){
    this.game=game;this.tick=0;
    const saved=game.state.get().livingCityTimeline||{};
    this.state=saved.causes?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{causes:{},districts:{},rippleQueue:[],activeRipples:[],timeline:[],causality:0,updatedAt:0};}
  bind(){
    this.game.events.on('world:legend-created',e=>this.cause('legend',e));
    this.game.events.on('world:scar-created',e=>this.cause('scar',e));
    this.game.events.on('world:chapter-created',e=>this.cause('chapter',e));
    this.game.events.on('culture:event-resolved',e=>this.cause('event',e));
    this.game.events.on('faction:culture-signal',e=>this.cause('faction',e));
    this.game.events.on('economy:culture-pressure',e=>this.cause('economy',e));
    this.game.events.on('player:choice-made',e=>this.cause('choice',e));
    this.game.events.on('city:response',e=>this.cause('city-response',e));
  }
  history(){return this.game.persistentWorldHistory?.state||this.game.state.get().persistentWorldHistory||{};}
  ensureDistrict(d){
    if(!this.state.districts[d])this.state.districts[d]={district:d,pressure:0,trust:.35,legacy:0,commerce:0,social:0,safety:0,change:0};
    return this.state.districts[d];
  }
  cause(type,e={}){
    const district=e.district||e.name||this.game.state.get().world?.district||'default';
    const d=this.ensureDistrict(district);
    const intensity=CLAMP(Number(e.intensity||e.strength||e.support||e.reward/1000||.25));
    const key=type+':'+district+':'+String(e.action||e.label||e.kind||'event');
    const cause={key,type,district,intensity,at:Date.now(),payload:{action:e.action,label:e.label,faction:e.faction,success:e.success}};
    this.state.causes[key]=cause;
    this.state.rippleQueue.push(cause);
    this.state.timeline.unshift(cause);
    this.state.timeline=this.state.timeline.slice(0,120);
    d.pressure=CLAMP(d.pressure+intensity*.08);
    if(type==='legend')d.legacy=CLAMP(d.legacy+intensity*.06);
    if(type==='economy')d.commerce=CLAMP(d.commerce+intensity*.05);
    if(type==='faction')d.social=CLAMP(d.social+intensity*.04);
    if(type==='scar')d.safety=CLAMP(d.safety+intensity*.03);
    this.state.causality=CLAMP(this.state.causality*.96+intensity*.04);
  }
  createRipple(cause){
    const neighbors=DISTRICTS.filter(d=>d!==cause.district);
    const targets=neighbors.filter(d=>this.distanceSignal(d,cause.district)).slice(0,2);
    for(const district of targets){
      const strength=CLAMP(cause.intensity*.32);
      this.state.activeRipples.push({source:cause.district,district,type:cause.type,strength,reason:cause.key,createdAt:Date.now(),ttl:60});
    }
  }
  distanceSignal(a,b){
    const order=DISTRICTS.indexOf(a),origin=DISTRICTS.indexOf(b);
    return Math.abs(order-origin)<=2;
  }
  applyRipple(r){
    const d=this.ensureDistrict(r.district),s=r.strength;
    d.pressure=CLAMP(d.pressure+s*.08);
    d.change=CLAMP(d.change+s*.05);
    if(r.type==='economy'||r.type==='event')d.commerce=CLAMP(d.commerce+s*.04);
    if(r.type==='faction'||r.type==='choice')d.social=CLAMP(d.social+s*.035);
    if(r.type==='scar')d.safety=CLAMP(d.safety+s*.025);
    if(r.type==='legend')d.legacy=CLAMP(d.legacy+s*.04);
    this.game.events.emit('world:historical-ripple',{source:r.source,district:r.district,type:r.type,strength:s,reason:r.reason});
  }
  update(dt){
    this.tick+=dt;if(this.tick<7)return;this.tick=0;
    const queue=this.state.rippleQueue.splice(0,6);
    for(const cause of queue)this.createRipple(cause);
    this.state.activeRipples=this.state.activeRipples.filter(r=>{
      this.applyRipple(r);r.strength*=.91;r.ttl--;return r.ttl>0&&r.strength>.01;
    });
    for(const d of Object.values(this.state.districts)){
      d.pressure=CLAMP(d.pressure*.97);d.change=CLAMP(d.change*.95);
      d.trust=CLAMP(d.trust*.992+.35*.008);
      d.commerce=CLAMP(d.commerce*.985);d.social=CLAMP(d.social*.985);d.safety=CLAMP(d.safety*.99);d.legacy=CLAMP(d.legacy*.998);
    }
    this.state.updatedAt=Date.now();this.sync();
    const strongest=Object.values(this.state.districts).sort((a,b)=>(b.change+b.legacy)-(a.change+a.legacy))[0];
    this.game.events.emit('world:timeline-update',{causality:this.state.causality,ripples:this.state.activeRipples.length,strongest:strongest?.district||'default'});
  }
  profile(d='default'){return this.ensureDistrict(d);}
  sync(){this.game.state.update({livingCityTimeline:this.state});}
}