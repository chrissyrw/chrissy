export class CrewTerritoryOpportunitySystem{
 constructor(game){this.game=game;this.tick=0;this.bind();}
 bind(){
  this.game.events.on('crew:territory-controlled',e=>this.offer(e));
  this.game.events.on('crew:territory-update',e=>{if(e.contested)this.contest(e);});
 }
 offer(e={}){this.game.events.emit('gameplay:opportunity',{id:'territory-'+Date.now(),type:'crew-territory',source:'crew-territory',district:e.district,title:'Protect Crew Territory',reward:480,risk:.32,crewId:e.crewId});}
 contest(e={}){this.game.events.emit('gameplay:opportunity',{id:'territory-defense-'+Date.now(),type:'crew-defense',source:'crew-territory',district:e.district,title:'Defend Contested Territory',reward:650,risk:.58,crewId:e.crewId});}
 update(dt){this.tick+=dt;if(this.tick>6)this.tick=0;}
}