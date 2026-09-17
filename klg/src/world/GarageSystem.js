export class GarageSystem {
  constructor(game){this.game=game;this.repairCost=180;this.upgradeCost=350;}
  discount(){return this.game.state.get().economy?.garageDiscount||1;}
  maxUpgrade(){return this.game.state.get().economy?.maxUpgrade||1;}
  repair(){
    const v=this.game.vehicles.active; const s=this.game.state.get();
    if(!v)return false;
    const cost=Math.ceil((100-(v.health??100))*1.8*this.discount());
    if(cost>0&&s.player.money>=cost){v.health=100;this.game.state.update({player:{money:s.player.money-cost}});this.game.events.emit('garage:repair',{cost});return true;}
    return false;
  }
  upgrade(){
    const v=this.game.vehicles.active; const s=this.game.state.get();
    const level=s.garage?.upgrades?.[v?.name]||0;
    const cost=Math.ceil(this.upgradeCost*this.discount()*(1+level*.15));
    if(!v||level>=this.maxUpgrade()||s.player.money<cost)return false;
    v.maxSpeed=(v.maxSpeed||70)+8; v.accel=(v.accel||22)+2;
    this.game.state.update({player:{money:s.player.money-cost},garage:{...(s.garage||{}),upgrades:{...((s.garage||{}).upgrades||{}),[v.name]:level+1}}});
    this.game.events.emit('garage:upgrade',{name:v.name,cost,level:level+1,maxUpgrade:this.maxUpgrade()}); return true;
  }
  update(){}
}
