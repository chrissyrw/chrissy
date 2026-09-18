const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];

export class PersistentWorldHistorySystem{
  constructor(game){
    this.game=game;this.tick=0;this.era=1;
    const saved=game.state.get().persistentWorldHistory||{};
    this.state=saved.chapters?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{chapters:[],districts:{},legends:[],scars:[],milestones:[],timeline:[],counters:{events:0,completed:0,failed:0,choices:0},era:1,updatedAt:0};}
  bind(){
    this.game.events.on('culture:event-created',e=>this.recordEvent('created',e));
    this.game.events.on('culture:event-resolved',e=>this.resolveEvent(e));
    this.game.events.on('player:choice-made',e=>this.choice(e));
    this.game.events.on('world:consequence',e=>this.consequence(e));
    this.game.events.on('consequence:world-effect',e=>this.consequence(e));
    this.game.events.on('faction:conflict-event',e=>this.conflict(e));
    this.game.events.on('district:evolved',e=>this.district(e));
    this.game.events.on('society:collective-decision',e=>this.collective(e));
    this.game.events.on('player:memory-update',e=>this.memory(e));
  }
  ensureDistrict(name){
    if(!this.state.districts[name])this.state.districts[name]={district:name,events:0,success:0,failure:0,pressure:0,trust:.35,identity:[],landmarks:[],history:[]};
    return this.state.districts[name];
  }
  pushTimeline(type,payload){
    this.state.timeline.unshift({id:this.state.timeline.length+1,type,...payload,at:Date.now(),era:this.state.era});
    this.state.timeline=this.state.timeline.slice(0,160);
  }
  recordEvent(type,e={}){
    const d=this.ensureDistrict(e.district||'default');
    d.events++;this.state.counters.events++;
    this.pushTimeline(type,{district:d.district,action:e.action,culture:e.culture});
    if(e.strength>.7)this.createLegend(e,'major-event');
  }
  resolveEvent(e={}){
    const d=this.ensureDistrict(e.district||'default');
    if(e.success){d.success++;this.state.counters.completed++;d.trust=CLAMP(d.trust+.025);}
    else{d.failure++;this.state.counters.failed++;d.trust=CLAMP(d.trust-.02);}
    d.history.unshift({action:e.action,success:!!e.success,at:Date.now()});d.history=d.history.slice(0,24);
    this.pushTimeline('resolved',{district:d.district,action:e.action,success:!!e.success});
    if(e.success&&e.reward>=600)this.createLegend(e,'achievement');
    if(!e.success&&e.strength>.65)this.createScar(e,'failed-event');
    this.maybeChapter();
  }
  choice(e={}){
    const d=this.ensureDistrict(e.district||this.game.state.get().world?.district||'default');
    this.state.counters.choices++;
    const rep=Number(e.impact?.rep||e.rep||0);
    d.trust=CLAMP(d.trust+(rep>=0?.01:-.012));
    this.pushTimeline('choice',{district:d.district,option:e.option,rep});
  }
  consequence(e={}){
    const d=this.ensureDistrict(e.district||'default'),i=CLAMP(Number(e.intensity||e.strength||.2));
    d.pressure=CLAMP(d.pressure*.9+i*.1);
    this.pushTimeline('consequence',{district:d.district,type:e.type,intensity:i});
    if(i>.72)this.createScar(e,'world-consequence');
  }
  conflict(e={}){
    const d=this.ensureDistrict(e.district||'default'),i=CLAMP(Number(e.intensity||e.heat||e.tension||.4));
    d.pressure=CLAMP(d.pressure+i*.08);
    this.pushTimeline('conflict',{district:d.district,faction:e.faction,intensity:i});
    if(i>.75)this.createScar(e,'faction-conflict');
  }
  district(e={}){
    const d=this.ensureDistrict(e.district||e.districtName||'default');
    d.identity=[...(d.identity||[]),e.type||e.evolution||'evolved'].slice(-8);
    this.pushTimeline('district-change',{district:d.district,type:e.type||e.evolution});
  }
  collective(e={}){
    const d=this.ensureDistrict(e.district||'default');
    this.pushTimeline('society',{district:d.district,action:e.action,support:e.support});
    if(Number(e.support||0)>.8)this.createLegend(e,'collective-moment');
  }
  memory(e={}){
    if(e.type==='discovery'||e.memoryType==='discovery')this.createLegend(e,'discovery');
  }
  createLegend(e,kind){
    const district=e.district||'default';
    const label=this.legendLabel(kind,e);
    if(this.state.legends.some(x=>x.label===label&&x.district===district))return;
    const legend={id:'legend-'+Date.now(),district,label,kind,action:e.action||e.type||kind,strength:CLAMP(Number(e.strength||e.reward/1000||.5)),bornAt:Date.now(),era:this.state.era};
    this.state.legends.unshift(legend);this.state.legends=this.state.legends.slice(0,48);
    this.pushTimeline('legend',{district,label,kind});
    this.game.events.emit('world:legend-created',legend);
  }
  createScar(e,kind){
    const district=e.district||'default';
    const scar={id:'scar-'+Date.now(),district,kind,intensity:CLAMP(Number(e.intensity||e.strength||.5)),createdAt:Date.now(),decay:0};
    this.state.scars.unshift(scar);this.state.scars=this.state.scars.slice(0,48);
    this.pushTimeline('scar',{district,kind,intensity:scar.intensity});
    this.game.events.emit('world:scar-created',scar);
  }
  legendLabel(kind,e){
    const a=String(e.action||e.type||'event').replace(/[-_]/g,' ');
    return ({'major-event':'The '+a,'achievement':'The '+a+' Run','collective-moment':'The '+a+' Moment',discovery:'The '+a+' Discovery','failed-event':'The '+a+' Failure','world-consequence':'The '+a+' Incident','faction-conflict':'The '+a+' Conflict'})[kind]||'The '+a;
  }
  maybeChapter(){
    const total=this.state.counters.completed+this.state.counters.failed;
    if(total>0&&total%8===0){
      const chapter={id:'chapter-'+this.state.chapters.length+1,era:this.state.era,title:'Kigali Chapter '+(this.state.chapters.length+1),start:Date.now(),completed:total,summary:this.chapterSummary()};
      this.state.chapters.unshift(chapter);this.state.chapters=this.state.chapters.slice(0,24);
      this.game.events.emit('world:chapter-created',chapter);
    }
  }
  chapterSummary(){
    const districts=Object.values(this.state.districts).sort((a,b)=>b.events-a.events).slice(0,3);
    return districts.map(d=>d.district+' '+d.events+' events').join(' · ');
  }
  update(dt){
    this.tick+=dt;if(this.tick<10)return;this.tick=0;
    for(const d of Object.values(this.state.districts)){d.pressure=CLAMP(d.pressure*.985);d.trust=CLAMP(d.trust*.995+.35*.005);}
    for(const s of this.state.scars){s.intensity=CLAMP(s.intensity*.998);s.decay=1-s.intensity;}
    this.state.scars=this.state.scars.filter(s=>s.intensity>.05);
    this.state.updatedAt=Date.now();this.sync();
    this.game.events.emit('world:history-update',{chapters:this.state.chapters.length,legends:this.state.legends.length,scars:this.state.scars.length,events:this.state.counters.events});
  }
  profile(district='default'){
    const d=this.ensureDistrict(district);
    return {district:d.district,events:d.events,success:d.success,failure:d.failure,pressure:d.pressure,trust:d.trust,identity:[...d.identity],landmarks:[...d.landmarks]};
  }
  sync(){this.game.state.update({persistentWorldHistory:this.state});}
}