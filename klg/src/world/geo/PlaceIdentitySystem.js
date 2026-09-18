const DISTRICT_STYLES={
  Kimironko:{palette:'market',motifs:['imigongo','woven-grid','market-stripes'],materials:['stone','plaster','painted-metal']},
  Nyamirambo:{palette:'social',motifs:['imigongo','warm-geometry','street-lettering'],materials:['plaster','brick','painted-metal']},
  Kimihurura:{palette:'business',motifs:['clean-lines','glass-bands','imigongo-accent'],materials:['glass','stone','plaster']},
  Kacyiru:{palette:'civic',motifs:['clean-lines','rwanda-pattern','civic-seal'],materials:['stone','concrete','glass']},
  Remera:{palette:'transport',motifs:['route-stripes','woven-grid','bold-signage'],materials:['concrete','painted-metal','plaster']},
  KigaliCBD:{palette:'urban',motifs:['vertical-bands','imigongo','night-lighting'],materials:['glass','stone','metal']},
  Nyarutarama:{palette:'upscale',motifs:['minimal-rwanda','greenery','stone-bands'],materials:['stone','glass','plaster']},
  Rebero:{palette:'hill',motifs:['hill-lines','imigongo','terrace-bands'],materials:['stone','timber','plaster']},
  Kicukiro:{palette:'neighborhood',motifs:['imigongo','woven-grid','local-signage'],materials:['plaster','brick','metal']},
  Kanombe:{palette:'gateway',motifs:['airport-lines','rwanda-pattern','wayfinding'],materials:['stone','metal','glass']}
};
const NAME_KEYS=['name','official_name','alt_name','loc_name','name:en','name:rw'];
const CODE_KEYS=['ref','ref:rw','wikidata','wikipedia','operator','brand','amenity','shop','tourism','building'];
export class PlaceIdentitySystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().placeIdentity||{places:0,named:0,designed:0,updatedAt:0};
  this.bind();this.sync();
 }
 canonicalName(tags={},fallback='Kigali Place'){
  for(const k of NAME_KEYS)if(tags[k])return String(tags[k]).trim();
  return fallback;
 }
 code(tags={},id){
  for(const k of CODE_KEYS)if(tags[k])return String(tags[k]).replace(/\\s+/g,'-').toLowerCase();
  return `klg-place-${id}`;
 }
 districtStyle(district='KigaliCBD'){return DISTRICT_STYLES[district]||DISTRICT_STYLES.KigaliCBD;}
 identity(place,district){
  const tags=place.tags||{};
  const name=this.canonicalName(tags,tags.building||tags.amenity||tags.shop||'Kigali Place');
  return {
   trueName:name,
   code:this.code(tags,place.id),
   district,
   source:tags.name?'osm-name':'klg-generated',
   category:place.kind||tags.amenity||tags.shop||tags.tourism||'place',
   style:this.districtStyle(district),
   iconic:tags.tourism==='attraction'||tags.historic==='monument'||!!tags.wikidata||!!tags.wikipedia,
   mural:tags.mural==='yes'||tags.artwork_type==='mural',
   culturalMarks:['Rwanda','Kigali'].concat(tags.name?'true-name':'generated-name')
  };
 }
 bind(){
  this.game.events.on('geo:world-loaded',()=>this.updateFromWorld());
  this.game.events.on('district:normalized-ai',e=>this.game.events.emit('place:district-style',{district:e.district,style:this.districtStyle(e.district)}));
 }
 updateFromWorld(){
  const db=this.game.geoWorld?.db;
  if(!db)return;
  let named=0,designed=0;
  for(const p of db.pois){p.identity=this.identity(p,p.district||this.game.state.get().world.district||'KigaliCBD');if(p.identity.source==='osm-name')named++;p.design=p.identity.style;designed++;}
  for(const b of db.buildings){b.identity=this.identity(b,this.game.state.get().world.district||'KigaliCBD');b.design=b.identity.style;}\n  const meshes=this.game.geoWorld?.city?.group?.children||[];\n  for(const mesh of meshes){const id=mesh.userData?.geoId;if(id==null)continue;const b=db.buildings.find(x=>String(x.id)===String(id));if(b?.identity){mesh.userData.identity=b.identity;mesh.userData.placeName=b.identity.trueName;mesh.userData.placeCode=b.identity.code;mesh.userData.design=b.identity.style;}}
  this.state.places=db.pois.length+db.buildings.length;this.state.named=named;this.state.designed=designed;this.state.updatedAt=Date.now();this.sync();
  this.game.events.emit('place:identity-ready',{places:this.state.places,named,designed});
 }
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({placeIdentity:this.state});}
}
