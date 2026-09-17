export class WorldState {
  constructor(game){this.game=game;this.snapshot=null;this.version=0;}
  refresh(){
    const s=this.game.state.get();
    const activeVehicle=this.game.vehicles?.active;
    const world=s.world||{};
    const player=s.player||{};
    this.snapshot={
      version:++this.version,
      time:world.time||0,
      day:world.day||1,
      weather:world.weather||'clear',
      district:world.district||'Unknown',
      money:player.money||0,
      reputation:player.reputation||0,
      level:player.level||1,
      wanted:s.security?.wanted||0,
      heat:s.security?.heat||0,
      vehicle:activeVehicle?{name:activeVehicle.name,class:activeVehicle.class||'UNKNOWN'}:null
    };
    return this.snapshot;
  }
  get(){return this.snapshot||this.refresh();}
  update(){this.refresh();}
}
