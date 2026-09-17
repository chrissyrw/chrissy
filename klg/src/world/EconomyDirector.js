export class EconomyDirector {
  constructor(game){this.game=game;this.timer=0;this.last={};this.world={};this.bind();}
  bind(){
    this.game.events.on('ai:world-director',d=>{this.world=d;});
    this.game.events.on('city:event',e=>{this.last.event=e;});
    this.game.events.on('economy:purchase',e=>{this.last.purchase=e;});
  }
  hour(){return Math.floor(this.game.state.get().world.time/60)%24;}
  demand(){
    const h=this.hour(),w=this.game.state.get().world.weather,d=this.world;
    let fuel=1,market=1,food=1,dealer=1;
    if(h>=7&&h<10){fuel*=1.15;food*=1.18;market*=1.12;}
    if(h>=17&&h<21){fuel*=1.2;food*=1.25;market*=1.16;}
    if(h>=22||h<5){food*=1.1;dealer*=.9;}
    if(w==='storm'){fuel*=1.3;food*=1.12;market*=1.08;}
    if((d?.congestion||0)>45){fuel*=1.12;food*=1.08;}
    if((d?.population||1)>1.2){market*=1.18;food*=1.16;}
    return {fuel,market,food,dealer};
  }
  apply(){
    const demand=this.demand(),s=this.game.state.get();
    const base=this.game.economy.baseShops||this.game.economy.shops;
    if(!this.game.economy.baseShops)this.game.economy.baseShops=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,{...v}]));
    const prices={
      'Kigali Motors':Math.round(this.game.economy.baseShops['Kigali Motors'].price*Math.max(.8,Math.min(1.3,demand.dealer))),
      'Kimironko Market':Math.round(this.game.economy.baseShops['Kimironko Market'].price*Math.max(.8,Math.min(1.35,demand.market))),
      'Nyamirambo Cafe':Math.round(this.game.economy.baseShops['Nyamirambo Cafe'].price*Math.max(.8,Math.min(1.35,demand.food))),
      'Kigali Fuel':Math.round(this.game.economy.baseShops['Kigali Fuel'].price*Math.max(.8,Math.min(1.4,demand.fuel)))
    };
    for(const [name,p] of Object.entries(prices))if(this.game.economy.shops[name])this.game.economy.shops[name].price=p;
    const rewardScale=Math.max(.9,Math.min(1.35,(demand.market+demand.food+demand.fuel)/3));
    this.game.events.emit('economy:director',{hour:this.hour(),weather:s.world.weather,demand,prices,rewardScale});
    const el=document.querySelector('#economy-ai');if(el)el.textContent=`ECONOMY AI · FUEL ${prices['Kigali Fuel']} · MARKET ${prices['Kimironko Market']}`;
  }
  update(dt){this.timer+=dt;if(this.timer<5)return;this.timer=0;this.apply();}
}
