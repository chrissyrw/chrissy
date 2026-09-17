export class WorldPressureSystem {
  constructor(game){
    this.game=game;
    this.pressure={traffic:0,market:0,weather:0,police:0,social:0};
    this.lastCityEvent=null;
    this.game.events.on('city:event',e=>{this.lastCityEvent=e;this.bumpForEvent(e);});
    this.game.events.on('ai:world-director',d=>{this.pressure.traffic=Math.max(this.pressure.traffic,Math.min(1,d?.congestion||0));});
    this.game.events.on('ai:world',d=>{const p=String(d?.phase||'').toLowerCase();if(p.includes('police'))this.pressure.police=Math.max(this.pressure.police,.75);if(p.includes('traffic')||p.includes('rush'))this.pressure.traffic=Math.max(this.pressure.traffic,.7);if(p.includes('night'))this.pressure.social=Math.max(this.pressure.social,.65);});
  }
  bumpForEvent(e={}){
    const t=String(e.type||'');
    if(t==='TRAFFIC SURGE'||t==='ROAD INCIDENT')this.pressure.traffic=Math.max(this.pressure.traffic,.9);
    if(t==='MARKET BUSY')this.pressure.market=Math.max(this.pressure.market,.9);
    if(t==='NIGHT LIFE'||t==='CROWD EVENT')this.pressure.social=Math.max(this.pressure.social,.85);
  }
  update(dt){
    const s=this.game.state.get();
    const weather=String(s.world.weather||'clear');
    const wanted=Number(s.security?.wanted||0);
    const heat=Number(s.security?.heat||0);
    this.pressure.weather=weather==='storm'?1:weather==='rain'?.65:Math.max(0,this.pressure.weather-dt*.015);
    this.pressure.police=Math.max(this.pressure.police,wanted*.12,heat*.08);
    for(const k of Object.keys(this.pressure))this.pressure[k]=Math.max(0,Math.min(1,this.pressure[k]-dt*.018));
    const score=Object.values(this.pressure).reduce((a,b)=>a+b,0)/5;
    this.game.events.emit('world:pressure',{...this.pressure,score,lastCityEvent:this.lastCityEvent});
  }
}
