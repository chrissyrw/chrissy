const ASSETS=[
 {id:'gikondo-industrial-heritage',district:'Gikondo',type:'district-signature',label:'Gikondo Industrial & Community Heritage',motifs:['industrial-frames','local-signage','imigongo'],priority:1},
 {id:'kigali-civic-portrait-mural',district:'KigaliCBD',type:'civic-mural',label:'Kigali Civic Portrait Mural',motifs:['rwanda-pattern','portrait-panel'],priority:2,assetSlot:'civic-portrait'},
 {id:'rwanda-imigongo-facade',district:'Nyamirambo',type:'cultural-facade',label:'Imigongo Facade',motifs:['imigongo'],priority:3},
 {id:'kigali-hills-signage',district:'Rebero',type:'wayfinding',label:'Kigali Hills Wayfinding',motifs:['hill-lines','rwanda-pattern'],priority:3},
 {id:'kigali-market-signage',district:'Kimironko',type:'market-signage',label:'Kimironko Market Signage',motifs:['market-stripes','woven-grid'],priority:2}
];
export class RwandaCulturalAssetRegistrySystem{
 constructor(game){this.game=game;this.assets=ASSETS.map(x=>({...x}));this.state=game.state.get().culturalAssetRegistry||{assets:0,placed:0,updatedAt:0};this.bind();this.sync();}
 bind(){this.game.events.on('geo:world-loaded',()=>this.resolve());this.game.events.on('place:identity-ready',()=>this.resolve());}
 resolve(){
  const db=this.game.geoWorld?.db;if(!db)return;
  let placed=0;
  for(const p of db.pois){const district=p.identity?.district||p.district||'KigaliCBD';p.culturalAssets=this.assets.filter(a=>a.district===district||a.district==='Kigali').map(a=>a.id);if(p.culturalAssets.length)placed++;}
  for(const b of db.buildings){const district=b.identity?.district||'KigaliCBD';b.culturalAssets=this.assets.filter(a=>a.district===district||a.district==='Kigali').map(a=>a.id);if(b.culturalAssets.length)placed++;}
  this.state={assets:this.assets.length,placed,updatedAt:Date.now()};this.sync();
  this.game.events.emit('cultural-assets:resolved',{assets:this.assets,placed});
 }
 forDistrict(district){return this.assets.filter(a=>a.district===district);}
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({culturalAssetRegistry:this.state});}
}
