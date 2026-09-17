const ABILITIES={
  'kigali-runner':{label:'Urban Control',speed:1.03,handling:1.08},
  'moto-taxi':{label:'Traffic Thread',traffic:1.35,opportunity:1.2},
  'market-hauler':{label:'Cargo Runner',cargo:2.5,economy:1.18,handling:.92},
  'e-moto':{label:'Electric Flow',traffic:1.5,opportunity:1.35,energy:true},
  'rebero-rally':{label:'Hill Rally',hill:1.45,handling:1.18},
  'hill-buggy':{label:'Steep Grip',hill:2.0,terrain:1.8,handling:1.28},
  'mount-kigali-gt':{label:'Grand Route',speed:1.16,road:1.25},
  'safari-4x4':{label:'All Terrain',terrain:2.2,hill:1.8,weather:1.6,recovery:1.5},
  'skyline-coupe':{label:'Velocity Line',speed:1.3,road:1.35,heat:1.35},
  'kigali-vip':{label:'City Access',social:1.5,economy:1.3,police:1.12},
  'night-runner-x':{label:'Night Network',night:2.2,social:1.8,opportunity:1.55,heat:1.2}
};

export class VehicleAbilitySystem{
  constructor(game){this.game=game;this.last='';this.bind();}
  bind(){
    this.game.events.on('vehicle:changed',()=>this.refresh());
    this.game.events.on('equipment:toggled',()=>this.refresh());
  }
  active(){const v=this.game.vehicles?.active;return v?.name||'';}
  vehicle(){const n=this.active();return this.game.vehicleOwnership?.find(n);}
  ability(){const v=this.vehicle();return v?ABILITIES[v.id]||{}:{};}
  has(id){return !!this.game.equipment?.has(id);}
  multiplier(key){
    const a=this.ability();let m=Number(a[key]||1);
    if(key==='hill'&&this.has('terrain-kit'))m*=1.35;
    if(key==='terrain'&&this.has('terrain-kit'))m*=1.4;
    if(key==='opportunity'&&this.has('city-scanner'))m*=1.35;
    if(key==='social'&&this.has('signal-beacon'))m*=1.25;
    if(key==='night'&&this.has('smart-dash'))m*=1.3;
    if(key==='weather'&&this.has('weather-node'))m*=1.3;
    if(key==='recovery'&&this.has('rapid-repair'))m*=1.35;
    if(key==='cargo'&&this.has('mobile-workshop'))m*=1.15;
    return m;
  }
  canAccess(type){return this.multiplier(type)>1.2;}
  refresh(){
    const a=this.ability();const v=this.vehicle();
    const signature=v?`${v.name}:${a.label||'STANDARD'}`:'';
    if(signature!==this.last){this.last=signature;this.game.events.emit('vehicle:ability',{vehicle:v,ability:a.label||'STANDARD'});}
  }
  update(dt){
    const v=this.game.vehicles?.active; if(!v)return;
    const a=this.ability();
    const equipment=this.game.equipment;
    if(this.has('rapid-repair')&&v.damage>0&&v.speed<2)v.damage=Math.max(0,v.damage-dt*.35);
    if(a.energy)this.game.state.update({vehicleAbility:{energy:true}});
    if(this.has('weather-node'))this.game.state.update({vehicleAbility:{weatherForecast:true}});
    const el=document.querySelector('#vehicle-ability');
    if(el)el.textContent=`ABILITY: ${a.label||'STANDARD'}${equipment?.active?.length?` · GEAR ${equipment.active.length}`:''}`;
  }
}
