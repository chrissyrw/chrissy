import * as THREE from 'three';

export class WeatherSystem {
  constructor(game) {
    this.game=game;this.time=game.state.get().world.time??480;
    this.weather=game.state.get().world.weather??'clear';this.accumulator=0;this.rain=null;
    this.environment={wetness:0,visibility:1,traction:1,traffic:1,npcActivity:1,heat:0,updatedAt:0};
    this.setWeather(this.weather);
    game.events.on('seasonal:world-shift',d=>this.adaptSeason(d));
  }
  setWeather(type){
    this.weather=type;this.game.state.update('world.weather',type);
    if(this.rain){this.game.scene.remove(this.rain);this.rain.geometry.dispose();this.rain.material.dispose();this.rain=null;}
    if(type==='rain'||type==='storm'){
      const count=type==='storm'?1800:900,positions=new Float32Array(count*3);
      for(let i=0;i<count;i++){positions[i*3]=(Math.random()-.5)*180;positions[i*3+1]=Math.random()*55;positions[i*3+2]=(Math.random()-.5)*180;}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      this.rain=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xbad7ff,size:0.11,transparent:true,opacity:0.7}));this.game.scene.add(this.rain);
    }
    this.applyEnvironment(type);
  }
  adaptSeason(d={}){
    const w=d.weather||d.season?.weather||'clear';
    const map={rain:{wetness:.8,visibility:.78,traction:.72,traffic:1.18,npcActivity:.82,heat:.15},storm:{wetness:1,visibility:.58,traction:.58,traffic:1.35,npcActivity:.65,heat:.28},sun:{wetness:.05,visibility:1.05,traction:1.02,traffic:1.08,npcActivity:1.12,heat:.35},cool:{wetness:.08,visibility:1,traction:1,traffic:.94,npcActivity:1.05,heat:-.15},mixed:{wetness:.35,visibility:.9,traction:.86,traffic:1.05,npcActivity:.98,heat:.05},clear:{wetness:0,visibility:1,traction:1,traffic:1,npcActivity:1,heat:0}};
    const p=map[w]||map.clear;this.setWeather(w);this.environment={...p,updatedAt:Date.now()};
    this.game.events.emit('weather:environment-shift',{weather:w,...this.environment});
  }
  update(dt){
    this.accumulator+=dt;this.time=(this.time+dt*.55)%1440;
    if(this.accumulator>8){this.accumulator=0;this.game.state.update('world.time',Math.floor(this.time));}
    const sun=this.game.sun;if(sun){const day=this.time/1440,angle=day*Math.PI*2-Math.PI/2;sun.position.set(Math.cos(angle)*70,Math.max(8,Math.sin(angle)*70),25);sun.intensity=Math.max(.35,Math.sin(angle)*2.2+.55);}
    if(this.rain){const p=this.rain.geometry.attributes.position.array;for(let i=1;i<p.length;i+=3){p[i]-=dt*(this.weather==='storm'?30:20);if(p[i]<0)p[i]=55;}this.rain.geometry.attributes.position.needsUpdate=true;}
    this.environment.wetness=Math.max(0,this.environment.wetness-dt*.002);
    this.game.state.update({weatherEnvironment:this.environment});
  }
  modifier(type,fallback=1){return Number(this.environment[type]??fallback);}
}