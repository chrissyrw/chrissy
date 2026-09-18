export class CrewMissionSystem{
 constructor(game){this.game=game;this.next=1;this.state=game.state.get().crewMissions||{missions:[],updatedAt:0};this.bind();this.sync();}
 bind(){
  this.game.events.on('crew:support-active',e=>this.generate(e));
  this.game.events.on('crew:formed',e=>this.generate({crewId:e.id,district:e.district,type:'recruit'}));
  this.game.events.on('gameplay:opportunity-accept',e=>{if((e?.type||e?.mission?.type)==='crew-mission')this.accept(e.id||e.opportunityId||e.missionId);});
  this.game.events.on('mission:completed',e=>this.resolve(e.crewMissionId,true));
  this.game.events.on('mission:failed',e=>this.resolve(e.crewMissionId,false));
 }
 generate(e={}){
  if(!e.crewId)return;
  const m={id:'crew-mission-'+this.next++,crewId:e.crewId,district:e.district||'KigaliCBD',type:e.type||'support',roles:['driver','scout','support'],reward:e.type==='recruit'?360:520,status:'available',expiresAt:Date.now()+120000};
  this.state.missions=[m,...this.state.missions].slice(0,24);
  this.game.events.emit('mission:crew-generated',m);
  this.game.events.emit('gameplay:opportunity',{...m,type:'crew-mission',source:'crew-world'});
  this.sync();
 }
 accept(id){
  const m=this.state.missions.find(x=>x.id===id&&x.status==='available');if(!m)return false;
  m.status='active';this.game.events.emit('mission:crew-accepted',m);this.sync();return true;
 }
 resolve(id,success){
  if(!id)return;
  const m=this.state.missions.find(x=>x.id===id&&x.status==='active');if(!m)return;
  m.status=success?'completed':'failed';m.resolvedAt=Date.now();this.game.events.emit('mission:crew-resolved',{...m,success});this.sync();
 }
 update(){const now=Date.now();for(const m of this.state.missions)if(m.status==='available'&&m.expiresAt<now)m.status='expired';this.state.missions=this.state.missions.filter(m=>m.status!=='expired'||m.expiresAt>now-60000);this.state.updatedAt=now;this.sync();}
 sync(){this.game.state.update({crewMissions:this.state});}
}