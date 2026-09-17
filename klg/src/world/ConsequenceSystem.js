export class ConsequenceSystem {
  constructor(game){
    this.game=game;
    this.memory=[];
    const saved=game.state.get().worldMemory;
    if(Array.isArray(saved))this.memory=saved;
    game.events.on('opportunity:resolved',o=>this.resolve(o));
    game.events.on('opportunity:rejected',o=>this.remember({kind:'passed',title:o?.title,district:o?.district}));
  }
  resolve(o={}){
    const s=this.game.state.get();
    const reward=Number(o.reward||0),rep=Number(o.rep||0);
    const heat=o.type==='RISK'?1:0;
    this.game.state.update({
      player:{money:Number(s.player.money||0)+reward,reputation:Number(s.player.reputation||0)+rep,xp:Number(s.player.xp||0)+rep*12},
      security:{...s.security,heat:Math.min(100,Number(s.security?.heat||0)+heat)},
      worldMemory:this.memory
    });
    this.remember({kind:'completed',title:o.title,district:o.district,type:o.type,reward,at:Date.now()});
    this.game.events.emit('world:consequence',{title:o.title,reward,rep,heat,district:o.district});
  }
  remember(item){
    this.memory=[item,...this.memory].slice(0,12);
    this.game.state.update({worldMemory:this.memory});
  }
  update(dt){
    if(this.memory.length>12)this.memory=this.memory.slice(0,12);
    const el=document.querySelector('#consequence');
    if(el){const last=this.memory[0];el.textContent=last?`CITY MEMORY: ${last.kind.toUpperCase()} · ${last.title}`:'CITY MEMORY: NONE';}
  }
}
