const DEFAULT_TRAITS={courier:0,racer:0,night:0,lowprofile:0,operator:0,explorer:0};

export class PlayerIdentitySystem {
  constructor(game){
    this.game=game;
    this.traits={...DEFAULT_TRAITS};
    const saved=game.state.get().identity;
    if(saved?.traits)this.traits={...DEFAULT_TRAITS,...saved.traits};
    this.game.events.on('opportunity:accepted',o=>this.bump(o?.identity,.5));
    this.game.events.on('opportunity:resolved',o=>this.bump(o?.identity,1));
    this.game.events.on('opportunity:rejected',o=>this.bump('explorer',.05));
    this.game.events.on('vehicle:speed',e=>{if(Number(e?.speed||0)>20)this.bump('racer',.02);});
  }
  bump(trait,amount){
    if(!trait||!(trait in this.traits))return;
    this.traits[trait]=Math.min(100,this.traits[trait]+amount);
    this.sync();
  }
  dominant(){return Object.entries(this.traits).sort((a,b)=>b[1]-a[1])[0]?.[0]||'explorer';}
  label(){return {courier:'CITY COURIER',racer:'STREET RACER',night:'NIGHT DRIVER',lowprofile:'LOW-PROFILE OPERATOR',operator:'CITY OPERATOR',explorer:'CITY EXPLORER'}[this.dominant()]||'CITY EXPLORER';}
  sync(){
    this.game.state.update({identity:{traits:{...this.traits},archetype:this.dominant(),label:this.label()}});
    this.game.events.emit('identity:changed',{traits:{...this.traits},archetype:this.dominant(),label:this.label()});
  }
  update(){
    const el=document.querySelector('#identity');if(el)el.textContent='IDENTITY: '+this.label();
  }
}
