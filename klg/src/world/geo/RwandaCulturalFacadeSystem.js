import * as THREE from 'three';
const THEMES={
 market:{accent:0xd4a72c,secondary:0x245c43,pattern:'imigongo'},
 civic:{accent:0x1f5b43,secondary:0xd7b44a,pattern:'rwanda'},
 urban:{accent:0x24364b,secondary:0xd7b44a,pattern:'vertical'},
 social:{accent:0x8b3f2f,secondary:0xd4a72c,pattern:'imigongo'},
 transport:{accent:0xd7b44a,secondary:0x245c43,pattern:'route'},
 hill:{accent:0x5b7045,secondary:0x9b8068,pattern:'terrace'}
};
export class RwandaCulturalFacadeSystem{
 constructor(game){this.game=game;this.group=new THREE.Group();game.scene.add(this.group);this.materials=new Map();this.state=game.state.get().rwandaFacade||{facades:0,murals:0,signs:0,updatedAt:0};this.bind();this.sync();}
 bind(){this.game.events.on('geo:world-loaded',()=>this.decorate());this.game.events.on('place:identity-ready',()=>this.decorate());}
 theme(identity){const p=identity?.style?.palette||'urban';return THEMES[p]||THEMES.urban;}
 makeSign(name,code,theme){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#111';ctx.fillRect(0,0,512,128);ctx.fillStyle='#d7b44a';ctx.fillRect(0,0,12,128);ctx.fillStyle='#fff';ctx.font='bold 30px Arial';ctx.fillText(String(name).slice(0,26),28,52);ctx.font='18px monospace';ctx.fillStyle='#9ed0b8';ctx.fillText(String(code).slice(0,32),28,88);
  const tex=new THREE.CanvasTexture(canvas);const mat=new THREE.MeshBasicMaterial({map:tex});return new THREE.Mesh(new THREE.PlaneGeometry(3.2,.8),mat);
 }
 addFacade(mesh,identity){
  if(!mesh||!identity)return;
  const t=this.theme(identity);const accent=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1.2,mesh.scale.x*1.2),Math.min(mesh.geometry.parameters?.height||3,4)),new THREE.MeshStandardMaterial({color:t.accent,roughness:.75,metalness:.05}));
  accent.position.set(0,Math.min(mesh.geometry.parameters?.height||3,4)*.52,(mesh.geometry.parameters?.depth||2)/2+.01);mesh.add(accent);
  const sign=this.makeSign(identity.trueName,identity.code,t);sign.position.set(0,Math.min(mesh.geometry.parameters?.height||3,4)*.62,(mesh.geometry.parameters?.depth||2)/2+.03);mesh.add(sign);
  if(identity.iconic||identity.mural){
   const mural=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.6),new THREE.MeshStandardMaterial({color:t.secondary,roughness:.9}));
   mural.position.set(0,Math.min(mesh.geometry.parameters?.height||3,4)*.32,(mesh.geometry.parameters?.depth||2)/2+.035);mural.userData={culturalPanel:true,assetSlot:identity.mural?'rwanda-mural':'landmark-art'};
   mesh.add(mural);this.state.murals++;
  }
  this.state.facades++;this.state.signs++;
 }
 decorate(){
  this.group.clear();this.state.facades=0;this.state.murals=0;this.state.signs=0;
  const city=this.game.geoWorld?.city?.group;
  if(city)for(const mesh of city.children.slice(0,1800)){const tags=mesh.userData?.tags||{};const identity=mesh.userData?.identity||{trueName:mesh.userData?.placeName||tags.name||'Kigali Place',code:mesh.userData?.placeCode||'klg-place',style:{palette:'urban'},iconic:false,mural:false};this.addFacade(mesh,identity);}
  this.state.updatedAt=Date.now();this.sync();this.game.events.emit('rwanda:facade-ready',this.state);
 }
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({rwandaFacade:this.state});}
}
