const EQUIPMENT=[
  {id:'city-scanner',name:'City Scanner',price:1200,level:2,description:'Reveals nearby traffic pressure, opportunities and social signals.'},
  {id:'smart-dash',name:'Smart Dash',price:1800,level:3,description:'Records memorable encounters and improves navigation context.'},
  {id:'rapid-repair',name:'Rapid Repair Kit',price:2200,level:3,description:'Repairs vehicle damage during a safe roadside stop.'},
  {id:'terrain-kit',name:'Terrain Kit',price:3000,level:4,description:'Improves grip and control on rough roads and steep hills.'},
  {id:'signal-beacon',name:'Signal Beacon',price:3400,level:4,description:'Lets nearby crew members discover your location.'},
  {id:'weather-node',name:'Weather Node',price:4800,level:5,description:'Predicts incoming weather pressure and road conditions.'},
  {id:'drone-scout',name:'Scout Drone',price:6500,level:6,description:'Provides a short-range aerial view for exploration and route planning.'},
  {id:'mobile-workshop',name:'Mobile Workshop',price:9000,level:7,description:'Turns your vehicle into a field garage for advanced tuning.'}
];

export class SpecialEquipmentSystem {
  constructor(game){
    this.game=game;
    const saved=game.state.get().equipment||{};
    this.owned=saved.owned||[];
    this.active=saved.active||[];
    this.catalog=EQUIPMENT;
    this.sync();
  }
  get state(){return this.game.state.get();}
  find(id){return this.catalog.find(x=>x.id===id||x.name===id);}
  unlocked(item){return (this.state.player.level||1)>=item.level;}
  buy(id){
    const item=this.find(id);if(!item)return {ok:false,reason:'UNKNOWN_EQUIPMENT'};
    if(this.owned.includes(item.id))return {ok:false,reason:'ALREADY_OWNED'};
    if(!this.unlocked(item))return {ok:false,reason:'LOCKED'};
    if(!this.game.stats.spendMoney(item.price))return {ok:false,reason:'INSUFFICIENT_FUNDS'};
    this.owned.push(item.id);this.sync();
    this.game.events.emit('equipment:owned',item);
    return {ok:true,item};
  }
  toggle(id){
    if(!this.owned.includes(id))return false;
    this.active=this.active.includes(id)?this.active.filter(x=>x!==id):[...this.active,id];
    this.sync();this.game.events.emit('equipment:toggled',{id,active:this.active.includes(id)});return true;
  }
  has(id){return this.owned.includes(id);}
  update(){
    const el=document.querySelector('#equipment');
    if(!el)return;
    el.textContent=`EQUIPMENT: ${this.owned.length} · ACTIVE ${this.active.length}`;
  }
  sync(){this.game.state.update({equipment:{owned:[...this.owned],active:[...this.active]}});}
}
