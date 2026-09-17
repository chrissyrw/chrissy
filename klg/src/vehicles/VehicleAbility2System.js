const PROFILES={
  'Kigali Runner':{road:1.05,handling:1.08},'Moto Taxi':{traffic:1.45,opportunity:1.2},'Market Hauler':{cargo:3,economy:1.25,handling:.9},'KGL E-Moto':{traffic:1.6,opportunity:1.4,noise:.35},'Rebero Rally':{hill:1.55,handling:1.18},'Hill Buggy':{hill:2.2,terrain:2,handling:1.3},'Mount Kigali GT':{road:1.2,speed:1.18},'Kigali Safari 4x4':{terrain:2.4,hill:1.9,weather:1.8,recovery:1.5},'Skyline Coupe':{speed:1.32,road:1.3,heat:1.4},'Kigali VIP':{social:1.55,economy:1.35,police:1.15},'Night Runner X':{night:2.4,social:1.9,opportunity:1.7,heat:1.25}};
const EQUIP={
  'terrain-kit':{terrain:1.4,hill:1.35},'city-scanner':{opportunity:1.35,traffic:1.15},'smart-dash':{night:1.3,social:1.2},'rapid-repair':{recovery:1.4},'signal-beacon':{social:1.3},'weather-node':{weather:1.35},'drone-scout':{exploration:1.5},'mobile-workshop':{recovery:1.2,cargo:1.15}
};

export class VehicleAbility2System{
  constructor(game){this.game=game;this.cooldowns={};this.lastDistrict='';}
  active(){return this.game.vehicles?.active;}
  profile(){return PROFILES[this.active()?.name]||{};}
  mult(key){let m=this.profile()[key]||1;for(const id of this.game.equipment?.active||[]){const e=EQUIP[id];if(e)m*=e[key]||1;}return m;}
  district(){return this.game.state.get().world?.district||'Kimironko';}
  isNight(){const t=this.game.state.get().world?.time||0;return t>=19*60||t<6*60;}
  update(dt){
    const v=this.active();if(!v)return;
    for(const k of Object.keys(this.cooldowns))this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);
    const district=this.district();const weather=this.game.state.get().world?.weather||'clear';
    if(district!==this.lastDistrict){this.lastDistrict=district;this.game.events.emit('vehicle:ability-zone',{district,vehicle:v.name});}
    const speed=Number(v.speed||0);
    if(this.mult('heat')>1.25&&speed>18)this.heatPulse(dt);
    if(this.mult('recovery')>1.25&&speed<2)this.recover(dt);
    if(this.mult('night')>1.5&&this.isNight())this.nightPulse(dt);
    if(this.mult('weather')>1.25&&weather!=='clear')this.weatherPulse(dt);
    if(this.mult('opportunity')>1.2)this.opportunityPulse(dt);
    if(this.mult('social')>1.25)this.socialPulse(dt);
    const state=this.game.state.get();
    this.game.state.update({vehicleAbility:{vehicle:v.name,district,terrain:this.mult('terrain'),hill:this.mult('hill'),traffic:this.mult('traffic'),night:this.isNight(),weather,heat:this.mult('heat'),social:this.mult('social'),cargo:this.mult('cargo')}});
    const el=document.querySelector('#vehicle-ability');if(el)el.textContent=`ABILITY 2.0: ${v.name} · ${this.mode()}`;
  }
  mode(){const p=this.profile();if(p.night&&this.isNight())return'NIGHT NETWORK';if(p.terrain||p.hill)return'ALL-TERRAIN';if(p.traffic)return'TRAFFIC FLOW';if(p.cargo)return'CARGO MODE';if(p.social)return'CITY ACCESS';if(p.speed)return'VELOCITY';return'URBAN CONTROL';}
  pulse(key,event,payload={}){if(this.cooldowns[key]>0)return;this.cooldowns[key]=4;this.game.events.emit(event,{vehicle:this.active()?.name,...payload});}
  heatPulse(dt){this.pulse('heat','vehicle:heat-surge',{amount:dt*2});}
  recover(dt){if(!this.active()?.damage)return;this.active().damage=Math.max(0,this.active().damage-dt*.12);}
  nightPulse(){this.pulse('night','vehicle:night-network',{bonus:this.mult('night')});}
  weatherPulse(){this.pulse('weather','vehicle:weather-adapt',{bonus:this.mult('weather')});}
  opportunityPulse(){this.pulse('opportunity','vehicle:opportunity-boost',{bonus:this.mult('opportunity')});}
  socialPulse(){this.pulse('social','vehicle:social-boost',{bonus:this.mult('social')});}
  terrainAccess(){return this.mult('terrain')>1.35||this.mult('hill')>1.35;}
  trafficFlow(){return this.mult('traffic')>1.2;}
  cargoCapacity(){return Math.max(1,Math.round(this.mult('cargo')));}
}
