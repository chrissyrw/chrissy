import * as THREE from 'three';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class CityPresentationSystem{
  constructor(game,{maxTrees=1800,maxBuildingAccents=1800}={}){
    this.game=game;
    this.maxTrees=maxTrees;
    this.maxBuildingAccents=maxBuildingAccents;
    this.group=new THREE.Group();
    this.group.name='KLG_ModernCityPresentation';
    game.scene.add(this.group);
    this.seed=1337;
    this.ready=false;
  }

  hash(id){
    let n=Math.abs(Number(id)||this.seed);
    n=(n*1664525+1013904223)%4294967296;
    return n/4294967296;
  }

  material(type){
    const palette={
      residential:{body:0xb7aa98,accent:0x3c6e71},
      commercial:{body:0x7f919c,accent:0x86c5d8},
      retail:{body:0xc8aa6b,accent:0xd97852},
      civic:{body:0x8899a5,accent:0xd6c48a},
      landmark:{body:0x8f7969,accent:0xc9e0dc}
    };
    const p=palette[type]||palette.residential;
    return {
      body:new THREE.MeshStandardMaterial({color:p.body,roughness:.78,metalness:.08}),
      accent:new THREE.MeshStandardMaterial({color:p.accent,roughness:.55,metalness:.18})
    };
  }

  clear(){this.group.clear();this.ready=false;}

  createGround(radius=190){
    const geo=new THREE.CircleGeometry(radius,96);
    const mat=new THREE.MeshStandardMaterial({color:0x66705e,roughness:1});
    const ground=new THREE.Mesh(geo,mat);
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-.035;
    ground.receiveShadow=true;
    this.group.add(ground);

    const inner=new THREE.Mesh(new THREE.RingGeometry(85,190,96),new THREE.MeshStandardMaterial({color:0x73806a,roughness:1}));
    inner.rotation.x=-Math.PI/2;
    inner.position.y=-.025;
    inner.receiveShadow=true;
    this.group.add(inner);
  }

  createTree(){
    const g=new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,1.25,7),new THREE.MeshStandardMaterial({color:0x5a4634,roughness:.9}));
    trunk.position.y=.62;
    const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.72,1),new THREE.MeshStandardMaterial({color:0x4f7954,roughness:.95}));
    crown.position.y=1.55;
    crown.castShadow=true;
    g.add(trunk,crown);
    return g;
  }

  placeVegetation(buildings,project){
    const template=this.createTree();
    const trees=new THREE.InstancedMesh(template.children[1].geometry,template.children[1].material,this.maxTrees);
    const trunks=new THREE.InstancedMesh(template.children[0].geometry,template.children[0].material,this.maxTrees);
    trees.castShadow=true; trunks.castShadow=true;
    const dummy=new THREE.Object3D();
    let count=0;
    for(const b of buildings){
      if(count>=this.maxTrees)break;
      const p=project(b.lon,b.lat), r=this.hash(b.id);
      if(r<.64)continue;
      const spread=1.5+this.hash(Number(b.id)+91)*4;
      const angle=this.hash(Number(b.id)+37)*Math.PI*2;
      const x=p.x+Math.cos(angle)*spread,z=p.z+Math.sin(angle)*spread;
      const scale=.7+this.hash(Number(b.id)+17)*.65;
      dummy.position.set(x,0,z);dummy.scale.setScalar(scale);dummy.updateMatrix();
      trees.setMatrixAt(count,dummy.matrix);
      dummy.position.y=0;dummy.scale.setScalar(scale);dummy.updateMatrix();
      trunks.setMatrixAt(count,dummy.matrix);
      count++;
    }
    trees.count=count;trunks.count=count;
    trees.instanceMatrix.needsUpdate=true;trunks.instanceMatrix.needsUpdate=true;
    this.group.add(trunks,trees);
  }

  placeBuildingAccents(buildings,project){
    let count=0;
    for(const b of buildings){
      if(count++>=this.maxBuildingAccents)break;
      const type=b.tags?.tourism?'landmark':b.tags?.shop?'retail':(['school','hospital','townhall','police'].includes(b.tags?.amenity)?'civic':(b.tags?.building==='commercial'||b.tags?.building==='office'?'commercial':'residential'));
      const p=project(b.lon,b.lat);
      const r=this.hash(Number(b.id)+41);
      const h=2.8+(this.hash(Number(b.id)+77)*8);
      const width=.035+(this.hash(Number(b.id)+113)*.08);
      const mat=this.material(type).accent;
      const strip=new THREE.Mesh(new THREE.BoxGeometry(width,h,width),mat);
      strip.position.set(p.x+((r-.5)*2),h/2,p.z-.8);
      strip.castShadow=false;
      strip.userData={geoId:b.id,presentation:'facade-accent',type};
      this.group.add(strip);
    }
  }

  build(buildings,project){
    this.clear();
    this.createGround();
    this.placeVegetation(buildings,project);
    this.placeBuildingAccents(buildings,project);
    this.ready=true;
    const stats={trees:Math.min(buildings.length,this.maxTrees),buildingAccents:Math.min(buildings.length,this.maxBuildingAccents)};
    this.game.state.update({cityPresentation:stats},'city-presentation');
    this.game.events.emit('city:presentation-ready',stats,{source:'city-presentation',priority:45});
    return stats;
  }

  update(){}

  snapshot(){return {ready:this.ready,objects:this.group.children.length};}
  dispose(){this.group.clear();this.ready=false;}
}
