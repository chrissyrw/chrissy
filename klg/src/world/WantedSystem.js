export class WantedSystem {
  constructor(game){this.game=game;this.heat=0;this.wanted=0;this.cooldown=0;}
  incident(amount=1){this.heat=Math.min(100,this.heat+amount*18);this.wanted=Math.min(5,Math.max(this.wanted,Math.ceil(this.heat/20)));this.cooldown=12;this.game.events.emit('police:alert',{level:this.wanted});}
  update(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);
    const p=this.game.vehicles.active?.mesh||this.game.player;
    if(this.wanted>0&&this.cooldown===0){const nearby=this.game.police.units.some(u=>u.position.distanceTo(p.position)<45);if(!nearby)this.heat=Math.max(0,this.heat-dt*3);if(this.heat<=0)this.wanted=0;else this.wanted=Math.min(5,Math.ceil(this.heat/20));}
    const el=document.querySelector('#wanted');if(el)el.textContent=this.wanted?'WANTED '+this.wanted+'/5':'WANTED: CLEAR';
  }
}
