const DEFAULT_PROFILE={
  displayName:'KLG Legend',
  callsign:'LEGEND',
  archetype:'CITY EXPLORER',
  signatureVehicle:'Kigali Runner',
  socialStyle:'open',
  badge:'NEW IN THE CITY'
};

const MAX_ENCOUNTERS=32;
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));

export class SocialWorldSystem{
  constructor(game){
    this.game=game;
    this.profile={...DEFAULT_PROFILE};
    this.players=new Map();
    this.encounters=[];
    this.crews=new Map();
    this.cooldown=0;
    this.socialPulse=0;
    this.load();
    this.bind();
  }

  bind(){
    this.game.events.on('identity:changed',d=>{
      if(d?.label)this.profile.archetype=d.label;
      this.sync();
    });
    this.game.events.on('vehicle:changed',v=>{
      if(v?.name)this.profile.signatureVehicle=v.name;
      this.sync();
    });
    this.game.events.on('opportunity:resolved',o=>this.recordAction('opportunity',o));
    this.game.events.on('world:consequence',c=>this.recordAction('consequence',c));
  }

  load(){
    const saved=this.game.state.get().social;
    if(saved){
      this.profile={...DEFAULT_PROFILE,...(saved.profile||{})};
      this.encounters=[...(saved.encounters||[])].slice(-MAX_ENCOUNTERS);
      for(const p of saved.players||[])this.players.set(p.id,p);
      for(const c of saved.crews||[])this.crews.set(c.id,c);
    }
    this.sync(false);
  }

  socialId(){
    const seed=(this.profile.callsign+'|'+this.profile.displayName).toLowerCase();
    let h=2166136261;
    for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}
    return 'KLG-'+(h>>>0).toString(36).toUpperCase().padStart(7,'0').slice(0,7);
  }

  setProfile(patch={}){
    this.profile={...this.profile,...patch};
    this.sync();
    this.game.events.emit('social:profile-changed',this.publicProfile());
  }

  publicProfile(){
    return {id:this.socialId(),...this.profile,knownBy:this.encounters.length};
  }

  recordAction(kind,data={}){
    const signature={
      identity:this.game.state.get().identity?.archetype||'explorer',
      vehicle:this.game.state.get().garage?.active||this.profile.signatureVehicle,
      district:this.game.state.get().world?.district||'Kigali',
      action:kind,
      title:data.title||data.name||data.type||kind,
      time:Date.now()
    };
    this.profile.signatureVehicle=signature.vehicle||this.profile.signatureVehicle;
    this.profile.badge=this.badgeFor(signature);
    this.sync();
  }

  badgeFor(s){
    if(s.identity==='racer')return 'FAST KNOWN FACE';
    if(s.identity==='courier')return 'RELIABLE RUNNER';
    if(s.identity==='night')return 'NIGHT REGULAR';
    if(s.identity==='lowprofile')return 'QUIET OPERATOR';
    if(s.identity==='operator')return 'CITY CONNECTOR';
    return 'CITY EXPLORER';
  }

  encounter(other){
    if(!other?.id||other.id===this.socialId())return;
    const now=Date.now();
    let p=this.players.get(other.id)||{id:other.id,name:other.name||'Unknown Legend',trust:0,meetings:0,lastSeen:0,tags:[],favorite:false};
    const repeat=now-p.lastSeen<90000;
    p.name=other.name||p.name;
    p.meetings+=repeat?0:1;
    p.lastSeen=now;
    p.trust=clamp(p.trust+(repeat?.5:2));
    if(other.archetype&&!p.tags.includes(other.archetype))p.tags.push(other.archetype);
    this.players.set(p.id,p);
    if(!repeat)this.encounters.push({id:p.id,name:p.name,district:this.game.state.get().world.district,time:now});
    this.encounters=this.encounters.slice(-MAX_ENCOUNTERS);
    this.sync();
    this.game.events.emit('social:recognized',p);
  }

  endorse(id,tag){
    const p=this.players.get(id);if(!p)return false;
    p.trust=clamp(p.trust+4);
    if(tag&&!p.tags.includes(tag))p.tags.push(tag);
    this.sync();
    this.game.events.emit('social:endorsement',{player:p,tag});
    return true;
  }

  crew(id,name,role='member'){
    if(!id||!name)return false;
    let c=this.crews.get(id)||{id,name,members:[],reputation:0,territories:[],specialty:'mixed'};
    c.members=Array.from(new Set([...c.members,this.socialId()]));
    c.reputation=clamp(c.reputation+1);
    this.crews.set(id,c);
    this.sync();
    this.game.events.emit('social:crew-updated',{crew:c,role});
    return true;
  }

  createSocialOpportunity(kind='MEET'){
    const s=this.game.state.get();
    const district=s.world?.district||'Kigali';
    const id='social-'+Date.now().toString(36);
    const opportunity={id,type:kind,district,target:{x:s.player.position.x,z:s.player.position.z},title:kind==='MEET'?'PLAYER MEETUP':'CREW SIGNAL',reward:0,rep:1,identity:'operator'};
    this.game.events.emit('social:opportunity',opportunity);
    return opportunity;
  }

  update(dt){
    this.cooldown=Math.max(0,this.cooldown-dt);
    this.socialPulse+=dt;
    const el=document.querySelector('#social');
    if(el){
      const known=this.players.size;
      const crew=[...this.crews.values()][0];
      el.textContent=`SOCIAL: ${known} KNOWN${crew?' · CREW '+crew.name.toUpperCase():''}`;
    }
  }

  sync(emit=true){
    const players=[...this.players.values()].map(p=>({...p,tags:[...(p.tags||[])]}));
    const crews=[...this.crews.values()];
    this.game.state.update({social:{profile:this.publicProfile(),players,encounters:this.encounters,crews}});
    if(emit)this.game.events.emit('social:updated',{profile:this.publicProfile(),players,crews});
  }
}
