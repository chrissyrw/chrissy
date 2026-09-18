import * as THREE from 'three';
import { RwandaGeoDatabase, RSA_ROAD_QUERY } from './RwandaGeoDatabase.js';
import { RoadGraph } from './RoadGraph.js';

const DEG=Math.PI/180;
function mercatorToLonLat(x,y){const lon=x/6378137/DEG;const lat=(2*Math.atan(Math.exp(y/6378137))-Math.PI/2)/DEG;return {lon,lat};}

export class RwandaGeoSystem{
  constructor(game){this.game=game;this.db=new RwandaGeoDatabase();this.graph=new RoadGraph();this.group=new THREE.Group();this.game.scene.add(this.group);this.loaded=false;this.loading=false;this.origin={lon:30.0619,lat:-1.9441};this.scale=0.11;this.loadKigaliRoads();}
  project(x,y){const {lon,lat}=mercatorToLonLat(x,y);const ox=(lon-this.origin.lon)*111320*Math.cos(this.origin.lat*DEG)*this.scale;const oz=-(lat-this.origin.lat)*110540*this.scale;return {x:ox,z:oz};}
  async loadKigaliRoads(){
    if(this.loading)return;this.loading=true;
    try{
      const params=new URLSearchParams({where:'1=1',outFields:'*',returnGeometry:'true',outSR:'3857',f:'geojson',resultRecordCount:'1000'});
      const res=await fetch(`${RSA_ROAD_QUERY}?${params}`);if(!res.ok)throw new Error(`RSA roads HTTP ${res.status}`);const data=await res.json();
      const count=this.db.ingestGeoJSON(data);this.graph.build(this.db.roads,(x,y)=>this.project(x,y));this.renderRoads();this.loaded=true;this.game.events.emit('geo:roads-loaded',{count,nodes:this.graph.nodes.size,edges:this.graph.edges.size,source:this.db.source});this.game.events.emit('geo:road-graph-ready',this.graph);
    }catch(error){this.game.events.emit('geo:error',{source:'RSA roads',message:error.message});}
    finally{this.loading=false;}
  }
  renderRoads(){this.group.clear();const mats={NATIONAL:new THREE.LineBasicMaterial({color:0xd45a4f,transparent:true,opacity:.72}),DISTRICT_1:new THREE.LineBasicMaterial({color:0xc9a24f,transparent:true,opacity:.6}),DISTRICT_2:new THREE.LineBasicMaterial({color:0x8d9aa8,transparent:true,opacity:.52}),LOCAL:new THREE.LineBasicMaterial({color:0x6f7a83,transparent:true,opacity:.35})};for(const r of this.db.roads){const lines=r.geometry.type==='LineString'?[r.geometry.coordinates]:r.geometry.coordinates;for(const line of lines){const pts=line.map(c=>{const p=this.project(c[0],c[1]);return new THREE.Vector3(p.x,.025,p.z);});if(pts.length<2)continue;this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),mats[r.class]||mats.LOCAL));}}}
  nearest(x,z){return this.graph.nearest(x,z);}
  roadAt(x,z){const n=this.nearest(x,z);return n?this.db.getRoad([...n.roads][0]):null;}
  update(){}
  dispose(){this.group.clear();}
}
