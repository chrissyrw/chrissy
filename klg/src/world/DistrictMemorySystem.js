const DEFAULT_MEMORY={accidents:0,helped:0,shortages:0,policeHeat:0,lastEvent:0};
const DISTRICTS=['Kimironko','Nyabugogo','Rebero','Nyamirambo','CBD','Mount Kigali'];

export class DistrictMemorySystem {
  constructor(game){
    this.game=game;
    const saved=game.state.get().districtMemory||{};
    this.memory=Object.fromEntries(DISTRICTS.map(d=>[d,{...DEFAULT_MEMORY,...(saved[d]||{})}]));
    this.bind();this.sync();
  }
  bind(){
    this.game.events.on('city:event',e=>this.remember(e?.type,e?.name));
    this.game.events.on('world:consequence',e=>this.consequence(e));
    this.game.events.on('opportunity:resolved',e=>this.opportunity(e));
  }
  district(value){const d=DISTRICTS.find(x=>x.toLowerCase()===String(value||'').toLowerCase());return d||this.game.state.get().world.district||'Kimironko';}
  touch(d){d.lastEvent=this.game.state.get().world.time||0;}
  remember(type,name){const key=this.district(this.game.state.get().world.district);const m=this.memory[key];if(String(type||'').includes('TRAFFIC')||String(name||'').includes('Road'))m.accidents++;if(String(type||'').includes('MARKET'))m.shortages++;if(String(type||'').includes('NIGHT'))m.helped++;this.touch(m);this.sync();}
  consequence(e={}){const m=this.memory[this.district(e.district)];if(!m)return;if(e.type==='police'||Number(e.heat)>0)m.policeHeat++;m.helped+=e.rep>0?1:0;this.touch(m);this.sync();}
  opportunity(e={}){const m=this.memory[this.district(e.district)];if(!m)return;m.helped++;this.touch(m);this.sync();}
  pressure(district){const m=this.memory[this.district(district)];return {risk:Math.min(1,(m.accidents+m.policeHeat)/10),demand:Math.min(1,m.shortages/6),trust:Math.min(1,m.helped/8)};}
  decay(dt){for(const m of Object.values(this.memory)){const f=Math.max(0,1-dt/1800);m.accidents*=f;m.shortages*=f;m.policeHeat*=f;m.helped*=f;}}
  sync(){this.game.state.update({districtMemory:JSON.parse(JSON.stringify(this.memory))});}
  update(dt){this.decay(dt);const d=this.district(this.game.state.get().world.district);const p=this.pressure(d);const el=document.querySelector('#district-memory');if(el)el.textContent=`MEMORY: ${d.toUpperCase()} · RISK ${Math.round(p.risk*100)} · TRUST ${Math.round(p.trust*100)}`;}
}
