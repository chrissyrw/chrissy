export class CrewEconomicOpportunitySystem{
 constructor(game){this.game=game;this.bind();}
 bind(){
  this.game.events.on('crew:business-opened',e=>this.offer(e,'expand'));
  this.game.events.on('crew:protection-offer',e=>this.offer(e,'protect'));
  this.game.events.on('crew:supply-update',e=>{if(e.stock<30)this.offer(e,'resupply');});
 }
 offer(e={},type='expand'){
  this.game.events.emit('gameplay:opportunity',{id:'crew-econ-'+Date.now(),type:'crew-economy',source:'crew-economy',district:e.district,crewId:e.crewId,action:type,reward:type==='protect'?300:420,risk:type==='resupply'?.45:.22,title:'Crew '+type});
 }
 update(){}
}