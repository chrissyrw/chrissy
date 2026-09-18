import * as THREE from 'three';

const WIDTH={NATIONAL:9,DISTRICT_1:7,DISTRICT_2:5.5,LOCAL:3.8};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class StreetLevelPresentationSystem{
  constructor(game,{maxRoads=900,maxFurniture=1800,maxCameras=420}={}){
    this.game=game;this.maxRoads=maxRoads;this.maxFurniture=maxFurniture;this.maxCameras=maxCameras;
    this.group=new THREE.Group();this.group.name='KLG_StreetLevelPresentation';game.scene.add(this.group);
    this.ready=false;this.stats={roads:0,sidewalks:0,curbs:0,markings:0,furniture:0,cameras:0};
    this.materials={
      asphalt:new THREE.MeshStandardMaterial({color:0x252a2e,roughness:.92,metalness:.03}),
      sidewalk:new THREE.MeshStandardMaterial({color:0x8b8d88,roughness:.88}),
      curb:new THREE.MeshStandardMaterial({color:0xb9b7ae,roughness:.8}),
      marking:new THREE.MeshStandardMaterial({color:0xe8e2c9,roughness:.7}),
      darkMarking:new THREE.MeshStandardMaterial({color:0x3d4246,roughness:.82}),
      metal:new THREE.MeshStandardMaterial({color:0x343a40,roughness:.42,metalness:.72}),
      glass:new THREE.MeshStandardMaterial({color:0x4ca6bd,roughness:.18,metalness:.45,emissive:0x071d24}),
      signal:new THREE.MeshStandardMaterial({color:0x17191b,roughness:.45,metalness:.5}),
      lamp:new THREE.MeshStandardMaterial({color:0xffdca3,roughness:.3,emissive:0x7a4e16})
    };
  }
  clear(){this.group.clear();this.ready=false;}
  projectPoint(c,project){const p=project(c[0],c[1]);return new THREE.Vector3(p.x,0,p.z);}
  addBox(name,x,z,sx,sy,sz,mat,y=.04,rot=0){
    const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);m.rotation.y=rot;m.castShadow=true;m.receiveShadow=true;m.userData={presentation:name};this.group.add(m);return m;
  }
  ribbon(points,width,y,mat,name){
    if(points.length<2)return null;
    const verts=[],half=width/2;
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
      verts.push(a.x+nx*half,y,a.z+nz*half,a.x-nx*half,y,a.z-nz*half,b.x+nx*half,y,b.z+nz*half,b.x-nx*half,y,b.z-nz*half);
    }
    const pos=[];for(let i=0;i<verts.length;i+=12)pos.push(...verts.slice(i,i+12));
    const indices=[];for(let i=0;i<points.length-1;i++){const k=i*4;indices.push(k,k+1,k+2,k+2,k+1,k+3);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.receiveShadow=true;this.group.add(mesh);return mesh;
  }
  line(points,width,y,mat,dash=false){
    if(points.length<2)return;
    const material=mat.clone();material.transparent=true;material.opacity=.9;
    if(dash)material.dashSize=2.2,material.gapSize=2.0;
    const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,y,p.z)));
    const line=new THREE.Line(geo,material);if(dash)line.computeLineDistances();this.group.add(line);
  }
  addLamp(p,angle){
    const pole=this.addBox('street-lamp',p.x,p.z,.09,3.6,.09,this.materials.metal,1.8,angle);
    pole.scale.z=1;
    const arm=this.addBox('lamp-arm',p.x+Math.cos(angle)*.45,p.z+Math.sin(angle)*.45,.08,.08,.9,this.materials.metal,3.45,angle);
    this.addBox('lamp-head',p.x+Math.cos(angle)*.88,p.z+Math.sin(angle)*.88,.22,.08,.32,this.materials.lamp,3.4,angle);
  }
  addCamera(p,angle,index){
    const rig=this.addBox('security-camera-pole',p.x,p.z,.07,2.5,.07,this.materials.metal,1.25,angle);
    rig.castShadow=false;
    const head=new THREE.Mesh(new THREE.BoxGeometry(.28,.16,.2),this.materials.glass);
    head.position.set(p.x+Math.cos(angle)*.18,2.45,p.z+Math.sin(angle)*.18);head.rotation.y=angle;head.userData={presentation:'security-camera',index};this.group.add(head);
  }
  addCrossing(points,width){
    const a=points[0],b=points[points.length-1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
    const nx=-dz/len,nz=dx/len;
    for(let i=-2;i<=2;i++)this.addBox('zebra-crossing',a.x+nx*i*.65,a.z+nz*i*.65,width*.82,.025,.32,this.materials.marking,.065,Math.atan2(dz,dx));
  }
  build(roads,project){
    this.clear();
    const roadsUsed=roads.slice(0,this.maxRoads);
    let furniture=0,cameras=0,sidewalks=0,curbs=0,markings=0;
    for(let ri=0;ri<roadsUsed.length;ri++){
      const r=roadsUsed[ri],lines=r.geometry.type==='LineString'?[r.geometry.coordinates]:r.geometry.coordinates;
      const width=WIDTH[r.class]||WIDTH.LOCAL;
      for(const raw of lines){
        if(raw.length<2)continue;
        const pts=raw.map(c=>this.projectPoint(c,project));
        this.ribbon(pts,width,.02,this.materials.asphalt,'road-surface');
        const left=[],right=[];
        for(let i=0;i<pts.length-1;i++){
          const a=pts[i],b=pts[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
          left.push(new THREE.Vector3(a.x+nx*(width/2+.65),0,a.z+nz*(width/2+.65)));
          right.push(new THREE.Vector3(a.x-nx*(width/2+.65),0,a.z-nz*(width/2+.65)));
        }
        left.push(left[left.length-1]);right.push(right[right.length-1]);
        this.ribbon(left,1.05,.045,this.materials.sidewalk,'sidewalk');this.ribbon(right,1.05,.045,this.materials.sidewalk,'sidewalk');sidewalks+=2;
        this.line(left,.16,.085,this.materials.curb);this.line(right,.16,.085,this.materials.curb);curbs+=2;
        if(width>=5)this.line(pts,.08,.09,this.materials.marking,true),markings++;
        const mid=pts[Math.floor(pts.length/2)],seed=(Number(r.id)||ri)*17;
        if(furniture<this.maxFurniture && Math.abs(seed)%3===0){
          const ang=Math.atan2(pts[Math.min(pts.length-1,Math.floor(pts.length/2)+1)].z-mid.z,pts[Math.min(pts.length-1,Math.floor(pts.length/2)+1)].x-mid.x)+Math.PI/2;
          this.addLamp(mid,ang);furniture++;
        }
        if(furniture<this.maxFurniture && Math.abs(seed)%5===0){
          this.addBox('bollard',mid.x+1.8,mid.z+1.8,.16,.75,.16,this.materials.metal,.38);furniture++;
        }
        if(cameras<this.maxCameras && Math.abs(seed)%4===0){this.addCamera(mid,Math.atan2(pts[0].z-mid.z,pts[0].x-mid.x),cameras);cameras++;}
        if(width>=7 && raw.length>5 && Math.abs(seed)%6===0){this.addCrossing([pts[1],pts[Math.min(pts.length-2,2)]],width);markings+=5;}
      }
    }
    this.stats={roads:roadsUsed.length,sidewalks,curbs,markings,furniture,cameras};
    this.ready=true;
    this.game.state.update({streetLevelPresentation:this.stats},'street-level-presentation');
    this.game.events.emit('street:presentation-ready',this.stats,{source:'street-level-presentation',priority:42});
    return this.stats;
  }
  snapshot(){return {ready:this.ready,...this.stats,objects:this.group.children.length};}
  update(){}
  dispose(){this.clear();}
}