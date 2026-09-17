const ACTORS=['market','mechanic','drivers','police','nightlife'];
const DISTRICTS=['Kimironko','Nyabugogo','Rebero','Nyamirambo','CBD','Mount Kigali'];

export class RelationshipSystem {
  constructor(game){
    this.game=game;
    const saved=game.state.get().relationships||{};
    this.links={...Object.fromEntries(ACTORS.map(k=>[k,0])),...saved.links};
    this.districts={...Object.fromEntries(DISTRICTS.map(k=>[k,0])),...saved.districts};
    this.bind();
  }
  bind(){
    this.game.events.on('opportunity:accepted',o=>this.change(this.actorFor(o),2));
    this.game.events.on('opportunity:resolved',o=>this.resolve(o));
    this.game.events.on('opportunity:rejected',o=>this.change(this.actorFor(o),-0.5));
    this.game.events.on('world:consequence',o=>{if(o?.district)this.changeDistrict(o.district,Number(o.rep||0)*.35);});
  }
  actorFor(o={}){return {MARKET:'market',TRANSIT:'drivers',HILL:'mechanic',SOCIAL:'nightlife',RISK:'police'}[o.type]||'drivers';}
  clamp(v){return Math.max(-100,Math.min(100,v));}
  change(actor,amount){if(!(actor in this.links))return;this.links[actor]=this.clamp(this.links[actor]+amount);this.sync();}
  changeDistrict(district,amount){const key=DISTRICTS.find(d=>d.toLowerCase()===String(district||'').toLowerCase());if(!key)return;this.districts[key]=this.clamp(this.districts[key]+amount);this.sync();}
  resolve(o={}){const actor=this.actorFor(o);this.change(actor,4);this.changeDistrict(o.district,Math.max(1,Number(o.rep||0)*.6));}
  trust(actor){return this.links[actor]||0;}
  districtTrust(district){return this.districts[district]||0;}
  sync(){this.game.state.update({relationships:{links:{...this.links},districts:{...this.districts}}});this.game.events.emit('relationships:changed',{links:{...this.links},districts:{...this.districts}});}
  update(){
    const el=document.querySelector('#relationships');
    if(!el)return;
    const best=Object.entries(this.links).sort((a,b)=>b[1]-a[1])[0];
    el.textContent=best?`TRUST: ${best[0].toUpperCase()} ${Math.round(best[1])}`:'TRUST: NONE';
  }
}
