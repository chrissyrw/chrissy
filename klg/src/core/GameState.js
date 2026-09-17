const STORAGE_KEY = 'klg_game_state_v3';
const DEFAULT_STATE = {
  version: 3,
  player: { name: 'KLG Legend', health: 100, stamina: 100, money: 500, reputation: 0, xp: 0, level: 1, unlocks: [], position: { x: 0, y: 1.25, z: 0 } },
  world: { day: 1, time: 8 * 60, weather: 'clear', district: 'Kimironko' },
  mission: null, inventory: [], unlockedLocations: ['Kimironko'],
  ai: { phase: 'calm' }, economy: { fuel: 100, prices: {}, businesses: {} },
  garage: { owned: ['Kigali Runner'], active: 'Kigali Runner', upgrades: {} },
  security: { wanted: 0, heat: 0, lastIncident: 0 }, navigation: { target: null, route: [] },
  vehicle: { health: 100, engine: 100, tires: 100, brakes: 100 }
};
function clone(value){return JSON.parse(JSON.stringify(value));}
export class GameState {
  constructor(){this.state=clone(DEFAULT_STATE);this.listeners=new Set();}
  get(){return this.state;}
  reset(){this.state=clone(DEFAULT_STATE);this.emit();}
  update(path,value){
    if(typeof path==='object'){
      this.state={...this.state,...path,world:{...this.state.world,...(path.world||{})},player:{...this.state.player,...(path.player||{})},ai:{...this.state.ai,...(path.ai||{})},economy:{...this.state.economy,...(path.economy||{})},garage:{...this.state.garage,...(path.garage||{})},security:{...this.state.security,...(path.security||{})},navigation:{...this.state.navigation,...(path.navigation||{})},vehicle:{...this.state.vehicle,...(path.vehicle||{})}};this.emit();return;
    }
    const parts=path.split('.');let target=this.state;for(let i=0;i<parts.length-1;i++)target=target[parts[i]];target[parts.at(-1)]=value;this.emit();
  }
  save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(this.state));return true;}
  load(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return false;try{const saved=JSON.parse(raw);this.state={...clone(DEFAULT_STATE),...saved,world:{...DEFAULT_STATE.world,...(saved.world||{})},player:{...DEFAULT_STATE.player,...(saved.player||{})},ai:{...DEFAULT_STATE.ai,...(saved.ai||{})},economy:{...DEFAULT_STATE.economy,...(saved.economy||{})},garage:{...DEFAULT_STATE.garage,...(saved.garage||{})},security:{...DEFAULT_STATE.security,...(saved.security||{})},navigation:{...DEFAULT_STATE.navigation,...(saved.navigation||{})},vehicle:{...DEFAULT_STATE.vehicle,...(saved.vehicle||{})}};this.emit();return true;}catch{return false;}}
  subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  emit(){for(const listener of this.listeners)listener(this.state);}
}
