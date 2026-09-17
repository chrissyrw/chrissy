export class ProgressionSystem {
  constructor(game){this.game=game;this.bind();}
  bind(){this.game.events.on('mission:completed',m=>this.onMissionCompleted(m));}
  levelForXp(xp){return 1+Math.floor(Math.max(0,xp)/500);}
  onMissionCompleted(m){
    const s=this.game.state.get(),p=s.player;
    const bonus=Math.max(20,Math.round((m.reward||0)*0.35));
    const xp=(p.xp||0)+bonus;
    const level=this.levelForXp(xp);
    const oldLevel=p.level||1;
    const unlocks=[...(p.unlocks||[])];
    const milestones={2:'Nyamirambo',3:'Kimironko',4:'Nyabugogo',5:'Rebero',6:'Mount Kigali',7:'CBD'};
    const location=milestones[level];
    if(location&&!unlocks.includes(location))unlocks.push(location);
    this.game.state.update('player.xp',xp);
    this.game.state.update('player.level',level);
    this.game.state.update('player.unlocks',unlocks);
    this.game.events.emit('progression:updated',{xp,level,oldLevel,deltaXp:bonus,unlocked:location&&!unlocks.includes(location)?location:null});
    if(level>oldLevel)this.game.events.emit('progression:level-up',{level,unlocked:location||null});
    this.game.state.save();
    const el=document.querySelector('#progression-ai');
    if(el)el.textContent=`LEVEL ${level} · XP ${xp}`;
  }
}
