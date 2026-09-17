export const RSA_ROAD_QUERY='https://portal.space.gov.rw/server/rest/services/Hosted/Topographic_Basemap/FeatureServer/30/query';
export const KLG_GEO_CONFIG={
  source:'Rwanda Space Agency · Topographic Basemap',
  spatialReference:3857,
  roadLayer:30,
  formats:['geojson','json','pbf'],
  osmReference:'https://download.geofabrik.de/africa/rwanda.html',
  attribution:'Road geometry: Rwanda Space Agency; OSM reference data: OpenStreetMap contributors'
};

const TYPE_SPEED={'National Road':70,'District road class1':55,'District road class 2':40,'Other Road':30};
const TYPE_CLASS={'National Road':'NATIONAL','District road class1':'DISTRICT_1','District road class 2':'DISTRICT_2','Other Road':'LOCAL'};

export class RwandaGeoDatabase{
  constructor(){this.roads=[];this.loaded=false;this.source=KLG_GEO_CONFIG.source;}
  normalizeFeature(f){
    const p=f?.properties||{};const type=p.type||p.Type||'Other Road';
    return {id:p.new_id||p.New_ID||p.objectid||p.OBJECTID||crypto.randomUUID?.()||Math.random().toString(36).slice(2),type,class:TYPE_CLASS[type]||'LOCAL',speed:Number(p.speed||TYPE_SPEED[type]||30),district:p.district||p.District||'',roadNo:p.road_no||p.ROAD_NO||'',status:p.status||'active',geometry:f.geometry};
  }
  ingestGeoJSON(data){
    const features=data?.features||[];this.roads=features.filter(f=>f.geometry&&(f.geometry.type==='LineString'||f.geometry.type==='MultiLineString')).map(f=>this.normalizeFeature(f));this.loaded=true;return this.roads.length;
  }
  getRoad(id){return this.roads.find(r=>r.id===id)||null;}
  byDistrict(name){return this.roads.filter(r=>String(r.district).toLowerCase()===String(name).toLowerCase());}
  byClass(cls){return this.roads.filter(r=>r.class===cls);}
  nearest(point){let best=null,bestD=Infinity;for(const r of this.roads){for(const line of r.geometry.type==='LineString'?[r.geometry.coordinates]:r.geometry.coordinates){for(const c of line){const d=(c[0]-point.x)**2+(c[1]-point.y)**2;if(d<bestD){bestD=d;best=r;}}}}return best;}
}
