import * as THREE from 'three';
import {GeoWorldDatabase} from './GeoWorldDatabase.js';
import {ProceduralCityGenerator} from './ProceduralCityGenerator.js';
const OSM='https://overpass-api.de/api/interpreter';const DEG=Math.PI/180;
export class GeoWorldSystem{
 constructor(game,geo){this.game=game;this.geo=geo;this.db=new GeoWorldDatabase();this.group=new THREE.Group();game.scene.add(this.group);this.city=new ProceduralCityGenerator(game);this.loaded=false;this.loading=false;this.origin=geo.origin;this.scale=geo.scale;this.stats={buildings:0,pois:0,districts:0};this.placeIdentity=null;}
 project(lon,lat){return{x:(lon-this.origin.lon)*111320*Math.cos(this.origin.lat*DEG)*this.scale,z:-(lat-this.origin.lat)*110540*this.scale};}
 async loadKigali(){if(this.loading||this.loaded)return;this.loading=true;try{const q='[out:json][timeout:25];(nwr["building"](-2.10,29.95,-1.82,30.20);nwr["amenity"](-2.10,29.95,-1.82,30.20);nwr["shop"](-2.10,29.95,-1.82,30.20);nwr["tourism"](-2.10,29.95,-1.82,30.20););out center;';const res=await fetch(OSM,{method:'POST',body:new URLSearchParams({data:q})});if(!res.ok)throw new Error(`OSM HTTP ${res.status}`);const data=await res.json();const counts=this.db.ingestOSM(data);this.render();this.stats={...counts,districts:this.db.districts.length};this.loaded=true;this.game.state.update({geoWorld:this.stats});this.game.events.emit('geo:world-loaded',this.stats);this.game.events.emit('place:geo-identity-build',{buildings:this.db.buildings.length,pois:this.db.pois.length});}catch(error){this.game.events.emit('geo:error',{source:'OSM Geo World',message:error.message});}finally{this.loading=false;}}
 render(){this.group.clear();this.city.generate(this.db.buildings,(lon,lat)=>this.project(lon,lat),12000);this.group.add(this.city.group);const poiMat=new THREE.MeshStandardMaterial({color:0x4cc9a7,emissive:0x12352d});for(const p0 of this.db.pois.slice(0,4000)){const p=this.project(p0.lon,p0.lat);const m=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.7,8),poiMat);m.position.set(p.x,.35,p.z);m.userData={id:p0.id,name:p0.name,kind:p0.kind,tags:p0.tags,identity:p0.identity||null};this.group.add(m);}}
 districtAt(lon,lat){return this.db.districtAt(lon,lat);}
 nearestPOI(x,z,radius=20){let best=null,bd=radius*radius;for(const p of this.db.pois){const q=this.project(p.lon,p.lat);const d=(q.x-x)**2+(q.z-z)**2;if(d<bd){bd=d;best=p;}}return best;}
 update(){if(!this.loaded&&!this.loading)this.loadKigali();}
}
