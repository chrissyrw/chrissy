import * as THREE from 'three';

export class MissionDirector {
  constructor(game){
    this.game=game;this.timer=0;this.cooldown=8;this.history=[];this.bind();
  }
  bind(){
    this.game.events.on('ai:world-director',d=>this.world=d);
    this.game.events.on('mission:completed',m=>{this.history.unshift(m.id);this.history=this.history.slice(0,6);this.cooldown=10;});
  }
  hour(){return Math.floor(this.game.state.get().world.time/60)%24;}
  score(m){
    const d=this.world||{},w=this.game.state.get().world,stats=this.game.stats;
    let s=1;
    if(this.history.includes(m.id))s*=.35;
    if(m.tags?.includes('night')&&this.hour()>=18)s*=2;
    if(m.tags?.includes('storm')&&w.weather==='storm')s*=2.8;
    if(m.tags?.includes('traffic')&&(d.congestion||0)>45)s*=2;
    if(m.tags?.includes('police')&&(d.heat||0)>30)s*=2.2;
    if(m.tags?.includes('crowd')&&(d.population||1)>1.2)s*=1.8;
    if(m.tags?.includes('reputation'))s*=1+Math.min(1,(stats.reputation||0)/100);
    return s*(.8+Math.random()*.4);
  }
  choose(){
    const candidates=[
      {id:'ai-market-run',title:'Market Rush',description:'Deliver a package to Kimironko while city traffic is building.',objective:{type:'location',x:-16,z:14,radius:8},reward:500,reputation:7,tags:['traffic','crowd']},
      {id:'ai-night-patrol',title:'Night Circuit',description:'Reach Nyarutarama after dark without abandoning your drive.',objective:{type:'night-location',x:54,z:42,radius:10},reward:650,reputation:10,tags:['night']},
      {id:'ai-storm-run',title:'Storm Run',description:'Reach Remera Fuel while the weather is stormy.',objective:{type:'storm-location',x:54,z:-44,radius:10},reward:850,reputation:14,tags:['storm']},
      {id:'ai-police-escape',title:'Heat Run',description:'Drive through the city while wanted and reach the safe zone.',objective:{type:'location',x:-64,z:32,radius:9},reward:1100,reputation:18,tags:['police']},
      {id:'ai-city-circuit',title:'Kigali Grand Circuit',description:'Visit three different districts in one continuous drive.',objective:{type:'districts',count:3},reward:950,reputation:20,tags:['crowd','reputation']}
    ];
    return candidates.sort((a,b)=>this.score(b)-this.score(a))[0];
  }
  update(dt){
    this.timer+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.timer<4||this.cooldown>0||this.game.missions.active)return;
    this.timer=0;const mission=this.choose();this.game.missions.missions=this.game.missions.missions.filter(m=>!m.id.startsWith('ai-'));this.game.missions.missions.push(mission);this.game.missions.start(mission.id);
    this.game.events.emit('mission:director',{mission,reason:(this.world?.phase||'CITY AI')});
    const el=document.querySelector('#mission-ai');if(el)el.textContent=`MISSION AI: ${mission.title.toUpperCase()}`;
  }
}
