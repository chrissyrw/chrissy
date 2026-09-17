export class BusinessMarketSystem {
  constructor(game){this.game=game;this.timer=0;this.businesses={};this.orders=[];this.seed();this.bind();}
  seed(){
    const names=Object.keys(this.game.economy.shops||{});
    for(const name of names){const s=this.game.economy.shops[name];this.businesses[name]={name,type:s.type,stock:s.type==='fuel'?85:70,capacity:100,sales:0,revenue:0,profit:0,demand:1,trend:0,open:true};}
  }
  bind(){
    this.game.events.on('economy:director',d=>{this.lastEconomy=d;});
    this.game.events.on('economy:purchase',e=>this.sell(e.name,e.cost));
    this.game.events.on('city:event',e=>this.onCityEvent(e));
  }
  onCityEvent(e){const boost=e.type==='MARKET BUSY'?1.3:e.type==='TRAFFIC SURGE'?1.15:e.type==='NIGHT LIFE'?1.2:e.type==='ROAD INCIDENT'?.88:1;for(const b of Object.values(this.businesses))b.demand=Math.min(1.6,b.demand*boost);}
  sell(name,paid){const b=this.businesses[name];if(!b)return;if(b.stock<=0)return;b.stock=Math.max(0,b.stock-1);b.sales++;b.revenue+=paid;b.profit+=Math.round(paid*.22);}
  restock(){for(const b of Object.values(this.businesses)){const target=b.demand>1.2?90:72;const amount=Math.min(18,target-b.stock);if(amount>0)b.stock+=amount;b.demand=Math.max(.75,b.demand-.04);b.trend=(b.sales*.7+b.profit*.02);b.open=b.stock>0;}}
  createOrders(){
    const s=this.game.state.get(),d=this.lastEconomy?.demand||{};
    this.orders=Object.values(this.businesses).filter(b=>b.open&&b.stock<35).map(b=>({business:b.name,type:'RESTOCK',reward:Math.round(180*(d[b.type]||1)),distance:20+Math.round(Math.random()*70),expires:45}));
    if(this.orders.length)this.game.events.emit('business:orders',{orders:this.orders});
    if(s.player.money>0&&this.orders.length===0)this.game.events.emit('business:market-stable',{businesses:this.snapshot()});
  }
  snapshot(){return Object.values(this.businesses).map(b=>({name:b.name,type:b.type,stock:Math.round(b.stock),demand:+b.demand.toFixed(2),sales:b.sales,profit:Math.round(b.profit),open:b.open}));}
  update(dt){this.timer+=dt;if(this.timer<6)return;this.timer=0;this.restock();this.createOrders();const el=document.querySelector('#business-ai');if(el){const hot=Object.values(this.businesses).sort((a,b)=>b.demand-a.demand)[0];el.textContent=hot?`BUSINESS AI · ${hot.name.toUpperCase()} · DEMAND ${hot.demand.toFixed(2)} · STOCK ${Math.round(hot.stock)}`:'BUSINESS AI · STABLE';}}
}
