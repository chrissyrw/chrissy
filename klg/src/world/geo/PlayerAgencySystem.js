const CLAMP=(v,a=-100,b=100)=>Math.max(a,Math.min(b,v));

const IMPACTS={
  deliver:{rep:4,money:1,xp:12},
  reroute:{rep:2,money:.65,xp:8},
  abandon:{rep:-3,money:0,xp:2},
  'help-a':{rep:5,xp:10},
  'help-b':{rep:5,xp:10},
  avoid:{rep:0,xp:3},
  help:{rep:4,xp:8},
  join:{rep:3,xp:7},
  report:{rep:2,xp:5},
  buy:{rep:1,money:.8,xp:5},
  wait:{rep:0,xp:2},
  oppose:{rep:-5,xp:9}
};

export class PlayerAgencySystem{
  constructor(game){
    this.game=game;
    this.tick=0;
    const saved=game.state.get().playerAgency||{};
    this.state=saved.choices?{...saved}:this.empty();
    this.bind();
    this.sync();
  }

  empty(){
    return{choices:[],streaks:{},preferences:{},lastChoice:null,updatedAt:0};
  }

  bind(){
    this.game.events.on('gameplay:chain-created',e=>this.offer(e));
    this.game.events.on('gameplay:chain-resolved',e=>this.learn(e));
  }

  offer(chain){
    const choice=this.currentChoice(chain);
    if(!choice)return;
    this.game.events.emit('player:choice-available',{
      chainId:chain.id,
      type:chain.type,
      district:chain.district,
      options:[...choice.options],
      stage:chain.stage
    });
  }

  currentChoice(chain){
    return chain?.stages?.find(s=>s.kind==='choice'&&s.status==='open')||
      chain?.stages?.find(s=>s.kind==='choice');
  }

  choose(chainId,option){
    const eg=this.game.emergentGameplay;
    const chain=eg?.state?.chains?.[chainId];
    if(!chain||chain.status!=='available')return false;
    const stage=this.currentChoice(chain);
    if(!stage||!stage.options?.includes(option))return false;

    const impact=IMPACTS[option]||{rep:0,xp:3};
    const p=this.game.state.get().player;
    const moneyDelta=impact.money===undefined?0:Math.round((impact.money-1)*(chain.context?.reward||0));
    const nextPlayer={
      ...p,
      money:Math.max(0,Number(p.money||0)+moneyDelta),
      reputation:Number(p.reputation||0)+impact.rep,
      xp:Number(p.xp||0)+impact.xp
    };
    this.game.state.update({player:nextPlayer});

    chain.context={...chain.context,playerChoice:option,choiceAt:Date.now()};
    chain.choice=option;
    chain.stage=Math.min(chain.stages.length-1,chain.stage+1);
    chain.stages.forEach((s,i)=>{
      if(i<=chain.stage)s.status='open';
    });

    this.state.choices.unshift({
      chainId,option,type:chain.type,district:chain.district,at:Date.now()
    });
    this.state.choices=this.state.choices.slice(0,64);
    this.state.lastChoice={chainId,option};
    this.state.streaks[option]=(this.state.streaks[option]||0)+1;
    this.state.preferences[chain.type]=this.state.preferences[chain.type]||{};
    this.state.preferences[chain.type][option]=(this.state.preferences[chain.type][option]||0)+1;

    this.applyWorldImpact(chain,option,impact);
    this.game.events.emit('player:choice-made',{
      chainId,option,type:chain.type,district:chain.district,impact
    });

    if(chain.stage>=chain.stages.length-1){
      this.game.emergentGameplay.resolve(chain,'player-choice', {option,impact});
    }else{
      this.game.events.emit('player:choice-progressed',{
        chainId,option,nextStage:chain.stage
      });
    }
    this.sync();
    return true;
  }

  applyWorldImpact(chain,option,impact){
    const d=chain.district;
    if(impact.rep)this.game.events.emit('world:consequence',{
      district:d,
      rep:impact.rep,
      reward:Math.max(0,impact.money||0),
      source:'player-agency',
      choice:option
    });

    if(chain.type==='logistics'&&option==='reroute'){
      const routes=this.game.cargoSupplyChain?.state?.routes||{};
      for(const r of Object.values(routes)){
        if(r.from===d||r.to===d)r.pressure=CLAMP(r.pressure-.08,0,1);
      }
    }

    if(chain.type==='faction'&&(option==='help-a'||option==='help-b')){
      const faction=option==='help-a'?chain.context?.factionA:chain.context?.factionB;
      if(faction)this.game.playerFactionAlignment?.change(faction,8,'player-choice');
    }

    if(chain.type==='social'){
      this.game.events.emit('social:opportunity',{
        district:d,
        choice:option,
        trust:option==='avoid'?0:5
      });
    }

    if(chain.type==='safety'&&option==='report'){
      this.game.events.emit('police:alert',{level:1,district:d,source:'player-choice'});
    }
  }

  learn(e){
    const choice=e.chain?.context?.playerChoice||e.data?.option;
    if(!choice)return;
    this.state.lastChoice={chainId:e.id,option:choice};
    this.state.preferences[e.type]=this.state.preferences[e.type]||{};
    this.state.preferences[e.type][choice]=(this.state.preferences[e.type][choice]||0)+1;
  }

  update(dt){
    this.tick+=dt;
    if(this.tick<.5)return;
    this.tick=0;
    this.state.updatedAt=Date.now();
    this.sync();
  }

  sync(){
    this.game.state.update({playerAgency:this.state});
  }
}
