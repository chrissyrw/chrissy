export class VehicleOwnershipSystem {
  constructor(game){
    this.game=game;
    this.catalog=[
      {id:'kigali-runner',name:'Kigali Runner',class:'SPORT',price:0,level:1,reputation:0,maxSpeed:22,color:0xc52d2d},
      {id:'moto-taxi',name:'Moto Taxi',class:'MOTO',price:900,level:2,reputation:8,maxSpeed:16,color:0xf0c22b},
      {id:'market-hauler',name:'Market Hauler',class:'UTILITY',price:2600,level:3,reputation:18,maxSpeed:18,color:0x3d7a52},
      {id:'e-moto',name:'KGL E-Moto',class:'ELECTRIC',price:4200,level:3,reputation:20,maxSpeed:24,color:0x18b6a4},
      {id:'rebero-rally',name:'Rebero Rally',class:'RALLY',price:5200,level:4,reputation:30,maxSpeed:25,color:0xd38b2f},
      {id:'hill-buggy',name:'Hill Buggy',class:'BUGGY',price:7200,level:5,reputation:40,maxSpeed:27,color:0x7a5135},
      {id:'mount-kigali-gt',name:'Mount Kigali GT',class:'GT',price:9000,level:5,reputation:45,maxSpeed:30,color:0x2457a6},
      {id:'safari-4x4',name:'Kigali Safari 4x4',class:'OFFROAD',price:12500,level:6,reputation:55,maxSpeed:26,color:0x59634b},
      {id:'skyline-coupe',name:'Skyline Coupe',class:'HYPER',price:18000,level:7,reputation:70,maxSpeed:34,color:0x3b3f50},
      {id:'kigali-vip',name:'Kigali VIP',class:'LUXURY',price:15000,level:7,reputation:65,maxSpeed:28,color:0x15191d},
      {id:'night-runner-x',name:'Night Runner X',class:'SPECIAL',price:26000,level:9,reputation:85,maxSpeed:36,color:0x43206d}
    ];
    this.sync();
  }
  get state(){return this.game.state.get();}
  get catalogOwned(){return this.state.garage?.owned||[];}
  find(nameOrId){return this.catalog.find(v=>v.id===nameOrId||v.name===nameOrId);}
  isUnlocked(v){const p=this.state.player;return (p.level||1)>=v.level&&(p.reputation||0)>=v.reputation;}
  isOwned(v){return this.catalogOwned.includes(v.name);}
  available(){return this.catalog.filter(v=>this.isUnlocked(v));}
  buy(nameOrId){
    const v=this.find(nameOrId);if(!v)return {ok:false,reason:'UNKNOWN_VEHICLE'};
    if(this.isOwned(v))return {ok:false,reason:'ALREADY_OWNED',vehicle:v};
    if(!this.isUnlocked(v))return {ok:false,reason:'LOCKED',vehicle:v};
    if(!this.game.stats.spendMoney(v.price))return {ok:false,reason:'INSUFFICIENT_FUNDS',vehicle:v};
    const owned=[...this.catalogOwned,v.name];this.game.state.update({garage:{owned}});
    const existing=this.game.vehicles.vehicles.find(x=>x.name===v.name);
    const vehicle=existing||this.game.vehicles.spawn(v.name,6+owned.length*3,6+owned.length*2,v.color,v.maxSpeed);
    this.game.events.emit('vehicle:owned',{vehicle:v,instance:vehicle});return {ok:true,vehicle:v,instance:vehicle};
  }
  select(nameOrId){const v=this.find(nameOrId);if(!v||!this.isOwned(v))return false;return this.game.vehicles.selectVehicle(v.name);}
  sync(){const owned=this.catalogOwned;for(const v of this.catalog){if(!owned.includes(v.name))continue;if(v.name==='Kigali Runner')continue;if(!this.game.vehicles?.vehicles)continue;if(!this.game.vehicles.vehicles.some(x=>x.name===v.name))this.game.vehicles.spawn(v.name,6+this.game.vehicles.vehicles.length*3,6,v.color,v.maxSpeed);}}
  update(){const el=document.querySelector('#garage-ai');if(!el)return;const owned=this.catalogOwned.length,available=this.available().filter(v=>!this.isOwned(v)).length;el.textContent=`GARAGE · ${owned} OWNED · ${available} AVAILABLE`;}
}
