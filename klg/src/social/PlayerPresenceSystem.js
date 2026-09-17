import * as THREE from 'three';

const CHANNEL='klg-social-v1';
const DISTRICTS=['Kimironko','Nyabugogo','Rebero','Nyamirambo','CBD','Mount Kigali'];
const COLORS=[0xffc857,0x56d6c9,0xff6b6b,0x8fa7ff,0xd18cff];

function callsign(){
  const a=['KGL','MOTO','HILL','NIGHT','CITY','REBERO','KIMI','NYABO'];
  return a[Math.floor(Math.random()*a.length)]+'-'+Math.floor(100+Math.random()*900);
}

export class PlayerPresenceSystem {
  constructor(game){
    this.game=game;
    this.id=crypto.randomUUID?.()||Math.random().toString(36).slice(2);
    const saved=game.state.get().social||{};
    this.callsign=saved.callsign||callsign();
    this.peers=new Map();
    this.markers=new Map();
    this.timer=0;
    this.broadcastTimer=0;
    this.channel=null;
    this.enabled=typeof BroadcastChannel!=='undefined';
    if(this.enabled){
      this.channel=new BroadcastChannel(CHANNEL);
      this.channel.onmessage=e=>this.receive(e.data);
      this.say('hello');
    }
    this.sync();
  }
  district(){return this.game.state.get().world.district||'Kimironko';}
  position(){
    const v=this.game.vehicles?.active?.mesh||this.game.player;
    return {x:v.position.x,z:v.position.z};
  }
  say(type){
    if(!this.channel)return;
    const p=this.position();
    this.channel.postMessage({type,from:this.id,callsign:this.callsign,x:p.x,z:p.z,district:this.district(),identity:this.game.state.get().identity?.label||'CITY EXPLORER',time:Date.now()});
  }
  receive(m){
    if(!m||m.from===this.id||!m.from)return;
    if(m.type==='goodbye'){this.remove(m.from);return;}
    this.peers.set(m.from,{...m,lastSeen:Date.now()});
    if(m.type==='hello')this.say('presence');
    this.renderPeer(m.from);
  }
  renderPeer(id){
    const p=this.peers.get(id);if(!p)return;
    let marker=this.markers.get(id);
    if(!marker){
      const group=new THREE.Group();
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.7,4,8),new THREE.MeshStandardMaterial({color:COLORS[this.markers.size%COLORS.length],roughness:.65}));
      body.position.y=.85;group.add(body);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.7,.035,8,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7}));
      ring.rotation.x=Math.PI/2;ring.position.y=.05;group.add(ring);
      marker={group,ring};this.markers.set(id,marker);this.game.scene.add(group);
    }
    marker.group.position.set(p.x,.02,p.z);
    marker.ring.rotation.z+=.02;
  }
  remove(id){
    const m=this.markers.get(id);if(m)this.game.scene.remove(m.group);
    this.markers.delete(id);this.peers.delete(id);
  }
  encounter(peer){
    if(!peer)return;
    const s=this.game.state.get();
    const known={...(s.social?.known||{})};
    const old=known[peer.callsign]||{encounters:0,trust:0};
    known[peer.callsign]={encounters:old.encounters+1,trust:Math.min(100,old.trust+3),lastSeen:Date.now(),identity:peer.identity};
    this.game.state.update({social:{callsign:this.callsign,known,encounters:Object.keys(known).length}});
    this.game.events.emit('social:encounter',{callsign:peer.callsign,...known[peer.callsign]});
  }
  update(dt){
    this.timer+=dt;this.broadcastTimer+=dt;
    if(this.broadcastTimer>1){this.broadcastTimer=0;this.say('presence');}
    const me=this.position();
    for(const [id,p] of this.peers){
      if(Date.now()-p.lastSeen>5000){this.remove(id);continue;}
      const d=Math.hypot(me.x-p.x,me.z-p.z);
      if(d<7 && !p.encountered){p.encountered=true;this.encounter(p);}
      this.renderPeer(id);
    }
    const el=document.querySelector('#social');
    if(el){
      const s=this.game.state.get();
      const near=[...this.peers.values()].filter(p=>Math.hypot(me.x-p.x,me.z-p.z)<25)[0];
      el.textContent=near?`NEAR PLAYER: ${near.callsign} · ${Math.round(Math.hypot(me.x-near.x,me.z-near.z))}m`:`SOCIAL: ${s.social?.encounters||0} KNOWN`;
    }
  }
  sync(){this.game.state.update({social:{callsign:this.callsign,known:this.game.state.get().social?.known||{},encounters:Object.keys(this.game.state.get().social?.known||{}).length}});}
  dispose(){this.say('goodbye');this.channel?.close();for(const m of this.markers.values())this.game.scene.remove(m.group);this.markers.clear();}
}
