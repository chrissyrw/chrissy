export class EconomySystem {
  constructor(game){
    this.game=game;
    this.shops={
      'Kigali Motors':{type:'dealer',price:1200,rep:2},
      'Kimironko Market':{type:'market',price:120,rep:1},
      'Nyamirambo Cafe':{type:'food',price:45,rep:1},
      'Kigali Fuel':{type:'fuel',price:85,rep:1}
    };
    this.cooldown=0;
  }
  getShop(name){return this.shops[name]||null;}
  rewardScale(){return this.game.state.get().economy?.rewardScale||1;}
  interact(name){
    const shop=this.getShop(name); if(!shop)return false;
    const s=this.game.state.get();
    if(shop.type==='fuel'){
      const amount=Math.min(25,100-(s.economy?.fuel??100));
      const cost=Math.round(amount*shop.price/10);
      if(amount>0&&s.player.money>=cost){this.game.state.update({player:{money:s.player.money-cost},economy:{...(s.economy||{}),fuel:(s.economy?.fuel??100)+amount}});this.game.events.emit('economy:purchase',{name,cost});return true;}
    } else if(s.player.money>=shop.price){
      this.game.state.update({player:{money:s.player.money-shop.price,reputation:s.player.reputation+shop.rep}});
      this.game.events.emit('economy:purchase',{name,cost:shop.price}); return true;
    }
    return false;
  }
  missionReward(base){return Math.round(base*this.rewardScale());}
  update(dt){this.cooldown=Math.max(0,this.cooldown-dt);}
}
