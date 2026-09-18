const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const TYPES=['traffic','economy','social','safety','weather','information','activity','shock','trade','consequence'];

export class LivingConsequenceSystem{
  constructor(game){
    this.game=game;this.tick=0;this.queue=[];
    const saved=game.state.get().livingConsequences||{};
    this.state=saved.chains?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{chains:{},queue:[],history:[],network:{pressure:0,active:0},updatedAt:0};}
  bind(){
    this.game.events.on('world:consequence',e=>this.seed('consequence',e));
    this.game.events.on('player:choice-made',e=>this.choice(e));
    this.game.events.on('gameplay:chain-resolved',e=>this.chainResolved(e));
    this.game.events.on('cargo:delivery-failed',e=>this.seed('safety',{district:e.to||e.district,heat:.35,reason:'delivery-failure'}));
    this.game.events.on('cargo:delivery-arrived',e=>this.seed('trade',{district:e.district,intensity:.28,reason:'delivery-success'}));
    this.game.events.on('faction:conflict-event',e=>this.seed('safety',{district:e.district,intensity:e.conflict?.intensity||.4,reason:'faction-conflict'}));
    this.game.events.on('city:cascade-wave',e=>this.seed(e.type,e));
    this.game.events.on('city:response',e=>this.response(e));
  }
  seed(type,data={}){
    const district=data.district||data.to||data.from||this.game.state.get().world?.district||'Kigali';
    const intensity=CLAMP(Number(data.intensity||data.pressure||data.heat||.3));
    const id=`lc-${Date.now()}-${Math.floor(Math.random()*999)}`;
    const c={id,type,district,intensity,stage:0,status:'active',source:data.reason||data.source||type,createdAt:Date.now(),ttl:24,signals:[]};
    this.state.chains[id]=c;this.state.queue.push(id);this.state.queue=this.state.queue.slice(-24);
    this.state.history.unshift({id,type,district,intensity,source:c.source,at:Date.now()});this.state.history=this.state.history.slice(0,64);
    this.advance(c,'seed');
    this.game.events.emit('consequence:chain-started',{...c});
    this.sync();
  }
  choice(e={}){
    if(!e.district)return;
    const bias=this.game.adaptiveWorldMemory?.modifiers(e.district,e.type)||{};
    this.seed(e.option==='abandon'||e.option==='oppose'?'safety':'social',{district:e.district,intensity:.18+(bias.riskBias||0)*.22,reason:'player-choice'});
  }
  chainResolved(e={}){
    if(e.outcome==='failure')this.seed('economy',{district:e.district,intensity:.32,reason:'chain-failure'});
    if(e.outcome==='success')this.seed('social',{district:e.district,intensity:.2,reason:'chain-success'});
  }
  response(e={}){this.seed(e.type||'information',{district:e.district,intensity:Number(e.strength||.2)*.35,reason:'city-response'});}
  advance(c,reason){
    c.stage++;
    c.signals.push({stage:c.stage,reason,at:Date.now()});
    if(c.stage>=4)c.status='resolved';
  }
  apply(c){
    const intensity=CLAMP(c.intensity);
    const responseType=TYPES.includes(c.type)?c.type:'information';
    if(intensity<.22)return;
    if(responseType==='safety')this.game.events.emit('police:alert',{level:Math.max(1,Math.round(intensity*2)),district:c.district,source:'living-consequence'});
    if(responseType==='traffic')this.game.events.emit('traffic:consequence',{district:c.district,pressure:intensity});
    if(responseType==='economy'||responseType==='trade')this.game.events.emit('economy:consequence',{district:c.district,pressure:intensity});
    if(responseType==='social')this.game.events.emit('social:consequence',{district:c.district,intensity});
    this.game.events.emit('consequence:world-effect',{district:c.district,type:responseType,intensity,source:c.source});
  }
  update(dt){
    this.tick+=dt;if(this.tick<1)return;const step=this.tick;this.tick=0;
    for(const id of Object.keys(this.state.chains)){
      const c=this.state.chains[id];if(c.status!=='active')continue;
      c.ttl-=step;c.intensity*=Math.pow(.96,step);
      this.apply(c);
      if(c.ttl<=0||c.intensity<.08){c.status='resolved';this.state.history.unshift({...c,resolvedAt:Date.now()});}
      else if(c.stage<3)this.advance(c,'world');
    }
    this.state.history=this.state.history.slice(0,64);
    const active=Object.values(this.state.chains).filter(c=>c.status==='active');
    this.state.network={pressure:active.length?active.reduce((s,c)=>s+c.intensity,0)/active.length:0,active:active.length};
    this.state.queue=active.map(c=>c.id).slice(-24);this.state.updatedAt=Date.now();this.sync();
    if(this.state.network.pressure>.6)this.game.events.emit('consequence:network-pressure',this.state.network);
  }
  sync(){this.game.state.update({livingConsequences:this.state});}
}
