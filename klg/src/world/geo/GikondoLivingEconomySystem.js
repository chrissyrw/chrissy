const BUSINESS_SEEDS=[
 {id:'gikondo-workshops',name:'Gikondo Workshop Network',type:'mechanic',stock:72,capacity:100,basePrice:180,demand:1.05},
 {id:'gikondo-cargo',name:'Gikondo Cargo Exchange',type:'logistics',stock:68,capacity:100,basePrice:260,demand:1.1},
 {id:'gikondo-market',name:'Gikondo Local Market',type:'market',stock:78,capacity:100,basePrice:120,demand:1.08},
 {id:'gikondo-food',name:'Gikondo Food & Social',type:'food',stock:82,capacity:100,basePrice:55,demand:.98},
 {id:'gikondo-services',name:'Gikondo Local Services',type:'services',stock:74,capacity:100,basePrice:90,demand:1}
];
export class GikondoLivingEconomySystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().gikondoEconomy||{active:false,cycle:0,pressure:0,trade:0,orders:0,updatedAt:0,businesses:{}};
  this.ensureBusinesses();this.bind();this.sync();
 }
 ensureBusinesses(){
  if(Object.keys(this.state.businesses).length)return;
  for(const b of BUSINESS_SEEDS)this.state.businesses[b.id]={...b,sales:0,revenue:0,profit:0,open:true};
 }
 bind(){
  this.game.events.on('gikondo:deep-dive-active',()=>this.activate());
  this.game.events.on('gikondo:physical-layer',()=>this.activate());
  this.game.events.on('economy:purchase',e=>this.purchaseSignal(e));
  this.game.events.on('business:orders',e=>this.onOrders(e));
  this.game.events.on('traffic:incident',()=>this.pressure(.06));
  this.game.events.on('economy:state-shift',e=>{if(this.isGikondo(e?.district))this.pressure(Number(e.impact||0));});
  this.game.events.on('mission:completed',e=>{if(this.isGikondo(e?.district))this.tradeSignal(.08);});
  this.game.events.on('mission:failed',e=>{if(this.isGikondo(e?.district))this.pressure(.1);});
 }
 isGikondo(d){return String(d||'').toUpperCase()==='GIKONDO';}
 activate(){this.state.active=true;this.game.events.emit('gikondo:economy-active',{district:'Gikondo',businesses:this.snapshot()});}
 pressure(v){if(!this.state.active)return;this.state.pressure=Math.max(-1,Math.min(1,this.state.pressure+v));}
 tradeSignal(v){if(!this.state.active)return;this.state.trade=Math.min(1,this.state.trade+v);}
 purchaseSignal(e={}){
  if(!this.state.active)return;
  const text=String(e.name||'').toLowerCase();
  const b=Object.values(this.state.businesses).find(x=>text.includes(x.type)||text.includes('gikondo'));
  if(!b)return;
  b.stock=Math.max(0,b.stock-1);b.sales++;b.revenue+=Number(e.cost||b.basePrice);b.profit+=Math.round(Number(e.cost||b.basePrice)*.2);b.demand=Math.min(1.8,b.demand+.035);this.tradeSignal(.025);
 }
 cycle(){
  const activity=Number(this.game.state.get().economy?.districtActivity?.Gikondo||1);
  for(const b of Object.values(this.state.businesses)){
   const pressure=this.state.pressure*.12;
   const trade=this.state.trade*.18;
   b.demand=Math.max(.65,Math.min(1.8,b.demand+pressure+trade+(activity-1)*.04));
   const target=b.demand>1.25?92:b.demand<.85?62:76;
   b.stock=Math.max(0,Math.min(b.capacity,b.stock+(target-b.stock)*.12));
   b.open=b.stock>3;
   b.profit=Math.max(0,b.profit);
  }
  const low=Object.values(this.state.businesses).filter(b=>b.stock<32&&b.open);
  this.state.orders+=low.length;
  if(low.length)this.game.events.emit('gikondo:economic-orders',{district:'Gikondo',orders:low.map(b=>({business:b.id,name:b.name,type:b.type,reward:Math.round(b.basePrice*b.demand),urgency:Math.min(1,(40-b.stock)/40)}))});
  this.game.events.emit('gikondo:economy-shift',{district:'Gikondo',pressure:this.state.pressure,trade:this.state.trade,businesses:this.snapshot()});
  this.state.pressure*=.82;this.state.trade*=.9;
 }
 snapshot(){return Object.values(this.state.businesses).map(b=>({id:b.id,name:b.name,type:b.type,stock:Math.round(b.stock),demand:+b.demand.toFixed(2),sales:b.sales,profit:Math.round(b.profit),open:b.open}));}
 update(dt){
  if(!this.state.active)return this.sync();
  this.state.cycle+=dt;
  if(this.state.cycle>=6){this.state.cycle=0;this.cycle();}
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({gikondoEconomy:this.state});}
}
