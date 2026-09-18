export class PlayerCrewNetworkSystem{
 constructor(game){this.game=game;this.state=game.state.get().playerCrewNetwork||{hq:null,networkLevel:0,services:[],updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('player:crew-leadership',e=>this.activate(e));
  this.game.events.on('crew:safehouse-upgraded',e=>this.grow(e));
  this.game.events.on('crew:territory-controlled',e=>this.service(e));
 }
 activate(e={}){if(!e.crewId)return;this.state.hq=e.crewId;this.state.networkLevel=Math.max(1,this.state.networkLevel);this.game.events.emit('player:crew-network-active',this.state);this.sync();}
 grow(e={}){if(e.crewId!==this.state.hq)return;this.state.networkLevel++;this.sync();}
 service(e={}){if(e.crewId!==this.state.hq)return;const services=['safe-route','rapid-support','local-intel','vehicle-recovery'];const s=services[Math.min(services.length-1,Math.floor(this.state.networkLevel/2))];if(!this.state.services.includes(s))this.state.services.push(s);this.game.events.emit('crew:network-service-unlocked',{crewId:e.crewId,service:s});this.sync();}
 update(){this.state.updatedAt=Date.now();this.sync();}
 sync(){this.game.state.update({playerCrewNetwork:this.state});}
}