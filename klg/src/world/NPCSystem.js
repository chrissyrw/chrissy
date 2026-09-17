import * as THREE from 'three';

export class NPCSystem {
  constructor(game){
    this.game=game;
    this.npcs=[];
    this.jobs=['vendor','student','driver','worker','tourist','security','mechanic','courier'];
    this.states=['idle','commute','work','shop','wander','return','flee'];
    this.spawnCount=72;
    this.createPopulation();
    this.bindEvents();
  }

  createPopulation(){
    const colors=[0x334455,0x8b4a35,0x4f6b3d,0x6b3f72,0x9a7b4f,0x536d8b,0x7b5b3e];
    for(let i=0;i<this.spawnCount;i++){
      const npc=new THREE.Group();
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(.28,.75,4,8),new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.8}));
      body.position.y=.75;body.castShadow=true;npc.add(body);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.19,10,10),new THREE.MeshStandardMaterial({color:0x6f4934,roughness:.9}));
      head.position.y=1.42;head.castShadow=true;npc.add(head);
      const job=this.jobs[i%this.jobs.length];
      const home=this.pickHome(i);
      const work=this.pickWork(job,i);
      npc.position.set(home.x,0,home.z);npc.userData={job,state:'idle'};
      this.game.scene.add(npc);
      this.npcs.push({
        id:i,mesh:npc,job,speed:.55+Math.random()*1.1,phase:Math.random()*Math.PI*2,
        homeX:home.x,homeZ:home.z,workX:work.x,workZ:work.z,
        targetX:home.x,targetZ:home.z,state:'idle',mood:'calm',
        decision:Math.random()*4,shopTimer:0,panic:0,lastEvent:0
      });
    }
  }

  pickHome(i){
    const homes=[[-86,-72],[-54,-48],[-22,-70],[18,-62],[58,-54],[82,-22],[-84,20],[-48,48],[-12,70],[32,58],[76,52],[-72,76]];
    const p=homes[i%homes.length];
    return {x:p[0]+(Math.random()-.5)*10,z:p[1]+(Math.random()-.5)*10};
  }

  pickWork(job,i){
    const work={
      vendor:[-32,0],student:[18,34],driver:[0,-32],worker:[48,-12],tourist:[32,64],security:[8,8],mechanic:[-64,32],courier:[64,-32]
    }[job]||[0,0];
    return {x:work[0]+(i%3-1)*6,z:work[1]+((i*7)%3-1)*6};
  }

  activeJob(job,time){
    const h=Math.floor(time/60)%24;
    if(job==='student')return h>=7&&h<16;
    if(job==='vendor'||job==='worker'||job==='mechanic')return h>=6&&h<19;
    if(job==='security')return true;
    if(job==='tourist')return h>=9&&h<22;
    if(job==='courier'||job==='driver')return h>=6&&h<23;
    return h>=6&&h<23;
  }

  bindEvents(){
    this.game.events.on('city:event',e=>this.onCityEvent(e));
    this.game.events.on('vehicle:damage',()=>this.broadcastReaction('accident'));
    this.game.events.on('wanted:changed',d=>{if((d?.level||0)>0)this.broadcastReaction('police');});
  }

  onCityEvent(e){
    for(const n of this.npcs){
      const d=Math.hypot(n.mesh.position.x-e.x,n.mesh.position.z-e.z);
      if(d<34){
        n.mood=e.type==='ROAD INCIDENT'?'alert':'curious';
        n.lastEvent=8;
        if(e.type==='ROAD INCIDENT')n.state='flee';
        else if(Math.random()>.35)n.state='shop';
      }
    }
  }

  broadcastReaction(type){
    const p=this.game.vehicles.active?.mesh||this.game.player;
    for(const n of this.npcs){
      const d=n.mesh.position.distanceTo(p.position);
      if(d<18){n.mood=type==='police'?'alert':'shocked';n.lastEvent=5;if(type==='police'&&d<8)n.state='flee';}
    }
  }

  chooseTarget(n,time){
    const active=this.activeJob(n.job,time);
    const h=Math.floor(time/60)%24;
    if(n.state==='flee'){const p=this.game.vehicles.active?.mesh||this.game.player;const dx=n.mesh.position.x-p.position.x,dz=n.mesh.position.z-p.position.z;const len=Math.max(.01,Math.hypot(dx,dz));n.targetX=n.mesh.position.x+dx/len*18;n.targetZ=n.mesh.position.z+dz/len*18;return;}
    if(active&&n.state!=='shop'){
      const commute=(h===7||h===16||h===6||h===19);
      if(commute||n.state==='commute'){n.state='commute';n.targetX=n.workX;n.targetZ=n.workZ;return;}
      n.state='work';n.targetX=n.workX+(Math.sin(n.id*3.7)*4);n.targetZ=n.workZ+(Math.cos(n.id*2.3)*4);return;
    }
    if(n.state==='shop'){
      n.targetX=(n.workX+n.homeX)*.55;n.targetZ=(n.workZ+n.homeZ)*.55;return;
    }
    if(Math.random()<.015){n.state='wander';n.targetX=(Math.random()-.5)*190;n.targetZ=(Math.random()-.5)*190;return;}
    n.state='return';n.targetX=n.homeX;n.targetZ=n.homeZ;
  }

  avoidTraffic(n,dir){
    let danger=0;
    for(const car of this.game.traffic.cars){
      const dx=car.mesh.position.x-n.mesh.position.x,dz=car.mesh.position.z-n.mesh.position.z;
      const d=Math.hypot(dx,dz);
      if(d<3.8){danger++;dir.x-=dx/Math.max(d,.01)*1.8;dir.z-=dz/Math.max(d,.01)*1.8;}
    }
    return danger;
  }

  update(dt){
    const time=this.game.state.get().world.time;
    const player=this.game.vehicles.active?.mesh||this.game.player;
    let active=0,working=0,panic=0;
    for(const n of this.npcs){
      n.decision-=dt;n.lastEvent=Math.max(0,n.lastEvent-dt);n.panic=Math.max(0,n.panic-dt);
      if(n.decision<=0){n.decision=2.5+Math.random()*4;this.chooseTarget(n,time);}
      const target=new THREE.Vector3(n.targetX,0,n.targetZ);
      let dir=target.clone().sub(n.mesh.position).setY(0);
      const distance=dir.length();
      if(distance>.8){dir.normalize();this.avoidTraffic(n,dir);dir.normalize();}
      const moving=distance>.8;
      const speed=n.speed*(n.state==='flee'?2.1:n.state==='commute'?1.25:.75);
      if(moving)n.mesh.position.addScaledVector(dir,speed*dt);
      n.mesh.position.x=THREE.MathUtils.clamp(n.mesh.position.x,-110,110);
      n.mesh.position.z=THREE.MathUtils.clamp(n.mesh.position.z,-110,110);
      if(moving)n.mesh.lookAt(n.mesh.position.clone().add(dir));
      if(n.state==='shop'&&distance<2)n.shopTimer+=dt;else n.shopTimer=0;
      if(n.shopTimer>6){n.state='wander';n.shopTimer=0;n.decision=0;}
      if(n.state==='flee'&&distance<2)n.state='return';
      if(n.mesh.position.distanceTo(player.position)<2.2){n.mood='alert';n.lastEvent=1;}
      const isActive=this.activeJob(n.job,time);if(isActive)active++;if(n.state==='work')working++;if(n.state==='flee'||n.mood==='shocked')panic++;
    }
    const el=document.querySelector('#npc-state');
    if(el)el.textContent=`NPCs: ${this.npcs.length} · ACTIVE ${active} · WORK ${working} · ALERT ${panic}`;
  }
}
