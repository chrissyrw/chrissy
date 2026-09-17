const CREW_STATES=['forming','active','fractured'];

export class DynamicCrewSystem {
  constructor(game){
    this.game=game;
    const saved=game.state.get().socialCrews||{};
    this.crews=saved.crews||[];
    this.cooldown=0;
    this.bind();
  }
  bind(){
    this.game.events.on('social:event-resolved',e=>this.onSocialEvent(e));
    this.game.events.on('social:encounter',e=>this.consider(e.callsign));
  }
  score(callsign){
    const memory=this.game.state.get().socialMemory||{};
    const rep=Number(memory.reputations?.[callsign]||0);
    const encounters=(memory.memories||[]).filter(m=>m.id===callsign).length;
    return rep+encounters*3;
  }
  consider(callsign){
    if(!callsign||this.cooldown>0)return;
    if(this.crews.some(c=>c.members.includes(callsign)))return;
    const score=this.score(callsign);
    if(score<8)return;
    const district=this.game.state.get().world.district;
    const crew={id:`crew-${Date.now().toString(36)}`,name:this.crewName(district),district,members:[this.game.state.get().social?.callsign||'YOU',callsign],state:'forming',trust:Math.min(100,score),createdAt:Date.now()};
    this.crews.unshift(crew);this.crews=this.crews.slice(0,8);this.cooldown=20;this.sync();
    this.game.events.emit('crew:formed',crew);
  }
  crewName(district){return ({Kimironko:'KIMI RUNNERS',Nyabugogo:'NYABO LINK',Rebero:'REBERO LINE',Nyamirambo:'NYAMIRAMBO CREW',CBD:'CBD NIGHTLINE','Mount Kigali':'MOUNT CIRCUIT'})[district]||'KIGALI CREW';}
  onSocialEvent(e={}){
    if(e.callsign)this.consider(e.callsign);
    const crew=this.crews.find(c=>e.callsign&&c.members.includes(e.callsign));
    if(!crew)return;
    if(e.accepted){crew.state='active';crew.trust=Math.min(100,crew.trust+5);}
    else {crew.trust=Math.max(0,crew.trust-2);if(crew.trust<5)crew.state='fractured';}
    this.sync();
  }
  update(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);
    for(const crew of this.crews){
      if(crew.state==='active'&&crew.trust>0)crew.trust=Math.max(0,crew.trust-dt*.01);
      if(crew.trust<3&&crew.state==='active')crew.state='fractured';
    }
    const el=document.querySelector('#social');
    if(el){const active=this.crews.find(c=>c.state==='active')||this.crews.find(c=>c.state==='forming');if(active)el.textContent=`CREW: ${active.name} · ${active.members.length} PLAYERS · ${active.state.toUpperCase()}`;}
  }
  sync(){this.game.state.update({socialCrews:{crews:[...this.crews]}});}
}
