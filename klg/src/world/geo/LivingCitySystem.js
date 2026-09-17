const ACTIVITY={residential:{day:.35,night:.18},retail:{day:.85,night:.3},commercial:{day:.9,night:.22},civic:{day:.72,night:.12},landmark:{day:.55,night:.42}};
export class LivingCitySystem{
 constructor(game,geoWorld){this.game=game;this.geoWorld=geoWorld;this.time=8;this.tick=0;this.cells=new Map();this.stats={activeBuildings:0,activePOIs:0,cityEnergy:0};}
 hour(){const h=this.game.state.get()?.world?.time;return typeof h==='number'?h:this.time;}
 classify(tags={}){if(tags.tourism)return'landmark';if(['school','hospital','townhall','police'].includes(tags.amenity))return'civic';if(tags.shop)return'retail';if(tags.building==='commercial'||tags.building==='office')return'commercial';return'residential';}
 activity(type,h){const a=ACTIVITY[type]||ACTIVITY.residential;const night=h<6||h>=22;const rush=(h>=7&&h<=9)||(h>=16&&h<=19);let v=night?a.night:a.day;if(rush&&type!=='landmark')v*=1.22;return Math.min(1,v);}
 update(dt){if(!this.geoWorld?.loaded)return;this.tick+=dt;if(this.tick<1)return;this.tick=0;const h=this.hour();let activeBuildings=0,activePOIs=0,total=0;for(const b of this.geoWorld.db.buildings){const type=this.classify(b.tags),level=this.activity(type,h);this.cells.set(b.id,{id:b.id,type,activity:level,district:this.geoWorld.districtAt(b.lon,b.lat)});if(level>.3)activeBuildings++;total+=level;}for(const p of this.geoWorld.db.pois){const type=p.kind==='SHOP'?'retail':p.kind==='LANDMARK'?'landmark':'civic';const level=this.activity(type,h);if(level>.25)activePOIs++;}this.stats={activeBuildings,activePOIs,cityEnergy:total};this.game.state.update({livingCity:this.stats});this.game.events.emit('city:living-update',this.stats);if(Math.random()<.08)this.emitSignal(h);}
 emitSignal(hour){const list=[...this.cells.values()].filter(c=>c.activity>.55);if(!list.length)return;const c=list[Math.floor(Math.random()*list.length)];this.game.events.emit('city:activity-signal',{buildingId:c.id,district:c.district,type:c.type,activity:c.activity,hour});}
 activityAtBuilding(id){return this.cells.get(id)?.activity||0;}
 districtActivity(name){let sum=0,n=0;for(const c of this.cells.values())if(c.district===name){sum+=c.activity;n++;}return n?sum/n:0;}
}
