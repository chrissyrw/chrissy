const KIND_MAP={building:'BUILDING',shop:'SHOP',amenity:'AMENITY',highway:'ROAD',tourism:'LANDMARK',leisure:'LEISURE',natural:'NATURAL'};
export class GeoWorldDatabase{
  constructor(){this.buildings=[];this.pois=[];this.districts=[];this.terrain=[];this.source='KLG Geo World v2';}
  ingestOSM(json){
    const elements=json?.elements||[];for(const e of elements){const tags=e.tags||{};const kind=KIND_MAP[tags.building?'building':tags.shop?'shop':tags.amenity?'amenity':tags.highway?'highway':tags.tourism?'tourism':tags.leisure?'leisure':tags.natural?'natural':''];
      if(kind==='BUILDING'&&e.lat!=null&&e.lon!=null)this.buildings.push({id:e.id,lat:e.lat,lon:e.lon,kind,tags});
      else if(kind&&kind!=='ROAD'&&e.lat!=null&&e.lon!=null)this.pois.push({id:e.id,lat:e.lat,lon:e.lon,kind,name:tags.name||'',tags});
    }
    return {buildings:this.buildings.length,pois:this.pois.length};
  }
  addDistrict(name,polygon){this.districts.push({name,polygon});}
  districtAt(lon,lat){for(const d of this.districts){if(pointInPolygon(lon,lat,d.polygon))return d.name;}return 'Kigali';}
  clear(){this.buildings.length=0;this.pois.length=0;this.districts.length=0;this.terrain.length=0;}
}
function pointInPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const xi=p[i][0],yi=p[i][1],xj=p[j][0],yj=p[j][1];const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi);if(hit)inside=!inside;}return inside;}
