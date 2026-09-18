const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export class CrewRivalrySystem{
 constructor(game){this.game=game;this.tick=0;this.state=game.state.get().crewRivalry||{rivalries:[],districtPressure:{},updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:level-up',e=>this.seed(e));
  this.game.events.on('faction:rivalry-activated',e=>this.factionPressure(e));
  this.game.events.on('faction:crew-impact',e=>this.pressure(e));
  this.game.events.on('crew:progress',e=>{if((e.influence||0)>.6)this.seed(e);});
 }
 seed(e={}){
  if(!e.id)return;
  const others=Object.values(this.game.state.get().crewProgression?.crews||{}).filter(c=>c.id!==e.id&&c.district===e.district);
  if(!others.length)return;
  const other=others[0],existing=this.state.rivalries.find(r=>(r.a===e.id&&r.b===other.id)||(r.a===other.id&&r.b===e.id));
  if(existing)return;
  const r={id:'rival-'+Date.now(),a:e.id,b:other.id,district:e.district,intensity:.35,stage:'tension'};
  this.state.rivalries.push(r);this.game.events.emit('crew:rivalry-started',r);this.sync();
 }
 pressure(e={}){if(!e.district)return;this.state.districtPressure[e.district]=CLAMP((this.state.districtPressure[e.district]||0)+.03);this.sync();}
 factionPressure(e={}){if(e.district)this.state.districtPressure[e.district]=CLAMP((this.state.districtPressure[e.district]||0)+.08);}
 update(dt){this.tick+=dt;if(this.tick<3)return;this.tick=0;for(const r of this.state.rivalries){r.intensity=CLAMP(r.intensity+.005);if(r.intensity>.75)r.stage='conflict';else if(r.intensity>.5)r.stage='pressure';}for(const d of Object.keys(this.state.districtPressure))this.state.districtPressure[d]=CLAMP(this.state.districtPressure[d]-.01);this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({crewRivalry:this.state});}
}