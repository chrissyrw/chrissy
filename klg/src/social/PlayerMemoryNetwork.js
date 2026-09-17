const MAX_MEMORIES=32;
const MEMORY_TYPES=['encounter','help','rivalry','cooperation','discovery'];

export class PlayerMemoryNetwork {
  constructor(game){
    this.game=game;
    const saved=game.state.get().socialMemory||{};
    this.memories=Array.isArray(saved.memories)?saved.memories:[];
    this.reputations=saved.reputations||{};
    this.bind();
  }
  bind(){
    this.game.events.on('social:recognized',e=>this.remember('encounter',e));
    this.game.events.on('social:opportunity',e=>this.remember('cooperation',e));
    this.game.events.on('opportunity:resolved',e=>this.remember('discovery',e));
  }
  remember(type,data={}){
    if(!MEMORY_TYPES.includes(type))return;
    const id=String(data.id||data.socialId||data.name||data.playerId||'city-event');
    const memory={id,type,name:data.name||data.displayName||id,district:data.district||this.game.state.get().world.district,time:this.game.state.get().world.time,trust:Number(data.trust||0),note:this.note(type)};
    const duplicate=this.memories.find(m=>m.id===id&&m.type===type&&m.district===memory.district);
    if(duplicate){duplicate.time=memory.time;duplicate.trust=Math.max(duplicate.trust,memory.trust);}
    else this.memories.unshift(memory);
    this.memories=this.memories.slice(0,MAX_MEMORIES);
    if(id!=='city-event')this.reputations[id]=Math.min(100,(this.reputations[id]||0)+(type==='cooperation'?4:type==='encounter'?1:2));
    this.sync();
  }
  note(type){return {encounter:'MET HERE',help:'HELPED YOU',rivalry:'RIVALRY',cooperation:'WORKED TOGETHER',discovery:'SHARED HISTORY'}[type]||'REMEMBERED';}
  known(id){return this.memories.filter(m=>m.id===id).length;}
  reputation(id){return Math.round(this.reputations[id]||0);}
  recent(limit=5){return this.memories.slice(0,limit);}
  sync(){this.game.state.update({socialMemory:{memories:[...this.memories],reputations:{...this.reputations}}});this.game.events.emit('social:memory-updated',{recent:this.recent(),reputations:{...this.reputations}});}
  update(){
    const el=document.querySelector('#social');
    if(!el)return;
    const latest=this.memories.find(m=>m.id!=='city-event');
    if(latest)el.textContent=`MEMORY: ${latest.note} · ${latest.name} · ${latest.district}`;
  }
}
