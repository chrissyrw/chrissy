import * as THREE from 'three';

export class NPCSystem {
  constructor(game){
    this.game=game;this.npcs=[];this.sidewalks=[];this.crossings=[];this.districts=[];
    this.jobs=['vendor','student','driver','worker','tourist','security','mechanic','courier'];
    this.states=['idle','commute','work','shop','wander','return','cross','flee','bus_wait','ride','moto_wait','group'];
    this.density={CBD:1.55,KIMIRONKO:1.4,REMERA:1.2,KACYIRU:1.05,NYARUTARAMA:.95,NYAMIRAMBO:1.35,KICUKIRO:1.15,KANOMBE:.9};
    this.maxPopulation=140;this.activePopulation=88;this.populationTargets={};this.busStops=[];this.buses=[];this.motoStages=[];this.shops=[];this.groups=[];this.directorTimer=0;
    this.buildPedestrianInfrastructure();this.buildTransitLife();this.buildShops();this.createPopulation();this.bindEvents();
  }

  buildPedestrianInfrastructure(){for(let p=-96;p<=96;p+=32){this.addSidewalk(-96,p,96,p);this.addSidewalk(p,-96,p,96);this.addCrossing(p,p);this.addCrossing(p,p+6);}}
  addSidewalk(x1,z1,x2,z2){const length=Math.hypot(x2-x1,z2-z1),horizontal=Math.abs(z2-z1)<.1;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(length,2.2),new THREE.MeshStandardMaterial({color:0x8b8f89,roughness:1}));mesh.rotation.x=-Math.PI/2;mesh.position.set((x1+x2)/2,.055,(z1+z2)/2);if(!horizontal)mesh.rotation.z=Math.PI/2;this.game.scene.add(mesh);this.sidewalks.push({x1,z1,x2,z2,mesh});}
  addCrossing(x,z){const stripes=[],mat=new THREE.MeshBasicMaterial({color:0xffffff});for(let i=-2;i<=2;i++){const s=new THREE.Mesh(new THREE.PlaneGeometry(1,7),mat);s.rotation.x=-Math.PI/2;s.position.set(x+i*1.8,.065,z);this.game.scene.add(s);stripes.push(s);}this.crossings.push({x,z,stripes});}

  buildTransitLife(){
    const stops=[[-64,-32,'Nyamirambo'],[-32,0,'Kimironko'],[0,-32,'CBD South'],[32,0,'Remera'],[32,64,'Nyarutarama'],[-32,32,'Kacyiru'],[-32,-64,'Kicukiro'],[64,-32,'Kanombe']];
    const signMat=new THREE.MeshStandardMaterial({color:0x1d2a35,roughness:.7});
    for(const [x,z,name] of stops){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2.2,8),signMat);pole.position.set(x,.95,z);this.game.scene.add(pole);const sign=new THREE.Mesh(new THREE.BoxGeometry(1.1,.5,.08),new THREE.MeshStandardMaterial({color:0xf0b429}));sign.position.set(x,2,z);this.game.scene.add(sign);this.busStops.push({x,z,name,queue:[],timer:Math.random()*8,bus:null});}
    for(let i=0;i<3;i++){const bus=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.3,1.25),new THREE.MeshStandardMaterial({color:0x315b7d,roughness:.65}));body.position.y=.9;bus.add(body);const roof=new THREE.Mesh(new THREE.BoxGeometry(2.65,.18,1.12),new THREE.MeshStandardMaterial({color:0xf0b429}));roof.position.y=1.58;bus.add(roof);this.game.scene.add(bus);this.buses.push({mesh:bus,route:i,stopIndex:i*2,speed:3+Math.random(),passengers:[]});}
    for(const [x,z,name] of [[-70,-32,'Nyamirambo Stage'],[-32,4,'Kimironko Stage'],[30,-4,'Remera Stage'],[64,-28,'Kanombe Stage']]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,.06,20),new THREE.MeshBasicMaterial({color:0x52b788,transparent:true,opacity:.35}));ring.position.set(x,.07,z);this.game.scene.add(ring);this.motoStages.push({x,z,name,queue:[],timer:Math.random()*5});}
  }
  buildShops(){for(const [x,z,name] of [[-32,0,'Market'],[18,34,'Kimironko Shops'],[48,-12,'Retail'],[8,8,'CBD Arcade'],[-64,32,'Garage Row'],[32,64,'Nyarutarama Cafe']]){const marker=new THREE.Mesh(new THREE.BoxGeometry(3,.25,2),new THREE.MeshStandardMaterial({color:0x6b7280,roughness:.9}));marker.position.set(x,.18,z);this.game.scene.add(marker);this.shops.push({x,z,name,customers:0});}}

  createPopulation(){const colors=[0x334455,0x8b4a35,0x4f6b3d,0x6b3f72,0x9a7b4f,0x536d8b,0x7b5b3e];for(let i=0;i<this.maxPopulation;i++){const npc=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.28,.75,4,8),new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.8}));body.position.y=.75;body.castShadow=true;npc.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.19,10,10),new THREE.MeshStandardMaterial({color:0x6f4934,roughness:.9}));head.position.y=1.42;head.castShadow=true;npc.add(head);const job=this.jobs[i%this.jobs.length],home=this.pickHome(i),work=this.pickWork(job,i),district=this.pickDistrict(i);npc.position.set(home.x,0,home.z);npc.visible=i<88;this.game.scene.add(npc);this.npcs.push({id:i,mesh:npc,job,district,speed:.55+Math.random()*1.1,phase:Math.random()*Math.PI*2,homeX:home.x,homeZ:home.z,workX:work.x,workZ:work.z,targetX:home.x,targetZ:home.z,state:'idle',mood:'calm',decision:Math.random()*4,shopTimer:0,lastEvent:0,crossing:null,wait:0,active:i<88,groupId:null,busStop:null,motoStage:null});}}
  pickDistrict(i){const names=Object.keys(this.density);return names[i%names.length];}
  pickHome(i){const homes=[[-86,-72],[-54,-48],[-22,-70],[18,-62],[58,-54],[82,-22],[-84,20],[-48,48],[-12,70],[32,58],[76,52],[-72,76]];const p=homes[i%homes.length];return{x:p[0]+(Math.random()-.5)*10,z:p[1]+(Math.random()-.5)*10};}
  pickWork(job,i){const work={vendor:[-32,0],student:[18,34],driver:[0,-32],worker:[48,-12],tourist:[32,64],security:[8,8],mechanic:[-64,32],courier:[64,-32]}[job]||[0,0];return{x:work[0]+(i%3-1)*6,z:work[1]+((i*7)%3-1)*6};}
  activeJob(job,time){const h=Math.floor(time/60)%24;if(job==='student')return h>=7&&h<16;if(job==='vendor'||job==='worker'||job==='mechanic')return h>=6&&h<19;if(job==='security')return true;if(job==='tourist')return h>=9&&h<22;if(job==='courier'||job==='driver')return h>=6&&h<23;return h>=6&&h<23;}

  bindEvents(){this.game.events.on('city:event',e=>this.onCityEvent(e));this.game.events.on('vehicle:damage',()=>this.broadcastReaction('accident'));this.game.events.on('wanted:changed',d=>{if((d?.level||0)>0)this.broadcastReaction('police');});this.game.events.on('population:director',d=>this.applyPopulationTargets(d));this.game.events.on('emergency:npc-impact',e=>this.onEmergencyImpact(e));}
  applyPopulationTargets(d){this.populationTargets=d?.zones||{};const zones=Object.values(this.populationTargets);const desired=zones.reduce((sum,z)=>sum+(z.target||0),0);this.activePopulation=THREE.MathUtils.clamp(desired,42,this.maxPopulation);let count=0;for(const n of this.npcs){const should=count<this.activePopulation;n.active=should;n.mesh.visible=should;if(should)count++;else{n.state='idle';n.groupId=null;n.busStop=null;n.motoStage=null;}}this.refreshGroups();}
  refreshGroups(){this.groups=[];const active=this.npcs.filter(n=>n.active);for(let i=0;i<active.length;i+=4){const members=active.slice(i,i+4);const id=`G${Math.floor(i/4)}`;for(const n of members)n.groupId=id;this.groups.push({id,members,center:new THREE.Vector3()});}}
  onCityEvent(e){for(const n of this.npcs)if(n.active){const d=Math.hypot(n.mesh.position.x-e.x,n.mesh.position.z-e.z);if(d<34){n.mood=e.type==='ROAD INCIDENT'?'alert':'curious';n.lastEvent=8;if(e.type==='ROAD INCIDENT')n.state='flee';else if(Math.random()>.3)n.state='shop';}}}
  onEmergencyImpact(e){for(const n of this.npcs)if(n.active){const d=Math.hypot(n.mesh.position.x-e.position?.x||0,n.mesh.position.z-e.position?.z||0);if(d<32){n.mood='alert';n.lastEvent=7;if(e.evacuate&&d<20){n.state='flee';const dx=n.mesh.position.x-(e.position?.x||0),dz=n.mesh.position.z-(e.position?.z||0),len=Math.max(.01,Math.hypot(dx,dz));n.targetX=n.mesh.position.x+dx/len*20;n.targetZ=n.mesh.position.z+dz/len*20;}}}}}
  broadcastReaction(type){const p=this.game.vehicles.active?.mesh||this.game.player;for(const n of this.npcs)if(n.active){const d=n.mesh.position.distanceTo(p.position);if(d<18){n.mood=type==='police'?'alert':'shocked';n.lastEvent=5;if(type==='police'&&d<8)n.state='flee';}}}
  nearestCrossing(n){let best=null,dist=Infinity;for(const c of this.crossings){const d=Math.hypot(n.mesh.position.x-c.x,n.mesh.position.z-c.z);if(d<dist){dist=d;best=c;}}return best;}
  nearRoad(n){return Math.abs(Math.round(n.mesh.position.x/32)*32-n.mesh.position.x)<2.8||Math.abs(Math.round(n.mesh.position.z/32)*32-n.mesh.position.z)<2.8;}
  shouldCross(n){if(!this.nearRoad(n)||n.state==='cross'||n.wait>0)return false;return Math.random()<.018;}
  startCross(n){const c=this.nearestCrossing(n);if(!c)return;n.crossing=c;n.state='cross';n.wait=0;n.targetX=c.x;n.targetZ=c.z;}
  nearestStop(n){let best=null,dist=Infinity;for(const s of this.busStops){const d=Math.hypot(n.mesh.position.x-s.x,n.mesh.position.z-s.z);if(d<dist){dist=d;best=s;}}return best;}
  nearestStage(n){let best=null,dist=Infinity;for(const s of this.motoStages){const d=Math.hypot(n.mesh.position.x-s.x,n.mesh.position.z-s.z);if(d<dist){dist=d;best=s;}}return best;}
  chooseTarget(n,time){const active=this.activeJob(n.job,time);const h=Math.floor(time/60)%24;
    if(this.shouldCross(n)){this.startCross(n);return;}
    if(n.state==='flee'){const p=this.game.vehicles.active?.mesh||this.game.player,dx=n.mesh.position.x-p.position.x,dz=n.mesh.position.z-p.position.z,len=Math.max(.01,Math.hypot(dx,dz));n.targetX=n.mesh.position.x+dx/len*18;n.targetZ=n.mesh.position.z+dz/len*18;return;}
    if((h>=7&&h<9)||(h>=16&&h<19)){
      if((n.job==='driver'||n.job==='courier')&&Math.random()<.12){n.state='moto_wait';n.motoStage=this.nearestStage(n);if(n.motoStage){n.targetX=n.motoStage.x;n.targetZ=n.motoStage.z;}return;}
      if(n.job!=='security'&&Math.random()<.1){n.state='bus_wait';n.busStop=this.nearestStop(n);if(n.busStop){n.targetX=n.busStop.x;n.targetZ=n.busStop.z;}return;}
    }
    if(active&&n.state!=='shop'&&n.state!=='bus_wait'&&n.state!=='moto_wait'){if(h===7||h===16||h===6||h===19||n.state==='commute'){n.state='commute';n.targetX=n.workX;n.targetZ=n.workZ;return;}n.state='work';n.targetX=n.workX+Math.sin(n.id*3.7)*4;n.targetZ=n.workZ+Math.cos(n.id*2.3)*4;return;}
    if(n.state==='shop'){const s=this.shops[n.id%this.shops.length];n.targetX=s.x;n.targetZ=s.z;return;}
    if(n.state==='bus_wait'&&n.busStop){n.targetX=n.busStop.x;n.targetZ=n.busStop.z;return;}
    if(n.state==='moto_wait'&&n.motoStage){n.targetX=n.motoStage.x;n.targetZ=n.motoStage.z;return;}
    if(Math.random()<.035){n.state='wander';n.targetX=(Math.random()-.5)*190;n.targetZ=(Math.random()-.5)*190;return;}
    n.state='return';n.targetX=n.homeX;n.targetZ=n.homeZ;
  }
  avoidTraffic(n,dir){for(const car of this.game.traffic.cars){const dx=car.mesh.position.x-n.mesh.position.x,dz=car.mesh.position.z-n.mesh.position.z,d=Math.hypot(dx,dz);if(d<4.8){dir.x-=dx/Math.max(d,.01)*2.2;dir.z-=dz/Math.max(d,.01)*2.2;}}}
  trafficSafe(n){for(const car of this.game.traffic.cars)if(Math.hypot(car.mesh.position.x-n.mesh.position.x,car.mesh.position.z-n.mesh.position.z)<5)return false;return true;}
  updateTransit(dt,time){
    for(const s of this.busStops){s.timer+=dt;if(s.timer>4){s.timer=0;s.queue=this.npcs.filter(n=>n.active&&n.state==='bus_wait'&&Math.hypot(n.mesh.position.x-s.x,n.mesh.position.z-s.z)<2.5);}}
    for(const bus of this.buses){const s=this.busStops[bus.stopIndex%this.busStops.length],target=new THREE.Vector3(s.x,0,s.z),dir=target.clone().sub(bus.mesh.position).setY(0),d=dir.length();if(d<1.5){bus.stopIndex=(bus.stopIndex+1)%this.busStops.length;const queue=s.queue.splice(0,3);for(const n of queue){n.state='ride';n.mesh.visible=false;bus.passengers.push(n);}for(const n of bus.passengers){if(Math.random()<dt*.04){n.state='commute';n.mesh.visible=n.active;n.targetX=n.workX;n.targetZ=n.workZ;}}bus.passengers=bus.passengers.filter(n=>n.mesh.visible===false);}else{dir.normalize();bus.mesh.position.addScaledVector(dir,bus.speed*dt);bus.mesh.lookAt(bus.mesh.position.clone().add(dir));}}
    for(const stage of this.motoStages){stage.timer+=dt;if(stage.timer>5){stage.timer=0;stage.queue=this.npcs.filter(n=>n.active&&n.state==='moto_wait'&&Math.hypot(n.mesh.position.x-stage.x,n.mesh.position.z-stage.z)<2.5);const riders=stage.queue.splice(0,2);for(const n of riders){n.state='commute';n.motoStage=null;n.targetX=n.workX;n.targetZ=n.workZ;}}}
  }
  update(dt){const time=this.game.state.get().world.time,player=this.game.vehicles.active?.mesh||this.game.player;this.directorTimer+=dt;if(this.directorTimer>3){this.directorTimer=0;this.refreshGroups();}
    this.updateTransit(dt,time);let active=0,working=0,alert=0,crossing=0,shopping=0,busWaiting=0,motoWaiting=0;
    for(const n of this.npcs){if(!n.active)continue;n.decision-=dt;n.lastEvent=Math.max(0,n.lastEvent-dt);n.wait=Math.max(0,n.wait-dt);if(n.decision<=0){n.decision=2.5+Math.random()*4;this.chooseTarget(n,time);}
      if(n.groupId&&n.state==='wander'){const g=this.groups.find(x=>x.id===n.groupId);if(g){const leader=g.members[0];if(leader&&leader!==n){n.targetX=leader.mesh.position.x+Math.sin(n.id)*1.8;n.targetZ=leader.mesh.position.z+Math.cos(n.id)*1.8;}}}
      const target=new THREE.Vector3(n.targetX,0,n.targetZ);let dir=target.clone().sub(n.mesh.position).setY(0),distance=dir.length();if(n.state==='cross'){if(!this.trafficSafe(n)){n.wait=.6;dir.set(0,0,0);}else if(distance<1.1){n.state='wander';n.crossing=null;n.decision=0;}}
      if(distance>.8){dir.normalize();if(n.state!=='cross')this.avoidTraffic(n,dir);dir.normalize();}const moving=distance>.8&&dir.length()>0,speed=n.speed*(n.state==='flee'?2.1:n.state==='commute'?1.25:n.state==='cross'?1.05:.75);if(moving)n.mesh.position.addScaledVector(dir,speed*dt);
      n.mesh.position.x=THREE.MathUtils.clamp(n.mesh.position.x,-110,110);n.mesh.position.z=THREE.MathUtils.clamp(n.mesh.position.z,-110,110);if(moving)n.mesh.lookAt(n.mesh.position.clone().add(dir));
      if(n.state==='shop'&&distance<2)n.shopTimer+=dt;else n.shopTimer=0;if(n.shopTimer>6){n.state='wander';n.shopTimer=0;n.decision=0;}if(n.state==='flee'&&distance<2)n.state='return';if(n.mesh.position.distanceTo(player.position)<2.2){n.mood='alert';n.lastEvent=1;}
      if(this.activeJob(n.job,time))active++;if(n.state==='work')working++;if(n.state==='flee'||n.mood==='shocked')alert++;if(n.state==='cross')crossing++;if(n.state==='shop')shopping++;if(n.state==='bus_wait')busWaiting++;if(n.state==='moto_wait')motoWaiting++;
    }
    const el=document.querySelector('#npc-state');if(el)el.textContent=`NPCs: ${active} · WORK ${working} · SHOP ${shopping} · BUS ${busWaiting} · MOTO ${motoWaiting} · GROUPS ${this.groups.length} · CROSS ${crossing} · ALERT ${alert}`;
    const pop=document.querySelector('#population-ai');if(pop)pop.textContent=`POP AI: ${active}/${this.maxPopulation} · ${this.groups.length} GROUPS · ${this.buses.length} BUSES`;
  }
}
