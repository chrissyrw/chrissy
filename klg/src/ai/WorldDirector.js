import * as THREE from 'three';

export class WorldDirector {
  constructor(game){
    this.game=game;this.timer=0;this.phase='CALM';this.heat=0;this.stress=0;this.last={};this.bind();
  }
  bind(){
    this.game.events.on('population:director',d=>{this.last.population=d;});
    this.game.events.on('traffic:director',d=>{this.last.traffic=d;});
    this.game.events.on('city:event',e=>{this.last.city=e;this.stress=Math.min(100,this.stress+(e.type==='ROAD INCIDENT'?22:10));});
    this.game.events.on('wanted:changed',d=>{this.heat=Math.min(100,(d?.level||0)*20);});
  }
  hour(){return Math.floor(this.game.state.get().world.time/60)%24;}
  weather(){return this.game.state.get().world.weather||'clear';}
  populationPressure(){const zones=this.last.population?.zones||{};const values=Object.values(zones).map(z=>z.pressure||0);return values.length?values.reduce((a,b)=>a+b,0)/values.length:1;}
  choosePhase(){
    const h=this.hour(),weather=this.weather(),traffic=this.last.traffic?.congestion||0,pop=this.populationPressure();
    if(weather==='storm')return 'STORM RESPONSE';
    if(this.heat>=60)return 'POLICE ALERT';
    if(this.stress>=70)return 'CITY INCIDENT';
    if(traffic>=55)return 'TRAFFIC CRUNCH';
    if((h>=7&&h<9)||(h>=16&&h<19))return 'RUSH HOUR';
    if(h>=22||h<5)return pop>.95?'NIGHT LIFE':'NIGHT CALM';
    if(pop>1.35)return 'HIGH CITY LIFE';
    return 'CALM CITY';
  }
  directives(){
    const phase=this.phase;return {
      phase,
      trafficScale:phase==='TRAFFIC CRUNCH'?1.22:phase==='RUSH HOUR'?1.12:phase==='NIGHT CALM'?.72:1,
      crowdScale:phase==='HIGH CITY LIFE'?1.3:phase==='NIGHT CALM'?.58:phase==='NIGHT LIFE'?1.08:1,
      policeResponse:phase==='POLICE ALERT'?1.5:phase==='CITY INCIDENT'?1.25:1,
      weatherResponse:phase==='STORM RESPONSE'?1.45:1,
      missionIntensity:phase==='POLICE ALERT'||phase==='CITY INCIDENT'?1.3:phase==='TRAFFIC CRUNCH'?1.12:1
    };
  }
  update(dt){
    this.timer+=dt;this.stress=Math.max(0,this.stress-dt*1.8);if(this.timer<3)return;this.timer=0;
    this.phase=this.choosePhase();const directives=this.directives();
    this.game.events.emit('ai:world-director',{...directives,hour:this.hour(),weather:this.weather(),heat:this.heat,stress:Math.round(this.stress),population:this.populationPressure(),congestion:this.last.traffic?.congestion||0});
    const el=document.querySelector('#world-ai');if(el)el.textContent=`WORLD AI: ${phaseLabel(this.phase)} · HEAT ${Math.round(this.heat)} · TRAFFIC ${this.last.traffic?.congestion||0}%`;
  }
}
function phaseLabel(v){return v.replace(' RESPONSE','').replace(' CITY','').replace('CRUNCH','CRUNCH');}
