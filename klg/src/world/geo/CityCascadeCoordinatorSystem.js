const DISTRICTS=['KigaliCBD','Kimironko','Nyamirambo','Kimihurura','Kacyiru','Remera','Nyarutarama','Rebero','Kicukiro','Kanombe','Gikondo'];
const LINKS={
 Gikondo:['Kicukiro','KigaliCBD','Nyamirambo'],
 Kicukiro:['Gikondo','Kanombe','Remera'],
 Remera:['Kimironko','Kacyiru','Kanombe'],
 Kimironko:['Remera','Kacyiru','Nyarutarama'],
 Nyamirambo:['Gikondo','KigaliCBD','Kacyiru'],
 KigaliCBD:['Gikondo','Nyamirambo','Kimihurura','Kacyiru'],
 Kimihurura:['KigaliCBD','Kacyiru','Nyarutarama'],
 Kacyiru:['KigaliCBD','Kimihurura','Kimironko','Remera'],
 Nyarutarama:['Kimihurura','Kimironko','Rebero'],
 Rebero:['Nyarutarama','Kicukiro'],
 Kanombe:['Kicukiro','Remera']
};
export class CityCascadeCoordinatorSystem{
 constructor(game){
  this.game=game;
  this.state=game.state.get().cityCascade||{waves:0,propagated:0,lastWave:0,pressure:{},updatedAt:0};
  this.bind();this.sync();
 }
 bind(){
  this.game.events.on('district:cascade-wave',e=>this.wave(e||{}));
  this.game.events.on('world:historical-ripple',e=>this.ripple(e||{}));
  this.game.events.on('city:crisis-start',e=>this.wave({...e,type:'crisis',strength:.2}));
 }
 wave(e){
  const origin=e.origin||e.district||this.game.state.get().world?.district||'KigaliCBD';
  const strength=Math.max(.01,Math.min(1,Number(e.strength||.08)));
  this.state.waves++;this.state.lastWave=Date.now();
  const targets=LINKS[origin]||DISTRICTS.filter(d=>d!==origin).slice(0,2);
  for(const district of targets){
   this.state.pressure[district]=Math.min(1,(this.state.pressure[district]||0)+strength);
   this.state.propagated++;
   this.game.events.emit('district:cascade-impact',{origin,district,type:e.type||'world',strength:strength*.65});
   this.game.events.emit('ai:world-pressure',{district,type:'cascade',pressure:strength*.65});
  }
  this.game.events.emit('city:cascade-resolved',{origin,type:e.type||'world',targets});
 }
 ripple(e){
  if(!e.district)return;
  this.state.pressure[e.district]=Math.min(1,(this.state.pressure[e.district]||0)+Math.abs(Number(e.value||0))*.05);
 }
 update(dt){
  for(const d of Object.keys(this.state.pressure))this.state.pressure[d]=Math.max(0,this.state.pressure[d]-Math.max(.0005,dt*.002));
  this.state.updatedAt=Date.now();this.sync();
 }
 sync(){this.game.state.update({cityCascade:this.state});}
}
