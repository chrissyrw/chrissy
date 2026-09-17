import * as THREE from 'three';

const TEMPLATES=[
  {id:'market-shortage',type:'MARKET',title:'Stock Shortage',signal:'A market stall is running dry.',district:'Kimironko',target:{x:-32,z:0},reward:520,rep:4,identity:'courier',pressure:'market'},
  {id:'transit-relay',type:'TRANSIT',title:'Transit Relay',signal:'A passenger connection is slipping through the city.',district:'Nyabugogo',target:{x:0,z:-32},reward:430,rep:3,identity:'courier',pressure:'traffic'},
  {id:'hill-run',type:'HILL',title:'Wet Hill Run',signal:'The rain opened a dangerous hill route.',district:'Rebero',target:{x:32,z:64},reward:780,rep:7,identity:'racer',pressure:'weather'},
  {id:'night-contact',type:'SOCIAL',title:'Night Contact',signal:'Someone is looking for a driver who knows the city.',district:'Nyamirambo',target:{x:-64,z:32},reward:620,rep:6,identity:'night',pressure:'social'},
  {id:'low-profile',type:'RISK',title:'Quiet Route',signal:'Police pressure made a low-profile route valuable.',district:'CBD',target:{x:32,z:-25},reward:900,rep:8,identity:'lowprofile',pressure:'police'}
];

export class EmergentOpportunitySystem {
  constructor(game){
    this.game=game;this.active=null;this.cooldown=5;this.scanTimer=0;this.marker=null;this.pressure={};
    this.game.events.on('world:pressure',p=>this.pressure=p||{});
    this.game.events.on('opportunity:resolved',()=>this.cooldown=12);
  }
  score(t,s){
    const p=Number(this.pressure[t.pressure]||0);
    const sameDistrict=String(s.world.district||'').toLowerCase().includes(t.district.toLowerCase());
    const identity=s.identity?.traits?.[t.identity]||0;
    return .2+p*.55+(sameDistrict?.2:0)+identity*.05+Math.random()*.15;
  }
  choose(){
    const s=this.game.state.get();
    const candidates=TEMPLATES.filter(t=>!this.active||t.id!==this.active.id).map(t=>({t,score:this.score(t,s)})).sort((a,b)=>b.score-a.score);
    return candidates[0]?.t||null;
  }
  discover(){
    const t=this.choose();if(!t)return;
    this.active={...t,discoveredAt:Date.now(),status:'discovered'};
    this.showMarker(t.target);
    this.game.events.emit('opportunity:discovered',this.active);
  }
  showMarker(pos){
    if(this.marker)this.game.scene.remove(this.marker);
    this.marker=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.12,24),new THREE.MeshBasicMaterial({color:0xffc857,transparent:true,opacity:.75}));
    this.marker.position.set(pos.x,.12,pos.z);this.game.scene.add(this.marker);
  }
  commit(){
    if(!this.active||this.active.status!=='discovered')return false;
    this.active.status='committed';
    this.game.events.emit('opportunity:accepted',this.active);
    return true;
  }
  reject(){
    if(!this.active)return false;
    const rejected={...this.active,status:'rejected'};
    this.game.events.emit('opportunity:rejected',rejected);
    this.clear();this.cooldown=5;return true;
  }
  resolve(){
    if(!this.active||this.active.status!=='committed')return;
    const resolved={...this.active,status:'resolved'};
    this.game.events.emit('opportunity:resolved',resolved);
    this.clear();
  }
  clear(){if(this.marker)this.game.scene.remove(this.marker);this.marker=null;this.active=null;}
  update(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);this.scanTimer+=dt;
    const p=this.game.vehicles.active?.mesh.position||this.game.player.position;
    if(this.active?.status==='committed'){
      const d=Math.hypot(p.x-this.active.target.x,p.z-this.active.target.z);
      if(d<6)this.resolve();
    }
    if(!this.active&&this.cooldown<=0&&this.scanTimer>7){this.scanTimer=0;this.discover();}
    if(this.marker){this.marker.rotation.z+=dt*1.5;const d=Math.hypot(p.x-this.marker.position.x,p.z-this.marker.position.z);this.marker.scale.setScalar(1+Math.sin(performance.now()*.006)*.12);if(this.active)this.game.events.emit('opportunity:nearby',{...this.active,distance:d});}
    const el=document.querySelector('#opportunity');
    if(el){if(!this.active)el.textContent='CITY SIGNALS: NONE';else{const d=Math.hypot(p.x-this.active.target.x,p.z-this.active.target.z);el.textContent=(this.active.status==='committed'?'COMMITTED: ':'SIGNAL: ')+this.active.title+' · '+Math.round(d)+'m · '+(this.active.status==='discovered'?'F ACCEPT':'X PASS');}}
  }
}
