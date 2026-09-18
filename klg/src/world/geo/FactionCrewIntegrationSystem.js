const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const FACTIONS=['Market Circle','Night Route','Hill Runners','City Services','Transport Network'];
export class FactionCrewIntegrationSystem{
 constructor(game){this.game=game;this.state=game.state.get().factionCrews||{links:{},updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:formed',e=>this.link(e));
  this.game.events.on('crew:progress',e=>this.apply(e));
  this.game.events.on('crew:level-up',e=>this.apply(e));
  this.game.events.on('faction:player-standing',e=>this.refresh(e));
 }
 link(e={}){
  if(!e.id)return;
  const faction=this.pick(e.district||'KigaliCBD');
  this.state.links[e.id]={crewId:e.id,faction,district:e.district||'KigaliCBD',reputation:0,influence:0};
  this.game.events.emit('crew:faction-linked',this.state.links[e.id]);
  this.sync();
 }
 pick(district){
  const map={Kimironko:'Market Circle',Nyamirambo:'Night Route',Rebero:'Hill Runners',Kacyiru:'City Services',Remera:'Transport Network',Gikondo:'Transport Network',KigaliCBD:'City Services'};
  return map[district]||FACTIONS[Math.abs(String(district).length)%FACTIONS.length];
 }
 apply(e={}){
  const link=this.state.links[e.id];if(!link)return;
  link.reputation=CLAMP(link.reputation+(e.cohesion-.45)*.05+(e.completed||0)*.01);
  link.influence=CLAMP(link.influence+(e.influence||0)*.08+(e.level||1)*.003);
  this.game.events.emit('faction:crew-impact',{...link,level:e.level||1});
  this.sync();
 }
 refresh(){for(const l of Object.values(this.state.links))l.reputation=CLAMP(l.reputation);}
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({factionCrews:this.state});}
}