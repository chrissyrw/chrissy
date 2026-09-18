const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const TYPES=['logistics','faction','social','economic','safety','exploration'];

export class EmergentGameplaySystem{
  constructor(game){
    this.game=game;this.tick=0;this.cooldown=0;this.nextId=1;
    const saved=game.state.get().emergentGameplay||{};
    this.state=saved.chains?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{chains:{},active:[],history:[],signals:[],updatedAt:0};}
  bind(){
    this.game.events.on('ai:director-decision',e=>this.directorSignal(e));
    this.game.events.on('ai:opportunity-seeded',e=>this.seedFromAI(e));
    this.game.events.on('faction:economic-order',e=>this.orderSignal(e));
    this.game.events.on('faction:mission-generated',e=>this.missionSignal(e));
    this.game.events.on('cargo:delivery-started',e=>this.progress(e,'started'));
    this.game.events.on('cargo:delivery-arrived',e=>this.resolveByOrder(e,true));
    this.game.events.on('cargo:delivery-failed',e=>this.resolveByOrder(e,false));
    this.game.events.on('faction:encounter-resolved',e=>this.factionChoice(e));
    this.game.events.on('world:consequence',e=>this.consequence(e));
    this.game.events.on('npc:social-interaction',e=>this.socialSignal(e));
  }
  pushSignal(type,data={}){this.state.signals.unshift({type,...data,at:Date.now()});this.state.signals=this.state.signals.slice(0,32);}
  create(type,district,context={}){
    const id=`chain-${this.nextId++}`;
    const chain={id,type,district,status:'available',stage:0,stages:this.compose(type,context),context,createdAt:Date.now(),updatedAt:Date.now()};
    this.state.chains[id]=chain;this.state.active.unshift(id);this.state.active=this.state.active.slice(0,12);
    this.pushSignal('chain-created',{id,type,district});
    this.game.events.emit('gameplay:chain-created',{...chain});
    this.sync();return chain;
  }
  compose(type,context){
    const common=[{id:'discover',kind:'discover',status:'open'},{id:'choose',kind:'choice',status:'open'},{id:'consequence',kind:'consequence',status:'locked'}];
    if(type==='logistics')return[
      {id:'signal',kind:'opportunity',status:'open',action:'inspect-cargo'},
      {id:'route',kind:'objective',status:'locked',action:'deliver'},
      {id:'choice',kind:'choice',status:'open',options:['deliver','reroute','abandon']},
      {id:'consequence',kind:'consequence',status:'locked'}
    ];
    if(type==='faction')return[
      {id:'signal',kind:'encounter',status:'open',action:'meet-faction'},
      {id:'choice',kind:'choice',status:'locked',options:['help-a','help-b','avoid']},
      {id:'response',kind:'faction-response',status:'locked'},
      {id:'consequence',kind:'consequence',status:'locked'}
    ];
    if(type==='social')return[
      {id:'signal',kind:'social',status:'open',action:'engage'},
      {id:'choice',kind:'choice',status:'locked',options:['help','join','avoid']},
      {id:'network',kind:'social-response',status:'locked'},
      {id:'consequence',kind:'consequence',status:'locked'}
    ];
    if(type==='economic')return[
      {id:'signal',kind:'market',status:'open',action:'inspect-demand'},
      {id:'objective',kind:'objective',status:'locked',action:'trade'},
      {id:'choice',kind:'choice',status:'locked',options:['buy','deliver','wait']},
      {id:'consequence',kind:'consequence',status:'locked'}
    ];
    if(type==='safety')return[
      {id:'signal',kind:'pressure',status:'open',action:'observe'},
      {id:'choice',kind:'choice',status:'locked',options:['help','avoid','report']},
      {id:'response',kind:'city-response',status:'locked'},
      {id:'consequence',kind:'consequence',status:'locked'}
    ];
    return common;
  }
  directorSignal(e={}){this.pushSignal('director',{action:e.action,district:e.district,score:e.score});}
  seedFromAI(e={}){
    const type=e.good==='delivery'||e.action==='boost-logistics'?'logistics':e.action==='faction-pressure'?'faction':e.action==='social-wave'?'social':'economic';
    if(!this.findRecent(type,e.district,12))this.create(type,e.district,{source:'ai-director',reward:e.reward,good:e.good});
  }
  findRecent(type,district,seconds=12){
    const since=Date.now()-seconds*1000;
    return Object.values(this.state.chains).some(c=>c.type===type&&c.district===district&&c.createdAt>since);
  }
  orderSignal(e={}){this.pushSignal('economic-order',{id:e.id,faction:e.faction,district:e.district,good:e.good});}
  missionSignal(e={}){this.pushSignal('faction-mission',{id:e.id,faction:e.faction,district:e.district});}
  socialSignal(e={}){if(e.district&&!this.findRecent('social',e.district,15))this.create('social',e.district,{source:'npc-social',interaction:e.type});}
  progress(e={},status){
    const candidates=Object.values(this.state.chains).filter(c=>c.status==='available'&&c.type==='logistics');
    const c=candidates.find(x=>x.context?.orderId===e.orderId)||candidates[0];
    if(!c)return;
    c.context={...c.context,orderId:e.orderId,from:e.from,to:e.to,good:e.good};
    c.stage=Math.max(c.stage,status==='started'?1:0);c.stages.forEach((s,i)=>{if(i<=c.stage)s.status='open';});
    c.updatedAt=Date.now();this.sync();
  }
  resolveByOrder(e={},success){
    const c=Object.values(this.state.chains).find(x=>x.context?.orderId===e.orderId&&x.status!=='resolved');
    if(!c)return;
    this.resolve(c,success?'success':'failure',e);
  }
  factionChoice(e={}){if(!e.action)return;const c=Object.values(this.state.chains).find(x=>x.type==='faction'&&x.status==='available');if(!c)return;c.context.choice=e.action;c.stage=2;c.stages.forEach((s,i)=>{if(i<=2)s.status='open';});this.sync();}
  consequence(e={}){this.pushSignal('consequence',{district:e.district,reward:e.reward,rep:e.rep});}
  resolve(c,outcome,data={}){
    c.status='resolved';c.outcome=outcome;c.stage=c.stages.length-1;c.updatedAt=Date.now();
    this.state.history.unshift({...c,resolvedAt:Date.now(),data});this.state.history=this.state.history.slice(0,48);
    this.state.active=this.state.active.filter(id=>id!==c.id);
    this.game.events.emit('gameplay:chain-resolved',{id:c.id,type:c.type,district:c.district,outcome,chain:{...c}});
    this.sync();
  }
  generateFromPressure(){
    const ai=this.game.state.get().aiWorldDirector?.pressure||{};
    const district=ai.district||this.game.state.get().world?.district||'Kigali';
    const values=[
      ['logistics',Number(ai.logistics||0)],
      ['economic',Number(ai.economic||0)],
      ['social',Number(ai.social||0)],
      ['safety',Number(ai.safety||0)]
    ].sort((a,b)=>b[1]-a[1]);
    const [type,pressure]=values[0]||['exploration',0];
    if(pressure<.48||this.findRecent(type,district,30))return;
    this.create(type,district,{source:'pressure-composer',pressure});
  }
  update(dt){
    this.tick+=dt;this.cooldown+=dt;
    if(this.tick<2)return;
    this.tick=0;
    if(this.cooldown>=8){this.cooldown=0;this.generateFromPressure();}
    for(const c of Object.values(this.state.chains)){
      if(c.status==='available'&&Date.now()-c.createdAt>90000)this.resolve(c,'expired');
    }
    this.state.updatedAt=Date.now();this.sync();
  }
  sync(){this.game.state.update({emergentGameplay:this.state});}
}
