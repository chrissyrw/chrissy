const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const DISTRICTS=['Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','KigaliCBD','Rebero'];
const TEMPLATES={
 trade:{type:'economic',action:'trade-rush',objective:'deliver',reward:420},
 hustle:{type:'economic',action:'street-deal',objective:'deliver',reward:520},
 reliability:{type:'social',action:'reputation-run',objective:'help',reward:360},
 community:{type:'social',action:'community-help',objective:'help',reward:300},
 nightlife:{type:'social',action:'night-network',objective:'join',reward:460},
 loyalty:{type:'faction',action:'faction-support',objective:'help',reward:500},
 business:{type:'economic',action:'business-connect',objective:'trade',reward:650},
 status:{type:'social',action:'status-challenge',objective:'join',reward:700},
 networking:{type:'social',action:'network-meet',objective:'join',reward:480},
 civic:{type:'safety',action:'civic-response',objective:'report',reward:380},
 order:{type:'safety',action:'stabilize-route',objective:'report',reward:430},
 service:{type:'civic',action:'service-call',objective:'help',reward:340},
 mobility:{type:'logistics',action:'mobility-run',objective:'deliver',reward:450},
 speed:{type:'logistics',action:'time-critical-run',objective:'deliver',reward:620},
 coordination:{type:'logistics',action:'convoy-link',objective:'join',reward:540},
 ambition:{type:'economic',action:'high-value-opportunity',objective:'trade',reward:760},
 commerce:{type:'economic',action:'market-surge',objective:'trade',reward:580},
 visibility:{type:'social',action:'public-challenge',objective:'join',reward:640},
 grit:{type:'faction',action:'recovery-run',objective:'help',reward:560},
 hillcraft:{type:'exploration',action:'hill-route',objective:'explore',reward:500},
 independence:{type:'exploration',action:'solo-discovery',objective:'explore',reward:470}
};

export class CultureDrivenEventSystem{
  constructor(game){
    this.game=game;this.tick=0;this.nextId=1;
    const saved=game.state.get().cultureDrivenEvents||{};
    this.state=saved.events?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{events:[],active:[],history:[],districtCooldowns:{},updatedAt:0};}
  bind(){
    this.game.events.on('culture:world-impact',e=>this.observe(e));
    this.game.events.on('culture:world-impact',e=>this.seedFromCulture());
    this.game.events.on('player:choice-made',e=>this.resolveFromChoice(e));
  }
  culture(district){
    return this.game.emergentCulture?.profile(district)||{dominant:'community',trend:0,trust:.35,status:0,visibility:.2};
  }
  bridge(district){
    return this.game.cultureWorldBridge?.modifiers(district)||{intensity:0,economy:0,social:0,trust:0,opportunity:0};
  }
  candidate(district){
    const c=this.culture(district),b=this.bridge(district),t=TEMPLATES[c.dominant]||TEMPLATES.community;
    const strength=CLAMP(.35+c.trend*.7+b.opportunity*.3);
    return {id:this.nextId++,district,culture:c.dominant,type:t.type,action:t.action,objective:t.objective,reward:Math.round(t.reward*(1+strength*.35)),strength,expires:Date.now()+90000,status:'available',createdAt:Date.now()};
  }
  observe(e={}){
    if(!e.active)return;
    const hot=DISTRICTS.map(d=>({d,b:this.bridge(d),c:this.culture(d)})).sort((a,b)=>(b.c.trend+b.b.opportunity)-(a.c.trend+a.b.opportunity))[0];
    if(hot)this.seed(hot.d);
  }
  seedFromCulture(){
    const ranked=DISTRICTS.map(d=>({d,c:this.culture(d),b:this.bridge(d)})).sort((a,b)=>(b.c.trend+b.b.opportunity)-(a.c.trend+a.b.opportunity));
    for(const x of ranked.slice(0,2))if(x.c.trend>.14||x.b.opportunity>.04)this.seed(x.d);
  }
  seed(district){
    const last=this.state.districtCooldowns[district]||0;
    if(Date.now()-last<25000)return null;
    const duplicate=this.state.active.some(e=>e.district===district&&e.status==='available');
    if(duplicate)return null;
    const e=this.candidate(district);
    this.state.events.unshift(e);this.state.active.push(e);this.state.districtCooldowns[district]=Date.now();
    this.state.events=this.state.events.slice(0,64);this.state.active=this.state.active.slice(-24);
    this.game.events.emit('culture:event-created',e);
    this.game.events.emit('gameplay:culture-opportunity',e);
    return e;
  }
  resolveFromChoice(e={}){
    const option=String(e.option||'');
    const active=this.state.active.filter(x=>x.status==='available');
    const target=active.find(x=>x.objective===option||x.action===option);
    if(!target)return;
    target.status='resolved';target.resolution=option;target.resolvedAt=Date.now();
    if(option==='help'||option==='join'||option==='trade'||option==='deliver'||option==='report'||option==='explore'){
      this.game.events.emit('culture:event-resolved',{...target,success:true});
    }else{
      this.game.events.emit('culture:event-resolved',{...target,success:false});
    }
  }
  update(dt){
    this.tick+=dt;if(this.tick<8)return;this.tick=0;
    this.state.active=this.state.active.filter(e=>{
      if(e.status==='available'&&e.expires<Date.now()){e.status='expired';this.state.history.unshift(e);return false;}
      if(e.status==='resolved'){this.state.history.unshift(e);return false;}
      return true;
    });
    this.state.history=this.state.history.slice(0,64);
    this.state.updatedAt=Date.now();this.sync();
  }
  getActive(){return this.state.active.filter(e=>e.status==='available');}
  sync(){this.game.state.update({cultureDrivenEvents:this.state});}
}