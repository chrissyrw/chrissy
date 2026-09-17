export class ActivityDirector {
  constructor(game){this.game=game;this.timer=0;this.cooldown=0;this.current=null;this.world={};this.lastActivity='';this.templates=this.createTemplates();this.bind();}
  createTemplates(){return[
    {id:'nyamirambo-moto-time-trial',district:'Nyamirambo',type:'TIME_TRIAL',title:'Nyamirambo Moto Run',base:72,fit:{night:1.25,traffic:1.1,clear:1.05},tags:['fast','night']},
    {id:'kimironko-market-delivery',district:'Kimironko',type:'DELIVERY',title:'Kimironko Market Run',base:78,fit:{population:1.2,traffic:1.08,economy:1.2},tags:['business','delivery']},
    {id:'cbd-corporate-contract',district:'CBD',type:'CONTRACT',title:'CBD Priority Contract',base:92,fit:{reputation:1.25,night:1.1,traffic:1.08},tags:['premium','city']},
    {id:'nyabugogo-transit-puzzle',district:'Nyabugogo',type:'LOGISTICS',title:'Nyabugogo Transit Run',base:84,fit:{traffic:1.3,population:1.15},tags:['traffic','logistics']},
    {id:'rebero-hill-climb',district:'Rebero',type:'HILL_CLIMB',title:'Rebero Hill Climb',base:80,fit:{clear:1.2,performance:1.2,night:.9},tags:['driving','hill']},
    {id:'mount-kigali-technical-run',district:'Mount Kigali',type:'TECHNICAL_RUN',title:'Mount Kigali Technical Run',base:76,fit:{storm:.85,performance:1.25,traffic:1.1},tags:['technical','terrain']}
  ];}
  bind(){this.game.events.on('ai:world-director',d=>{this.world=d||{};});this.game.events.on('mission:completed',m=>{this.cooldown=8;this.lastActivity=m?.activityId||this.lastActivity;});this.game.events.on('economy:director',d=>{this.economy=d||{};});this.game.events.on('business:orders',d=>{this.business=d||{};});}
  hour(){return Math.floor(this.game.state.get().world.time/60)%24;}
  playerContext(){const s=this.game.state.get(),v=this.game.vehicles.active;return{reputation:s.player.reputation||0,money:s.player.money||0,wanted:s.player.wanted||0,performance:v?.stats?.power||v?.power||1};}
  score(t){const h=this.hour(),w=this.game.state.get().world.weather,ctx=this.playerContext(),d=this.world||{};let score=t.base;if(h>=22||h<5)score*=t.fit.night||1;if(w==='storm')score*=t.fit.storm||1;else score*=t.fit.clear||1;if((d.congestion||0)>40)score*=t.fit.traffic||1;if((d.population||1)>1.15)score*=t.fit.population||1;if((this.economy?.rewardScale||1)>1.1)score*=t.fit.economy||1;if(ctx.reputation>50)score*=t.fit.reputation||1;if(ctx.performance>1)score*=t.fit.performance||1;if(ctx.wanted>2&&t.type==='CONTRACT')score*=.55;if(this.lastActivity===t.id)score*=.25;return score;}
  choose(){const ranked=this.templates.map(t=>({t,score:this.score(t)})).sort((a,b)=>b.score-a.score);if(!ranked.length)return null;const pool=ranked.slice(0,3),pick=pool[Math.floor(Math.random()*pool.length)];return {...pick.t,score:Math.round(pick.score),issuedAt:this.hour()};}
  issue(){if(this.cooldown>0||this.game.missions.active)return;const activity=this.choose();if(!activity)return;this.current=activity;this.lastActivity=activity.id;this.cooldown=16;const request={activityId:activity.id,district:activity.district,type:activity.type,title:activity.title,score:activity.score,reason:'ACTIVITY_AI'};this.game.events.emit('activity:requested',request);this.game.events.emit('activity:director',activity);const el=document.querySelector('#activity-ai');if(el)el.textContent=`ACTIVITY AI · ${activity.district.toUpperCase()} · ${activity.title}`;}
  update(dt){this.timer+=dt;this.cooldown=Math.max(0,this.cooldown-dt);if(this.timer<4)return;this.timer=0;this.issue();}
}
