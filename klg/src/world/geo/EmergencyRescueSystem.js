import * as THREE from 'three';

const C=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const INCIDENTS=[
 {type:'road-crash',label:'ROAD CRASH',need:'help',reward:650,rep:5,risk:.55},
 {type:'stranded-driver',label:'STRANDED DRIVER',need:'help',reward:420,rep:3,risk:.3},
 {type:'medical-call',label:'MEDICAL CALL',need:'help',reward:800,rep:7,risk:.62},
 {type:'blocked-road',label:'BLOCKED ROAD',need:'report',reward:300,rep:2,risk:.42}
];

export class EmergencyRescueSystem{
 constructor(game){
  this.game=game;
  this.timer=0;
  this.cooldown=0;
  this.active=null;
  this.history=[];
  this.responders=[];
  this.dispatchState={roadBlock:0,trafficReroute:0,panic:0,evacuation:0};
  this.state=game.state.get().emergencyRescue||{incidents:0,rescues:0,failed:0,active:null,updatedAt:0};
  this.bind();
 }
 bind(){
  this.game.events.on('environment:hazard-window',e=>this.seedFromEnvironment(e,true));
  this.game.events.on('environment:rescue-window',e=>this.seedFromEnvironment(e,false));
  this.game.events.on('cargo:delivery-failed',e=>this.seedIncident({type:'blocked-road',district:e.district||this.currentDistrict(),reason:e.reason||'delivery failure'},.65));
  this.game.events.on('vehicle:damage',()=>{if(!this.active)this.seedIncident({type:'road-crash',district:this.currentDistrict(),reason:'vehicle collision'},.72);});
  window.addEventListener('keydown',e=>this.choose(e.key));
 }
 currentDistrict(){return this.game.state.get().world?.district||this.game.state.get().district?.name||'default';}
 seedFromEnvironment(e,hazard){
  if(this.active||this.cooldown>0)return;
  const intensity=Number(e.risk??e.intensity??0);
  if(intensity<(hazard?.42:.38))return;
  const pool=hazard?INCIDENTS:[INCIDENTS[1],INCIDENTS[2],INCIDENTS[3]];
  const incident=pool[Math.floor(Math.random()*pool.length)];
  this.seedIncident({...incident,district:e.district||this.currentDistrict(),weather:e.weather},C(intensity+.08,0,1));
 }
 seedIncident(base,intensity=.5){
  if(this.active||this.cooldown>0)return;
  const target=this.game.vehicles.active?.mesh||this.game.player;
  const angle=Math.random()*Math.PI*2;
  const distance=16+Math.random()*20;
  const pos=new THREE.Vector3(target.position.x+Math.cos(angle)*distance,0,target.position.z+Math.sin(angle)*distance);
  const def=INCIDENTS.find(x=>x.type===base.type)||INCIDENTS[0];
  this.active={
   id:'ER-'+Date.now().toString(36),
   type:def.type,label:def.label,district:base.district||this.currentDistrict(),
   weather:base.weather||this.game.environmentalGameplay?.state.weather||'clear',
   position:{x:pos.x,y:0,z:pos.z},intensity:C(intensity),
   reward:def.reward,rep:def.rep,risk:def.risk,stage:'available',
   createdAt:Date.now(),ttl:42
  };
  this.state.incidents++;
  this.createIncidentVisual();
  this.createResponder('service');
  this.applyIncidentImpact(1);
  this.game.events.emit('emergency:incident-created',{...this.active});
  this.game.events.emit('gameplay:emergency-opportunity',{...this.active,options:['help','report','avoid']});
  this.sync();
 }
 createIncidentVisual(){
  if(!this.active)return;
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.RingGeometry(2.2,2.7,32),new THREE.MeshBasicMaterial({color:0xffb000,transparent:true,opacity:.8,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;g.add(ring);
  const beacon=new THREE.Mesh(new THREE.ConeGeometry(.45,1.8,8),new THREE.MeshStandardMaterial({color:0xd13c3c,emissive:0x441111}));
  beacon.position.y=.9;g.add(beacon);
  g.position.set(this.active.position.x,.08,this.active.position.z);
  g.userData.pulse=0;this.active.mesh=g;this.game.scene.add(g);
 }
 createResponder(kind){
  if(!this.active)return;
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.5,.65,2.6),new THREE.MeshStandardMaterial({color:kind==='police'?0x203a63:0x3b6f52,roughness:.7}));
  body.position.y=.55;g.add(body);
  const light=new THREE.Mesh(new THREE.BoxGeometry(1.1,.15,.28),new THREE.MeshBasicMaterial({color:0xff3333}));
  light.position.y=.95;g.add(light);
  const p=this.active.position;g.position.set(p.x+5,0,p.z+5);this.game.scene.add(g);
  this.responders.push({mesh:g,kind,speed:5.5});
 }
 choose(key){
  if(!this.active||this.active.stage!=='available')return;
  if(key==='1')this.resolve('help');
  else if(key==='2')this.resolve('report');
  else if(key==='3')this.resolve('avoid');
 }
 applyIncidentImpact(scale=1){
  if(!this.active)return;
  const i=this.active;const t=this.game.traffic;
  if(t){t.emergencyIncident={x:i.position.x,z:i.position.z,type:i.type,intensity:i.intensity*scale};}
  this.dispatchState.roadBlock=C((this.dispatchState.roadBlock||0)+i.intensity*.75*scale);
  this.dispatchState.traffic=C((this.dispatchState.traffic||0)+i.intensity*.55*scale);
  this.dispatchState.panic=C((this.dispatchState.panic||0)+i.intensity*.5*scale);
  this.game.events.emit('emergency:traffic-impact',{district:i.district,type:i.type,position:i.position,intensity:i.intensity,roadBlock:this.dispatchState.roadBlock,panic:this.dispatchState.panic});
  this.game.events.emit('emergency:npc-impact',{district:i.district,type:i.type,intensity:i.intensity,panic:this.dispatchState.panic,evacuate:i.type==='medical-call'||i.type==='road-crash'});
 }
 resolve(action){
  if(!this.active)return;
  const i=this.active;
  const target=this.game.vehicles.active?.mesh||this.game.player;
  const distance=Math.hypot(target.position.x-i.position.x,target.position.z-i.position.z);
  if(action==='help'&&distance>8){
   this.game.events.emit('emergency:too-far',{distance});
   const e=document.querySelector('#opportunity');if(e)e.textContent='RESCUE · GET CLOSER';
   return;
  }
  i.stage='resolved';i.action=action;i.resolvedAt=Date.now();
  if(action==='help'){
   this.dispatchState.roadBlock=0;this.dispatchState.panic=Math.max(0,(this.dispatchState.panic||0)-i.intensity*.8);this.dispatchState.evacuation=Math.max(0,(this.dispatchState.evacuation||0)-.4);
   this.state.rescues++;
   this.game.stats.addMoney(i.reward);this.game.stats.addReputation(i.rep);
   this.game.events.emit('world:consequence',{type:'safety',district:i.district,reward:i.reward,rep:i.rep,source:'emergency-rescue'});
   this.game.events.emit('emergency:rescue-complete',{...i});
   this.game.events.emit('npc:social-interaction',{type:'rescue',trust:C(.65+i.rep*.02),district:i.district});
  }else if(action==='report'){
   this.dispatchState.evacuation=C((this.dispatchState.evacuation||0)+i.intensity*.45);
   this.game.events.emit('emergency:dispatch',{district:i.district,type:i.type,priority:i.intensity,units:['service','police']});
   this.game.events.emit('police:alert',{level:C(.5+i.intensity*.7,0,1),source:'emergency-report',district:i.district});
   this.game.events.emit('city:response',{district:i.district,type:'safety',response:'secure',strength:i.intensity});
   this.game.events.emit('emergency:reported',{...i});
  }else{
   this.state.failed++;
   this.game.events.emit('world:consequence',{type:'safety',district:i.district,reward:0,rep:-1,source:'emergency-ignored'});
   this.game.events.emit('emergency:ignored',{...i});
  }
  this.history.push({...i});this.history=this.history.slice(-20);
  if(i.mesh){this.game.scene.remove(i.mesh);i.mesh.traverse(o=>o.geometry?.dispose?.());}
  this.responders.forEach(r=>this.game.scene.remove(r.mesh));this.responders=[];
  if(this.game.traffic?.emergencyIncident)this.game.traffic.emergencyIncident=null;
  this.active=null;this.cooldown=18;this.state.active=null;this.state.updatedAt=Date.now();this.sync();
 }
 update(dt){
  this.timer+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.active){
   this.active.ttl-=dt;
   const target=this.game.vehicles.active?.mesh||this.game.player;
   const d=Math.hypot(target.position.x-this.active.position.x,target.position.z-this.active.position.z);
   if(this.active.mesh){this.active.mesh.userData.pulse+=dt;const s=1+Math.sin(this.active.mesh.userData.pulse*5)*.08;this.active.mesh.scale.set(s,s,s);}
   for(const r of this.responders){
    const dir=new THREE.Vector3(this.active.position.x-r.mesh.position.x,0,this.active.position.z-r.mesh.position.z);
    if(dir.length()>1.5){dir.normalize();r.mesh.position.addScaledVector(dir,r.speed*dt);}
   }
   if(this.active.ttl<=0){this.resolve('avoid');}
  }else{
   this.dispatchState.roadBlock=Math.max(0,(this.dispatchState.roadBlock||0)-dt*.025);this.dispatchState.traffic=Math.max(0,(this.dispatchState.traffic||0)-dt*.02);this.dispatchState.panic=Math.max(0,(this.dispatchState.panic||0)-dt*.018);
  }
  }
  if(this.timer>=2){
   this.timer=0;this.state.active=this.active?{id:this.active.id,type:this.active.type,district:this.active.district,ttl:this.active.ttl}:null;this.state.updatedAt=Date.now();this.sync();
  }
 }
 sync(){this.game.state.update({emergencyRescue:{...this.state,dispatch:{...this.dispatchState}}});}
}
