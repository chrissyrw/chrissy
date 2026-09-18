const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const SEASONS=[
  {id:'green-rise',name:'Green Rise',days:30,weather:'rain',economy:1.05,social:1.08,logistics:.94,exploration:1.1},
  {id:'sun-high',name:'Sun High',days:30,weather:'sun',economy:1.12,social:1.02,logistics:1.08,exploration:1.15},
  {id:'harvest-flow',name:'Harvest Flow',days:30,weather:'mixed',economy:1.22,social:1.12,logistics:1.14,exploration:1.02},
  {id:'night-cool',name:'Night Cool',days:30,weather:'cool',economy:.96,social:1.2,logistics:.98,exploration:.92}
];
const MACROS=[
  {id:'trade-week',name:'Trade Week',days:7,economy:1.18,commerce:1.2},
  {id:'social-week',name:'Social Week',days:7,social:1.18,visibility:1.12},
  {id:'faction-week',name:'Faction Week',days:7,faction:1.15,heat:1.08},
  {id:'mobility-week',name:'Mobility Week',days:7,logistics:1.18,traffic:1.08}
];

export class WorldSeasonCycleSystem{
  constructor(game){
    this.game=game;this.tick=0;this.lastKey='';
    const saved=game.state.get().worldSeasonCycle||{};
    this.state=saved.worldAge!=null?{...saved}:this.empty();
    this.bind();this.sync();
  }
  empty(){return{worldAge:0,day:0,seasonIndex:0,season:null,macroIndex:0,macro:null,cycle:0,year:0,modifiers:{},history:[],signals:[],updatedAt:0};}
  bind(){
    this.game.events.on('world:persistence-cycle',e=>{this.state.worldAge=Number(e.worldAge||this.state.worldAge);});
    this.game.events.on('world:historical-ripple',e=>this.signal(e));
    this.game.events.on('culture:event-created',e=>this.signal(e));
  }
  compute(age){
    const day=Math.floor(age/86400);
    const yearDay=day%120;
    let cursor=0,index=0;
    for(let i=0;i<SEASONS.length;i++){if(yearDay<cursor+SEASONS[i].days){index=i;break;}cursor+=SEASONS[i].days;}
    const macroIndex=Math.floor(day/7)%MACROS.length;
    const season=SEASONS[index],macro=MACROS[macroIndex];
    const modifiers={
      economy:CLAMP(season.economy*(macro.economy||1)/1.15),
      social:CLAMP(season.social*(macro.social||1)/1.15),
      logistics:CLAMP(season.logistics*(macro.logistics||1)/1.15),
      exploration:CLAMP(season.exploration),
      commerce:CLAMP((macro.commerce||1)/1.15),
      visibility:CLAMP(macro.visibility||1),
      faction:CLAMP(macro.faction||1),
      heat:CLAMP(macro.heat||1),
      traffic:CLAMP(macro.traffic||1)
    };
    return{day,seasonIndex:index,season,macroIndex,macro,cycle:Math.floor(day/7),year:Math.floor(day/120),modifiers};
  }
  signal(e={}){
    const district=e.district||'default';
    this.state.signals.unshift({district,type:e.type||e.action||'world',at:Date.now()});
    this.state.signals=this.state.signals.slice(0,32);
  }
  applyTransition(next){
    const key=next.season.id+':'+next.macro.id+':'+next.year;
    if(key===this.lastKey)return;
    const previous=this.state.season;
    this.lastKey=key;
    this.state.history.unshift({day:next.day,season:next.season.id,macro:next.macro.id,year:next.year,at:Date.now()});
    this.state.history=this.state.history.slice(0,48);
    this.game.events.emit('world:cycle-transition',{day:next.day,year:next.year,season:next.season,macro:next.macro,previous});
    if(!previous||previous.id!==next.season.id)this.game.events.emit('world:season-change',{day:next.day,year:next.year,season:next.season,modifiers:next.modifiers});
    this.game.events.emit('world:macro-cycle',{day:next.day,cycle:next.cycle,macro:next.macro,modifiers:next.modifiers});
  }
  update(dt){
    this.tick+=dt;if(this.tick<3)return;this.tick=0;
    const persistence=this.game.longTermWorldPersistence?.state||this.game.state.get().longTermWorldPersistence||{};
    const age=Number(persistence.worldAge||0);
    const next=this.compute(age);
    this.state.worldAge=age;this.state.day=next.day;this.state.seasonIndex=next.seasonIndex;this.state.season=next.season;this.state.macroIndex=next.macroIndex;this.state.macro=next.macro;this.state.cycle=next.cycle;this.state.year=next.year;this.state.modifiers=next.modifiers;this.state.updatedAt=Date.now();
    this.applyTransition(next);this.sync();
    this.game.events.emit('world:season-state',{day:next.day,season:next.season,macro:next.macro,modifiers:next.modifiers,year:next.year});
  }
  profile(){return{...this.state,modifiers:{...this.state.modifiers}};}
  modifier(key,fallback=1){return Number(this.state.modifiers?.[key]??fallback);}
  sync(){this.game.state.update({worldSeasonCycle:this.state});}
}