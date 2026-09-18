const CLAMP=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ACTIONS=['observe','help-a','help-b','avoid'];
export class FactionConflictEncounterSystem{
 constructor(game){this.game=game;this.tick=0;const saved=game.state.get().factionConflictEncounters||{};this.state=saved.encounters?{...saved}:this.empty();this.bind();this.sync();}
 empty(){return{encounters:{},active:null,history:[],updatedAt:0};}
 bind(){this.game.events.on('faction:conflict-event',e=>this.spawn(e));}
 spawn(e={}){const c=e.conflict;if(!c?.a||!c?.b)return;const id=`${c.id}:${Date.now()}`;const encounter={id,conflictId:c.id,a:c.a,b:c.b,district:e.district||c.district||'Kigali',intensity:CLAMP(c.intensity||0),options:[...ACTIONS],status:'active',createdAt:Date.now()};this.state.encounters[id]=encounter;this.state.active=encounter;this.historyPush({type:'spawn',id,district:encounter.district,a:encounter.a,b:encounter.b});this.sync();this.game.events.emit('faction:encounter',{...encounter});}
 choose(action='observe'){const e=this.state.active;if(!e||!ACTIONS.includes(action))return false;e.choice=action;e.status='resolved';e.action=action;e.faction=action==='help-a'?e.a:action==='help-b'?e.b:null;const delta=action==='help-a'?.06:action==='help-b'?.06:action==='avoid'?.015:0;e.playerImpact=delta;this.historyPush({type:'choice',id:e.id,choice:action,district:e.district});this.state.active=null;this.sync();this.game.events.emit('faction:encounter-resolved',{...e});return true;}
 historyPush(e){this.state.history.unshift({...e,at:Date.now()});this.state.history=this.state.history.slice(0,48);}
 update(dt){this.tick+=dt;if(this.tick<1)return;this.tick=0;const e=this.state.active;if(e&&Date.now()-e.createdAt>12000){e.status='expired';this.state.active=null;this.historyPush({type:'expired',id:e.id});this.sync();}}
 sync(){this.state.updatedAt=Date.now();this.game.state.update({factionConflictEncounters:this.state});}
}
