const TYPES=[
  {id:'convoy',label:'CONVOY FORMING',radius:28,weight:3},
  {id:'rescue',label:'PLAYER NEEDS HELP',radius:22,weight:2},
  {id:'challenge',label:'STREET CHALLENGE',radius:20,weight:3},
  {id:'discovery',label:'SHARED DISCOVERY',radius:18,weight:2},
  {id:'rivalry',label:'RIVAL SPOTTED',radius:24,weight:1}
];

export class EmergentSocialEventSystem {
  constructor(game){
    this.game=game;
    this.cooldown=12;
    this.timer=0;
    this.active=null;
    this.seq=0;
    this.bind();
  }
  bind(){
    this.game.events.on('social:encounter',d=>this.onEncounter(d));
    this.game.events.on('social:memory-updated',()=>this.tryCreate());
  }
  position(){const v=this.game.vehicles?.active?.mesh||this.game.player;return {x:v.position.x,z:v.position.z};}
  peers(){return [...(this.game.presence?.peers?.values()||[])];}
  choose(){
    const peers=this.peers();
    if(!peers.length)return null;
    const p=this.position();
    const near=peers.find(x=>Math.hypot(p.x-x.x,p.z-x.z)<35);
    if(!near)return null;
    const trust=this.game.presence?.game?.state?.get?.().social?.known?.[near.callsign]?.trust||0;
    const pool=trust>=8?TYPES.filter(x=>x.id!=='rivalry'):TYPES;
    return pool[Math.floor(Math.random()*pool.length)];
  }
  tryCreate(){
    if(this.active||this.timer>0)return;
    const type=this.choose();
    if(!type)return;
    const peer=this.peers().find(x=>{const p=this.position();return Math.hypot(p.x-x.x,p.z-x.z)<35;});
    if(!peer)return;
    this.seq++;
    this.active={id:`social-${Date.now()}-${this.seq}`,type:type.id,label:type.label,callsign:peer.callsign,district:peer.district,expires:Date.now()+18000};
    this.game.events.emit('social:opportunity',this.active);
    const el=document.querySelector('#social');
    if(el)el.textContent=`${type.label} · ${peer.callsign}`;
  }
  onEncounter(){if(!this.active)this.tryCreate();}
  accept(){
    if(!this.active)return;
    const event={...this.active,accepted:true};
    this.game.events.emit('social:event-accepted',event);
    this.finish(event,true);
  }
  reject(){if(this.active)this.finish(this.active,false);}
  finish(event,accepted){
    this.game.events.emit('social:event-resolved',{...event,accepted});
    this.active=null;this.timer=this.cooldown;
  }
  update(dt){
    this.timer=Math.max(0,this.timer-dt);
    if(this.active&&Date.now()>this.active.expires)this.finish(this.active,false);
    if(!this.active&&this.timer<=0&&Math.random()<dt*.08)this.tryCreate();
  }
}
