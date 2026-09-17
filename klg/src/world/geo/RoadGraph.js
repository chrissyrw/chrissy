export class RoadGraph{
  constructor(){this.nodes=new Map();this.edges=new Map();}
  key(x,z){return `${Math.round(x)}:${Math.round(z)}`;}
  addRoad(road,project){const lines=road.geometry.type==='LineString'?[road.geometry.coordinates]:road.geometry.coordinates.flat();for(const line of lines){let prev=null;for(const c of line){const p=project(c[0],c[1]);const id=this.key(p.x,p.z);if(!this.nodes.has(id))this.nodes.set(id,{id,x:p.x,z:p.z,roads:new Set()});this.nodes.get(id).roads.add(road.id);if(prev&&prev!==id){const k=prev<id?`${prev}|${id}`:`${id}|${prev}`;this.edges.set(k,{a:prev,b:id,roadId:road.id,speed:road.speed,class:road.class});}prev=id;}}}
  build(roads,project){this.nodes.clear();this.edges.clear();for(const r of roads)this.addRoad(r,project);return {nodes:this.nodes.size,edges:this.edges.size};}
  nearest(x,z){let best=null,d=Infinity;for(const n of this.nodes.values()){const q=(n.x-x)**2+(n.z-z)**2;if(q<d){d=q;best=n;}}return best;}
}
