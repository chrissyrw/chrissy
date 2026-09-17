export class VehicleCustomizationSystem {
  constructor(game){this.game=game;this.palettes={red:0xc52d2d,blue:0x2457a6,black:0x15191d,white:0xe9ecef,gold:0xd5a928};this.prices={paint:120,wheels:180,tires:160,engine:420,brakes:260,suspension:300};}
  getVehicle(){return this.game.vehicles.active;}
  apply(type,value){
    const v=this.getVehicle(),s=this.game.state.get();if(!v)return false;
    const price=this.prices[type]||0;if(s.player.money<price)return false;
    if(type==='paint'){const c=this.palettes[value]??this.palettes.red;v.mesh.children[0].material.color.setHex(c);v.paint=value;}
    if(type==='wheels'){v.wheelStyle=value;this.game.vehicles.setWheelStyle(v,value);}
    if(type==='tires'){v.tireLevel=(v.tireLevel||0)+1;v.grip=Math.min(.99,(v.grip||.92)+.035);}
    if(type==='engine'){v.engineLevel=(v.engineLevel||0)+1;v.maxSpeed=(v.maxSpeed||70)+4;v.accel=(v.accel||10)+1.5;}
    if(type==='brakes'){v.brakeLevel=(v.brakeLevel||0)+1;v.brakePower=(v.brakePower||1)+.15;}
    if(type==='suspension'){v.suspensionLevel=(v.suspensionLevel||0)+1;v.steer=(v.steer||.9)+.04;}
    const upgrades={...(s.garage?.upgrades||{}),[v.name]:{paint:v.paint||'red',wheels:v.wheelStyle||'stock',tires:v.tireLevel||0,engine:v.engineLevel||0,brakes:v.brakeLevel||0,suspension:v.suspensionLevel||0}};
    this.game.state.update({player:{money:s.player.money-price},garage:{...(s.garage||{}),upgrades}});
    this.game.events.emit('vehicle:customized',{name:v.name,type,value,price});return true;
  }
  repair(){return this.game.garage.repair();}
  update(){const v=this.getVehicle(),el=document.querySelector('#garage');if(el)el.textContent=v?`GARAGE · ${v.name} · HP ${Math.round(v.health)} · ENGINE ${v.engineLevel||0}`:'GARAGE · NO VEHICLE';}
}
