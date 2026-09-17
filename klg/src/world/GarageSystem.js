export class GarageSystem {
  constructor(game){this.game=game;this.repairCost=180;this.upgradeCost=350;}
  repair(){
    const v=this.game.vehicles.active; const s=this.game.state.get();
    if(!v)return false;
    const health=v.health??100; const cost=Math.ceil((100-health)*1.8);
    if(cost>0&&s.player.money>=cost){v.health=100;this.game.state.update({player:{money:s.player.money-cost}});this.game.events.emit('garage:repair',{cost});return true;}
    return false;
  }
  upgrade(){
    const v=this.game.vehicles.active; const s=this.game.state.get();
    if(!v||s.player.money<this.upgradeCost)return false;
    v.maxSpeed=(v.maxSpeed||70)+8; v.accel=(v.accel||22)+2;
    this.game.state.update({player:{money:s.player.money-this.upgradeCost},garage:{...(s.garage||{}),upgrades:{...((s.garage||{}).upgrades||{}),[v.name]:((s.garage||{}).upgrades?.[v.name]||0)+1}}});
    this.game.events.emit('garage:upgrade',{name:v.name,cost:this.upgradeCost}); return true;
  }
  update(){}
}
